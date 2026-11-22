<div class="pagebreak"></div>

# PART 4. THE TECHNOLOGY

## 18. The big picture

```
  Phone or computer            Python service              Database
  (React web app)    ----->    (FastAPI)       ----->      (Postgres on Supabase)
  Urdu + English               decides, explains,          row locks, unchangeable
  works offline                protects, serves API        diary, rules, consent
         ^                           |
         |                           +--> mock NADRA, NSER, Raast
         +--- audio files stored in the app
```

**The golden rule of our design: the web app talks only to our service, never straight to the database.** All important logic and all secrets stay in one place. The service talks to the database **as the logged-in person**, so the database applies that person's row locks.

### 18.1 One request, step by step

1. The web app sends a request, for example "give me my cases", with a **login token**.
2. The service **checks the token** and works out who you are.
3. The service **opens a database transaction as you**: `SET LOCAL ROLE authenticated` and sets your user id for that transaction.
4. The database **applies the row locks**. It returns only the rows you may see.
5. The service shapes the answer and sends it back. Important actions also write a **diary** line.

This means a bug in our code **cannot** show you someone else's data, because the database refuses.

### 18.2 The three main parts

| Part | Folder | In one line |
|---|---|---|
| Web app | `web/` | What people see and touch |
| Service | `service/` | The brain: decisions, rules, AI checks, API, mock services |
| Database | `db/` | Tables, locks, triggers, seed data |
| Shared | `shared/` | The reason codes in English and Urdu |
| Scripts | `scripts/` | Local database, start-up, audio maker |

## 19. The front end (what people see)

### 19.1 The tools and why

| Tool | What it is | Why we chose it |
|---|---|---|
| **React 18** | A library that builds screens from small reusable pieces | Very common, fast, a huge community, and good for apps with many screens |
| **TypeScript** | JavaScript with types (labels on data) | Catches many mistakes before the app runs |
| **Vite** | The build and dev tool | Starts in under a second and builds small bundles |
| **Tailwind CSS** | Styling with small ready-made classes | Fast, consistent design; supports right-to-left Urdu |
| **PWA (installable web app)** | A website that behaves like an app | Works offline, installs from the browser, no app store |
| **IndexedDB (idb)** | A database inside the browser | Stores the offline outbox safely |
| **Service worker** | A small background program in the browser | Keeps the app and audio working with no signal |
| **Inter font** (English) and **Noto Naskh Arabic** (Urdu) | Typefaces | Clean and readable. Naskh is an easy Urdu style on small screens |
| **Vitest** | Test runner | 27 web tests |
| **Playwright (with Chrome)** | A robot that uses the real browser | `web/scripts/e2e_full.mjs`: 23 click-through checks of all three roles, the ask-for-proof loop, offline, Urdu and the practice demo |

### 19.2 How the web app is organised

- **Pages:** `Login`, citizen (`Claim`, `Consents`, `Scam`, `Resume`), citizen-helper (`Families`), admin (`Queue`, `CaseView`), admin (`Rules`, `RuleEditor`, `Policy`, `Twin`, `Evaluation`, `Audit`).
- **A small hand-written router** keeps the address in the form `#/queue`.
- **The API layer** (`web/src/api`) is the only code that talks to the service. It has two modes: **live** (real service) and **mock** (everything inside the browser, for design work and tests).
- **Auth** keeps the token in the browser tab's **session storage**, so each tab has its own login (a citizen and an admin can sit side by side) and asks the service who you are.
- **Offline** code keeps the outbox and the "online or offline" badge.
- **Staff translation:** staff screens have a dictionary that swaps English text for Urdu when Urdu is chosen.
- **Updates:** screens refresh by **polling every 10 seconds**. We did not need heavy live connections.

### 19.3 Offline outbox in detail

1. A write action (save a step, upload a photo, send the claim) is put in an **outbox** with a **unique idempotency key**.
2. If online, it is sent at once. If not, it stays in the outbox.
3. When the signal returns, the outbox sends items in order.
4. The service remembers each key. If an item arrives twice, it is **applied only once**.

### 19.4 Voice

- **154 recordings** (77 Urdu, 77 English), made once with the free Microsoft Edge neural voices (`ur-PK-UzmaNeural`, `en-US-JennyNeural`) by `scripts/make_audio.py`.
- They are **files inside the app**, so they play offline.
- The audio list comes from the app's own manifest, so file names always match what the screens ask for.
- If a file is missing, the app falls back to the browser's speech or to text.

### 19.5 Design

Colours: deep teal for trust, a warm gold accent, a cream background. Rounded cards with soft shadows, a gradient progress bar, a split-screen login. Citizen screens use big text and one action per screen.

### 19.6 The practice demo (how it is built)

`web/src/components/Tutorial.tsx` is one component shown by the common step frame for citizens on steps 2 to 7. A timeline of frames (digit typed, hand on a key, button pressed) drives a **mock** number pad and mock buttons drawn inside the overlay. It reads no real input and calls no API, so it cannot change a claim. The voice is the recorded file `demo_<step>` in the chosen language. "Seen" flags live in the browser's local storage per user and page; the restart icon clears them. While it is open, the page's own voice is held back.

### 19.7 The ask-for-proof loop (how it is built)

- `POST /cases/{id}/officer-decision` accepts `doc_type` (`cnic_front`, `cnic_back`, `cnic_both`, `other`) for "ask_more". The saved decision carries the message (`explain_citizen`: English, Urdu, an `officer` marker, and `std` when it is one of the four standard sentences) and `next_step` = upload of that paper.
- The citizen claim page polls every 10 seconds, shows the box and opens `#/claim/<id>/5?doc=<paper>&redo=1`. In that mode the old photo is forgotten, no Next button is shown, and when the photo is accepted the page submits with a **new** idempotency key (the old key would only replay the first answer).
- The claim page saves a copy of the open claim on the phone, so the screen opens offline; the photo goes into the outbox.

## 20. The back end (the brain)

### 20.1 The tools and why

| Tool | What it is | Why we chose it |
|---|---|---|
| **Python 3** | The programming language | The language of machine learning, so AI and API live together |
| **FastAPI** | A web framework | Fast; checks every input; writes the Swagger documentation for free |
| **Uvicorn** | The web server that runs FastAPI | Standard and light |
| **psycopg 3** | The Postgres driver | Direct connection so we can set the user's identity in each transaction |
| **scikit-learn** | A machine learning library | Small, explainable models |
| **numpy, scipy** | Number crunching | Needed by scikit-learn and image maths |
| **rapidfuzz** | Text similarity | Fast name matching |
| **Pillow** | Image library | Reads photos for the document checks |
| **bcrypt (in the database)** | Password and PIN scrambling | PINs are never stored in plain text |
| **OpenCV (opencv-python)** | Computer vision library | Runs the YuNet face finder and SFace face matcher; also image maths |
| **RapidOCR + onnxruntime** | Text reader running small ONNX models on the CPU | Reads the ID card without internet or a graphics card |
| **joblib** | Saves a trained model to a file | The decision model is one small file (`service/models/prob_model.joblib`) |
| **edge-tts** (build time only) | Microsoft's free neural voices | Makes the recorded voice prompts once; not used while the app runs |
| **pytest** | Test runner | 179 service tests |

### 20.2 Folders inside `service/app`

| Folder or file | What it holds |
|---|---|
| `main.py`, `config.py` | Start-up and settings |
| `routers/` | The API calls, grouped: `auth`, `cases`, `people`, `rules`, `admin`, `tools` |
| `engine/` | The decision engine: `decide`, `facts`, `jsonlogic`, `model`, `policy`, `reasons`, `synth`, `costcurve`, `twin`, `llm` |
| `identity/` | Name normaliser and matcher |
| `scam/` | Scam detector and its invented training messages |
| `docs/` | Document checks, **ID card reader (`ocr.py`), face matcher (`face.py`)** and sample images |
| `eval/` | The evaluation script |
| `db.py` | Database access (connection reuse, per-user transactions) |
| `service_writes.py` | The **only** file that uses the database master key |
| `security.py`, `ratelimit.py`, `errors.py`, `deps.py` | Login tokens, rate limits, error format, role checks |
| `pipeline.py` | The claim pipeline: gather facts, decide, save, write the diary |
| `policy_search.py` | Policy search |

### 20.3 Two login modes

| Mode | How it works | Status |
|---|---|---|
| **local** (default) | Our own `local_users` table and a signed token (HS256 JWT). The database function `app.local_login` checks the PIN or password (bcrypt). 5 wrong tries lock the account for 30 seconds. | **Built and tested. This is what runs.** |
| **supabase** | Sign in through Supabase Auth | Written, **not tested** |

### 20.4 API style

- All answers are JSON. Errors have one shape with a code, a message in English and Urdu, details and a request id.
- Wrong email or wrong PIN gives the **same** answer, so nobody can find out which emails exist.
- Input is checked by strict models: unknown fields are refused.
- **Idempotency:** a write can carry an `Idempotency-Key` header. A repeat with the same key returns the first answer.
- **Swagger** is at `/docs` and the raw OpenAPI file at `/openapi.json`.

### 20.5 The public API (for other organisations)

Three calls under `/public/v1/` need an **`X-API-Key`** header:

| Call | What it does |
|---|---|
| `POST /public/v1/scam/check` | Checks a message for scams |
| `POST /public/v1/eligibility/precheck` | A rough "are you likely eligible" check |
| `GET /public/v1/cases/{id}/status` | The status of a case |

**Keys** are stored only as hashes. An admin can create, list and **revoke** them. A revoked key stops working immediately. Each key has its own per-minute limit and scopes. A missing or wrong key gets 401.

### 20.6 The mock government services

| Mock | Pretends to be | What it holds or returns |
|---|---|---|
| `mock.nadra` (and `GET /mock/nadra/{cnic}`) | NADRA, the national ID database | A complete, realistic record for every person: name (English and Urdu), **father's name (D/O, daughter of; there is no husband field)**, a full date of birth, gender, district, expiry, status, mobile number. A **photo** is held only for the demo person (Zainab). |
| `mock.nser` (`GET /mock/nser/{household_id}`) | NSER, the national poverty survey | The household record: **number of family members**, score, flags, survey date, district |
| `mock.raast_accounts`, `POST /mock/raast/verify` | Raast, instant payments | **The registry starts empty: no account number and no payment exists for anybody, and no person or claim in the seed holds an account.** `verify` only checks the shape of a typed mobile number (11 digits starting 03) and whether another household already uses it; it returns **no name**. The account is written to the registry **only after a claim is approved** (by the system or by a staff member), and the payment is recorded as **settled**, so the database shows she has been **paid**. |
| `POST /mock/raast/release` and `/settle` | Raast | Pretend payment release and settlement. After **any** approval, automatic or by staff, the service releases and settles at once (`AUTO_SETTLE`, on by default), so the claim ends as **Paid**. |

Two calls support the claim screens: `POST /cases/{id}/identity-lookup` (ID number to record; full details only for the signed-in person's own number, **name only** for any other number that exists, nothing for a number not in the records) and `POST /demo/restart-claim` (the demo restart, Section 5.4), `POST /cases/{id}/household-check` (she types her household size; the answer is only yes or no) and `POST /helper/verify-family` (the helper's three-detail proof).

Each mock checks the person's **consent** before answering. They are **simulated**. Nothing leaves the system.

### 20.7 Security features in the service

- **Rate limits:** login 40 per minute per computer and 8 per minute per email; uploads 20 per minute; scam check 30 per minute; Helper PIN consent 8 per minute.
- **Strict input checks** and a **size limit on uploads**.
- **Master key isolation:** only `service_writes.py` can use it.
- **No secrets in logs.**
- **Request ids** in every error and log line.
- **CORS** limited to the web app's address.
- **Tests:** 65 API security tests, including revoked keys, forbidden roles and bad input.

## 21. The database

### 21.1 What we use

**Postgres** (a very reliable SQL database), hosted by **Supabase** in the **Mumbai** region. We use Supabase as a **hosted Postgres**. Our own service handles login and logic.

### 21.2 Why Postgres (SQL) and not MongoDB or Firebase

| Need | Postgres | MongoDB / Firebase |
|---|---|---|
| Data full of links (people, households, cases, consents, decisions) | Built for links (joins and foreign keys) | Weaker for links; duplication is common |
| "Each role sees only its rows" | **Row-level security is built in** | Rules are shallow or written in application code |
| An unchangeable diary | **Triggers** can refuse changes and compute hashes | Not available in the same way |
| Money and exact counts | Transactions with full guarantees | Weaker multi-record guarantees |
| Migrations (a brief requirement) | Plain numbered SQL files | Not applicable |
| Free hosting | Supabase free plan | Yes, but we would lose the row locks |

### 21.3 Why Supabase

A managed Postgres with a free plan, backups and a good web dashboard, with no server for us to look after. **Region matters:** we first created the project in Seoul and each page took **20 to 60 seconds** from Karachi. After moving to Mumbai, pages take about **1.3 seconds**.

### 21.4 The six migrations

| File | What it creates |
|---|---|
| `0001_core.sql` | All tables and basic rules |
| `0002_rls.sql` | The row-lock policies |
| `0003_audit.sql` | The hash-chained diary and its protection |
| `0004_rules_consent.sql` | Rule versions, consent, helper sessions |
| `0005_case_safety.sql` | Separation of duties, two-person approval, hard flags |
| `0006_function_grants.sql` | Which database roles may call which functions |

Plus: a local shim for plain Postgres, the local-login file, and the seed data files.

### 21.5 Row-level security ("row locks")

Row-level security (RLS) means each table has **policies**, small rules saying which rows each user may read or change. If no policy allows it, the database refuses. All 27 tables have RLS switched on. Appendix A lists all **72 policies**.

Two examples in plain words:

- *Citizens read their own claims:* `owner_user_id = me`.
- *Admins read claims only for their own office and only with active consent:* `app.officer_sees_case(owner_user_id, office, status)`.

### 21.6 The hash-chained diary (challenge 5)

The table `audit_log` is the **diary**.

**How the chain works.** Each new row stores:

- `hash` = a SHA-256 fingerprint of **this row's content plus the previous row's hash**,
- `prev_hash` = the previous row's hash.

Because every row depends on the one before, **changing any old row changes its fingerprint, and then every later fingerprint stops matching.** `app.verify_audit_chain()` recomputes the whole chain and returns the first broken row (or nothing if intact).

**How it is protected.**

- A trigger **refuses** UPDATE, DELETE and TRUNCATE on `audit_log`.
- A lock (an advisory lock) makes sure two rows are never added at the same moment, which would break the chain.
- Only the database itself writes rows (through a protected function), not normal users.
- The "Verify the diary" button runs the check for the admin.

**Honest limit.** Someone with **full database owner power** could in theory rewrite the whole chain from the start. We say so. A real system would also publish the latest hash somewhere outside the database (for example, to a printed report or another system).

### 21.7 Other database features

- **Decisions are never updated.** A new decision is a new row with the full inputs, checks and trace.
- **Rule sets are immutable** and only one is active.
- **Consent** has events and a receipt hash.
- **Helper sessions:** one active family per helper (a unique index).
- **Drafts** carry a resume code and an idempotency key.
- **Masked views:** `people_masked` hides ID numbers for the admin.
- **Seed data (all invented):** 189 people, 179 households, 151 cases, 120 labelled past cases, 393 consents, 40 scam reports, 2 API keys, and 184 logins.

### 21.8 The local fallback database

For a laptop with **no internet**, the project can run a **local Postgres** (PGlite, a Postgres built to run in a program). The same migrations and the same seed data load into it. One script (`scripts/dev.ps1`) starts everything.

## 22. Running, hosting and the demo

### 22.1 Run everything on one laptop

```
.\scripts\dev.ps1
```

This starts the local database, loads migrations and seed, starts the service on port 8000 and the web app on port 5173. `.\scripts\dev.ps1 -Stop` stops them.

### 22.2 Run against Supabase

Put the Session pooler connection string in `.env` as `DATABASE_URL` and set `DB_SERIALIZE=0`. Run the migrations, then the local-login file and the seed. Start the service with `python -m uvicorn app.main:app --port 8000` from the `service` folder. (The `.env` file is never committed.)

### 22.3 The deployment plan

| Piece | Plan |
|---|---|
| **Hosting** | One Docker image holding the Python service **and** the built web app, deployed on **Render's free plan** (Singapore, near the Mumbai database) at https://sahara-relief.onrender.com |
| **Database** | Supabase Mumbai |
| **Why not Vercel** | Vercel suits websites and short functions. Our service is a long-running Python program that loads AI models, so it would restart cold and hit size limits |
| **Fallback** | The whole system on a laptop, with the local database, tested on a phone hotspot |
| **Status** | **Live.** The first cloud build worked. Settings: `DATABASE_URL`, `JWT_SECRET`, `AUTH_MODE=local`, `DB_SERIALIZE=0`. Measured: about 350 MB of memory in normal use with spikes near 520 MB against the free 512 MB limit; twelve card uploads in a row plus a full submit ran with no restart; about 2.6 to 3 s per photo and about 13 s for a cold submit on the tenth of a CPU. The instance sleeps after about 15 minutes idle and takes about a minute to wake; uploaded photos live on its disk and reset when it restarts; the app's request limit is 75 seconds so a waking server is not mistaken for no signal |

### 22.4 Demo checklist

Sample cards are made by `python scripts/make_sample_cards.py` into `Desktop\sahara-sample-docs`: **A1 and A2** are Zainab's correct ID card front and back; **B1 to B5** are wrong fronts (wrong name, wrong number, wrong face, name and number, everything).

1. Start with a fresh demo database (`python scripts/reset_supabase.py`). **The admin's review queue starts empty**: the invented waiting claims in the seed are closed by `scripts/demo_clean_queue.py` (nothing is deleted; pass `--keep-queue` to keep them). A claim appears in the admin queue only after Zainab sends one the system cannot approve.
2. Log in as **Zainab Bibi** (Urdu first, then English). Type her ID number `4130190000112` at step 3 and show her record. At step 4 type her household size `4`. Upload **A1 and A2**, type a mobile account (for example `03009900044`), send: **approved, paid**.
3. Press the faint **restart icon**. Repeat with **B3** (wrong face) or any B card as the front: **sent to a human with the exact reason**. Type the same account number each time (a different one is held as "account changed").
4. Type another person's ID number (for example `1310190001618`) to show that only the name appears; type `9999999999999` for "invalid ID number".
5. Switch the network off to show the offline outbox, then on.
6. Log in as the **helper** (`yousuf@helpers.sahara.test`, on his own phone): her family shows as `Z*** B***`. Type what she tells him: ID number `4130190000112`, date of birth `1978-06-15`, household size `4`; then **Start helping** and do the claim with her.
7. Log in as an **admin**: open a held case, show the decision card and the **Card vs record** check, decide.
8. As **admin**: make a draft rule, run the **Digital Twin**, show the cost slider; open **Diary** and **Verify the diary**.
9. Show the **scam checker** with the two sample messages, and **Swagger** with the demo API key.
10. Say out loud: *prototype, made-up data, AI-generated faces, trained on synthetic cases*.

## 23. Security summary

| Threat | Our defence |
|---|---|
| A user reads someone else's data | Row-level security in the database |
| An admin keeps looking after consent is withdrawn | Consent is checked on every read |
| A helper claims on behalf of a woman or takes her money | Her three details are needed; helper-owned accounts go to a human; helper sessions are one at a time |
| An insider edits history | An append-only, hash-chained diary |
| Changing rules secretly | Immutable versions, one active, every change in the diary |
| Guessing logins | Same error for wrong email or PIN, lockout, rate limits |
| Stolen API key | Keys stored as hashes, revocable, rate limited |
| Dangerous rules | Rules are data in a safe language, not code |
| Fake or edited papers | Document checks and duplicate fingerprints |
| Scam messages | Scam detector with plain reasons |
| Over-trusting the AI | Hard rules first, high approval line, auto-reject off, a person decides every "no" |
