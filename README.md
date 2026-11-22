# Sahara Relief

**A public-service platform that helps a woman who cannot read, and the community helper beside her, claim a quarterly relief payment from start to finish: safely, in her own language, and even when the signal drops.**

Built for **Coder's Cup '26, "The Last Mile: AI on Public Rails"** (ACM NUCES, FAST-NUCES Karachi).

> **PROTOTYPE. Not an official service.** Every person, ID number, household, payment and message in this project is **synthetic** (invented). The AI was trained and tested on synthetic data, so the accuracy numbers show that the method works, not how it would perform on real people. Nothing is ever really paid.

**Live demo:** https://sahara-relief.onrender.com (free hosting: the first visit after about 15 minutes of nobody using it takes around a minute to wake up)

---

## Contents

1. [Why we built it](#1-why-we-built-it)
2. [What it does: citizen, helper, admin](#2-what-it-does)
3. [Try it](#3-try-it)
4. [Architecture](#4-architecture)
5. [Tech stack and why we chose it](#5-tech-stack-and-why-we-chose-it)
6. [The AI features](#6-the-ai-features)
7. [How a decision is made](#7-how-a-decision-is-made)
8. [Safety, privacy and trust](#8-safety-privacy-and-trust)
9. [Run it on your laptop](#9-run-it-on-your-laptop)
10. [Tests](#10-tests)
11. [Deploy it](#11-deploy-it)
12. [Repository layout](#12-repository-layout)
13. [What is real and what is simulated](#13-what-is-real-and-what-is-simulated)
14. [Limitations (honest list)](#14-limitations)
15. [How it would scale](#15-how-it-would-scale)
16. [More documentation](#16-more-documentation)

---

## 1. Why we built it

Pakistan's largest cash-transfer programme, BISP Kafaalat, pays millions of families every quarter. The women it is meant for are often the least able to use a form, a smartphone or a bank. We built **the last mile**: the step where a real woman has to claim the money.

| Fact | Why it matters to the design |
|---|---|
| About **44%** of rural women can read and write (rural men: 67%); among the poorest fifth of rural households only about **28%** | The citizen flow is spoken and picture-based, in Urdu and English |
| About **68%** of women own a mobile phone (men: 93%); **28%** of women online use a borrowed phone | A **helper** must be able to claim with her, safely |
| About **10 to 12 million** households, around **Rs 716 billion** a year; Rs 14,500 a quarter | Even a tiny error rate means many wrong payments, so the machine acts alone only when very sure |
| Agents deduct **Rs 1,000 to 2,000** from payments in some reports | Money goes to **her own account**, helper-owned accounts are held for a person |
| Cybercrime reports up about **35%** in 2025; fake "relief" SMS are a known problem | A scam checker and payout-account rules |
| About **140 million** people live under mobile broadband coverage but do not use mobile internet | The app works offline and saves every step |

Figures are official survey results as reported by news outlets and international bodies. Some are from different years or definitions, so **check the source before quoting one**. The full list with links is in the Instruction Manual (Part 1).

---

## 2. What it does

The platform **decides, explains and protects**. When the computer is not sure, it says **"I am not sure"** and hands the case to a person.

### Citizen (shown as "Person" in the app): the woman who claims

- Eight simple steps, one question per screen, big buttons, a number pad, and a **recorded voice on every page** (Urdu and English).
- A short **practice demo** before each page, like a game tutorial: a hand taps a mock pad with made-up details while a voice explains. Nothing in it is sent.
- Types her **ID number**; the system shows her own record and asks "Is this you?". Another person's number shows only that name.
- Answers her **household size** (never shown back; only yes or no; three wrong tries go to a person).
- Photographs her **ID card, front and back**. The system reads it, compares the name, number and **face** with the government record, and checks it is the right side.
- Types her **mobile account number** (shape checked only, nothing shown back).
- Gets one of three answers: **Approved** (paid at once, in the mock), **Please send one more thing**, or **A person will look** with the exact reason.
- Her claim page shows the news by itself: *our people are checking*, the staff's request with a **Send it now** button, or *your payment has been sent, our staff will call you to confirm*.
- **Works offline**: photos and the final send wait on the phone and go out when the signal returns. A 6-digit **resume code** continues on another phone.
- Gives and **takes back permission** at any time; staff access stops at once. Can see who looked at her data.

### Helper: a community worker who helps from his own phone

- Sees only the families assigned to him; names and ID numbers are hidden until she gives permission.
- Opens a family by asking her three things and typing the answers: **ID number, date of birth, household size**. The server checks them against the government record and answers only yes or no, so **he never sees the record**. Three wrong tries lock the family for 30 minutes.
- One family at a time. Cannot approve or reject anything. A payout account that matches a helper's own number is held for a person.

### Admin: programme staff

- A **review queue** of only the claims the system could not decide, least sure first, only for his own office and only with active consent.
- A **case page**: the decision with every check in plain words, "I am not sure" notes, a side-by-side table (her registration record, the government record, and **what her ID card photo says**, differences in red), and her papers.
- Decides: Approve, Reject, Hold, or **Ask for more proof** (chooses which paper and writes a message). Payments over Rs 20,000 need a second admin.
- **Rules** as versions (never edited in place), a **Digital Twin** that replays past cases under a draft rule before it goes live, a cost slider, an evaluation page with false alarms, and a **diary** with a "Verify" button.

---

## 3. Try it

Open the live demo or run it locally. The login page shows three one-tap demo accounts (all fake data):

| Role | Email | PIN / password |
|---|---|---|
| Citizen: Zainab Bibi, a widow | `zainab@citizens.sahara.test` | `246810` |
| Helper: Yousuf | `yousuf@helpers.sahara.test` | `246810` |
| Admin | `admin1@gov.sahara.test` | `Admin#2026` |

**A quick tour**
1. Run `python scripts/make_sample_cards.py` to create sample ID cards in `Desktop\sahara-sample-docs` (`A1` front and `A2` back are Zainab's correct card; `B1` to `B5` are wrong fronts: wrong name, wrong number, wrong face, and so on).
2. Log in as Zainab. ID number `4130190000112`, household size `4`, upload **A1** and **A2**, account `03009900044`: **approved and paid**.
3. Press the faint reset icon in the top bar. Repeat with **B1** as the front: **sent to a person** with the exact reason.
4. Log in as the admin: open the case, see the red differences, choose **Ask for more proof**, then watch Zainab's page show the request.

> Use **one demo account per set of sample cards.** If the same card photo is sent by two different people, the system correctly flags it as reused and an admin cannot approve it.

---

## 4. Architecture

```
  Phone or computer             Python service                  Database
  (React web app)    ------->   (FastAPI)           ------->    (Postgres on Supabase)
  Urdu + English                decides, explains,              row locks, unchangeable
  works offline                 protects, serves the API        diary, rules, consent
         ^                            |
         |                            +--> mock identity (NADRA), household survey (NSER), payments (Raast)
         +--- recorded voice files stored in the app
```

**The one rule of the design:** the web app talks **only to our service**, never straight to the database. The service then talks to the database **as the signed-in person**, so the database itself applies that person's row locks. A bug in our code cannot leak someone else's data, because the database refuses.

**One request:** the app sends a request with a login token → the service checks the token → opens a database transaction as that user → the database returns only the rows that user may see → the service shapes the answer and writes a diary line for important actions.

---

## 5. Tech stack and why we chose it

Four reasons drove almost every choice: **it must work offline, it must be explainable, it must be private, and it must be free to run.**

### Front end (`web/`)

| Tool | Why |
|---|---|
| **React 18 + TypeScript** | Reusable screens, large community; TypeScript catches many mistakes before the app runs |
| **Vite** | Very fast builds and small bundles |
| **Tailwind CSS** | Consistent design, and logical spacing that supports right-to-left Urdu |
| **Installable web app (PWA) + service worker** | Opens from the browser like an app with no app store, and keeps working with no signal |
| **IndexedDB (`idb`)** | Stores the offline outbox and a copy of her claim on the phone |
| **Our own small i18n (`t()` + two JSON dictionaries)** | Only two languages and short phrases, so a heavy library was not needed |
| **Noto Naskh Arabic + Inter fonts** (bundled with `@fontsource`) | A readable Urdu style on small screens; bundled so they work offline |
| **Recorded voice (edge-tts, recorded once)** | 154 Urdu and English prompts stored in the app, so voice works with **no internet** |

### Back end (`service/`)

| Tool | Why |
|---|---|
| **Python + FastAPI + Uvicorn** | Python is the language of machine learning, so the AI and the API live together. FastAPI validates every input and writes the Swagger documentation |
| **psycopg 3** | A direct database connection, so each request runs **as the signed-in person** and the database applies that person's row locks |
| **scikit-learn, numpy, scipy, joblib** | Small, explainable models that train in seconds on a laptop CPU |
| **RapidOCR + onnxruntime** | Reads the ID card on the CPU, with no internet and no graphics card |
| **OpenCV (YuNet and SFace models)** | Finds and compares the face on the card with the face in the government record |
| **rapidfuzz** | Fast name comparison for spelling variants (Muhammad, Mohammad, Muhammed) |
| **Pillow** | Reads photos for the blur, edit and duplicate checks |

### Database (`db/`)

| Choice | Why |
|---|---|
| **Postgres (SQL)** | Money and identity need exact rules between tables. SQL gives strict constraints and **row-level security**. A document store such as MongoDB or Firebase cannot enforce "this person sees only her own rows" as strongly |
| **Supabase (hosted Postgres)** | Managed Postgres close to Pakistan (Mumbai region). A plain local Postgres is the fallback for the demo |
| **Row locks (row-level security)** | The database, not the screen, decides who may see which row |
| **Hash-chained, append-only diary** | Every important action is written once and linked to the one before. Nobody can edit or delete it, and a **Verify the diary** button recomputes the chain |
| **Versioned rules, immutable decisions** | A rule change is a new version; old decisions keep theirs |
| **6 migrations + seed data** | The database can be rebuilt from scratch, in order |

### Quality and hosting

| Tool | Why |
|---|---|
| **pytest, Node test runner, Vitest, Playwright (real Chrome)** | Service, database, web and full click-through tests |
| **Docker (one image)** | The Python service and the built web app run together on one link |
| **Render (free plan, Singapore)** | Free, no card, and close to the Mumbai database. We measured memory first (see [Deploy it](#11-deploy-it)) |

### Why our own small models and not a chat AI

No real data may leave the system. A small **calibrated** model gives a confidence we can trust (the "I am not sure" path needs one), explains itself, runs in milliseconds on a CPU, and costs nothing. A chat model sounds sure even when it is wrong. **No hosted AI service and no large language model is used.**

---

## 6. The AI features

| Feature | What it does | How it works | Trained by us? | Result (synthetic data) |
|---|---|---|---|---|
| **Decision model** | One honest number: how likely the claim is truly eligible | Logistic regression + isotonic calibration on 21 features | **Yes**: 12,000 synthetic cases, fixed seed | 38% approved alone; 14 wrong approvals out of 758; 0 wrong rejections; about 6.6 ms |
| **Scam message checker** | Safe / be careful / scam, with reasons (English, Roman Urdu, Urdu) | Character n-gram TF-IDF + 9 rule signals + logistic regression | **Yes**: about 480 messages we wrote | 92.9% on 56 test messages; 1 false alarm in 27 safe; 1 missed scam |
| **Name and duplicate matching** | SAME / MAYBE / DIFFERENT for two records | Name normaliser + rapidfuzz with fixed weights; never SAME on a name alone | No (classic algorithm) | 0 false merges on 10 labelled pairs |
| **ID card reading + side check** | Reads name, number, date of birth; tells front from back | RapidOCR on a fixed card layout | No (open-source pretrained) | Caught every planted wrong name and number |
| **Face match** | Compares the card face with the government photo | YuNet + SFace; "same" at cosine ≥ 0.50 (our threshold) | No (pretrained) | Caught every planted wrong face |
| **Photo integrity** | Blur, edit signs, the same photo sent twice | Sharpness score, error-level analysis, file and picture fingerprints | No | 21 of 21 invented images as expected |
| **"I am not sure" notes** | A one-page brief for the admin | Rules and templates over the decision trace, plus the 3 past cases with the closest household score | No (**not** a learned model) | Created for every claim sent to a person |
| **Policy answers with sources** | Answers a policy question with the clause as source | TF-IDF search over short clauses | No | Never invents an answer |
| **Digital Twin + cost curve** | Shows what a rule change would do before it goes live | Replays up to 500 past cases under a draft rule | No (simulation) | Example: a draft moved 56 cases |
| **Recorded voice** | Speaks every prompt and reason | Microsoft neural voices (edge-tts), recorded once | No (pretrained) | 154 files; works offline |

**Two models are trained by us; three open-source pretrained tools are used as they come.** Details, training settings and honest reading of the results are in the Instruction Manual (Part 5).

---

## 7. How a decision is made

1. **Hard rules first**: no consent, invalid or expired ID, deceased, edited papers, a reused photo, a helper-owned account, a card that does not match the record. A score can never override them.
2. **Checks**: identity, household score against the cutoff, documents, card vs record (name, number, face), payout account, scam flag. Each gives Pass, Not sure or Fail.
3. **The decision model** weighs the soft signals into one calibrated probability.
4. **Three outcomes**: **approve alone** (only above **97%** sure and no flag), **ask for one more paper** (one clear thing is missing), or **send to a person** with notes. **Auto-reject is off**: the machine never says "no" alone.

The costs behind the 97% line (wrong approval 100, wrong rejection 20, person reviewing 3, asking for proof 1) are editable by an admin, and the Policy screen shows where the line is cheapest.

---

## 8. Safety, privacy and trust

- **Consent** is recorded with a receipt and can be taken back at any time; access stops at once and is checked on every read.
- **Row locks in the database** decide who sees which row. Separation of duties: nobody approves his own case or one he helped with.
- **An unchangeable diary**: decisions are never edited (a change of mind is a new row), and the diary is hash-chained and verifiable.
- **Safe retries**: every write carries a one-time key, so a retry (for example after the signal returns) cannot create a duplicate.
- **Login**: a signed token (JWT) with a 1-hour life, the same error for a wrong email or PIN, a 30-second lock after 5 wrong tries, and rate limits.
- **Public API** keys are stored only as hashes and can be revoked at once.
- Rules are **data in a safe language**, not code, so an admin cannot run code through a rule.

---

## 9. Run it on your laptop

**You need:** Python 3.14 (what we tested on), Node 20+, Windows PowerShell.

```powershell
python -m venv .venv
.venv\Scripts\pip install -r service\requirements.txt
cd web ; npm install ; cd ..
cd scripts ; npm install ; cd ..
.\scripts\dev.ps1            # local database + service (port 8000) + web app (port 5173)
```

Open http://localhost:5173. The Swagger documentation is at http://localhost:8000/docs. `.\scripts\dev.ps1 -Stop` stops everything.

**Settings:** copy `.env.example` to `.env`. Important values: `DATABASE_URL`, `JWT_SECRET` (use a long random string, **never** the placeholder), `AUTH_MODE=local`.

**Using Supabase (hosted Postgres) instead of the local database:** put the Session pooler string in `DATABASE_URL` and set `DB_SERIALIZE=0`, then `python db/apply_migrations.py`, then run `db/local/01_local_auth.sql` and `db/seed/seed.sql` (see `db/README.md`). Pick a region close to the service: from Karachi, Seoul took 20 to 60 seconds per page and Mumbai about 1.3 seconds.

**Sample ID cards:** `python scripts/make_sample_cards.py` (see `docs/CARD_FORMAT.md`).

**Voice files:** the 154 recordings are already in `web/public/audio/`. To make them again: `pip install edge-tts` then `python scripts/make_audio.py` (needs internet once).

---

## 10. Tests

```powershell
node --test "db/tests/*.test.mjs"        # database: access rules, diary, rule versions, migrations (50 tests)
cd service ; python -m pytest tests -q    # service: API security, real-database flows, engine, identity, scam, card/face (179 tests)
cd web ; npm test                         # web: api, mock, outbox, result card, roles (27 tests)
cd web ; node scripts/e2e_full.mjs        # real Chrome click-through of all three roles, offline, Urdu, the practice demo
```

`e2e_full.mjs` needs the stack running and the sample cards on the Desktop. Set `ONLY="tutorial"` (any part of a check's name) to run part of it.

---

## 11. Deploy it

The `Dockerfile` builds **one image** that holds the Python service and the built web app, so everything is on one link. It works on hosts that set `$PORT` (Render, Railway).

**What we did (free):** Render, Docker runtime, **Singapore** region (near the Mumbai database), **Free** instance. Settings (Environment tab):

| Variable | Value |
|---|---|
| `DATABASE_URL` | your Postgres connection string (the Supabase Session pooler string) |
| `JWT_SECRET` | a long random string (Render's "Generate" button works) |
| `AUTH_MODE` | `local` |
| `DB_SERIALIZE` | `0` |

**Memory (the real constraint).** The ID card reading and face matching are the heavy part. We measured about **350 MB in normal use, with brief spikes to about 520 MB**, against the free plan's 512 MB limit. On the live free instance, twelve card uploads in a row plus a full submit ran with no restart. Photo checks take about 2.6 to 3 seconds each on the free plan's tenth of a CPU, and a full submit about 13 seconds on a cold start. For comfortable headroom use a plan with 1 GB or more.

**Free-hosting behaviour to know:** the free instance sleeps after about 15 minutes of no visitors and takes around a minute to wake. Uploaded photos live on the container's disk, which resets on restart (the database records stay). The app's request limit is 75 seconds so a waking server is not mistaken for "no signal".

---

## 12. Repository layout

```
web/        React + TypeScript installable web app (src/pages, src/components, src/offline, src/i18n, public/audio)
service/    FastAPI service: routers, engine (rules, model, decision), identity, scam, docs (OCR, face), mock services, tests
db/         Postgres migrations (0001 to 0006), seed data, database tests
shared/     Reason codes with English and Urdu text
scripts/    dev.ps1, sample cards, audio maker, Supabase reset, demo-queue cleaner
docs/       Instruction Manual and Complete Guide (PDF), card format notes
video/      Narration script and tooling for the demo video
CONTRACT.md The agreement between the three parts
Dockerfile  One image for the service and the web app
```

---

## 13. What is real and what is simulated

| Real (built and running) | Simulated (mock) |
|---|---|
| Login, role checks and database row locks | NADRA identity (with photos), NSER household survey and Raast payment services |
| The hash-chained diary and its check | All people, ID numbers, households and cases |
| Consent give and take-back that really stops access | The relief programme and its rules ("Sahara Relief Programme") |
| Rule versions, the Digital Twin, the cost maths | The scam messages and test cases used to train and test |
| The decision engine, name matching, scam and document checks | The official SMS sender code (we use `9171`) |
| Offline saving, resume codes, Urdu and English recorded voice | Money: nothing is ever really paid |

---

## 14. Limitations

Listed in the order that matters most:

1. **The helper-commission problem is only reduced, not solved.** Reports say some agents and helpers take a cut from the woman's payment. Software cannot stop a person asking for cash after the money has reached her account. What we did: money goes to **her own** account typed by her; a payout account matching any helper's own number is held for a person; a helper needs her three details, holds one family at a time, and cannot approve anything; everything is in the diary. What we did not do: we cannot see who owns an account (only its shape is checked), and the three details are not secret. **Planned, not built:** an automatic phone call after every payout asking the woman if she received the full amount.
2. **All data is synthetic**, and we wrote the data generator, so the accuracy numbers measure how well the models learned **our own rules**.
3. **The ID card reader and face matcher are tested on clean sample cards.** The reader works on one fixed English card layout. The face line (0.50) was set on a handful of AI-generated faces and needs a fairness test on real people.
4. **Small test sets**: scam checker 56 messages, name matching 10 pairs, photo checks 21 images. Edit detection is a simple heuristic a skilled forger would pass.
5. **The three government services and the payment are mocks.** The mock pays instantly; a real rail confirms later and can fail.
6. **Language and voice**: no voice input; the Urdu text and computer voices need a native speaker's review; only Urdu and English exist.
7. **Weak internet was tested by simulation** (a cut connection in Chrome), not on a real phone. The badge says only online or offline.
8. **Hosting**: the free host has a tenth of a CPU, sleeps when idle, and resets uploaded photos on restart. The hosted-login mode (Supabase Auth) is written but untested; rate limiting is in the service's memory.
9. **The record itself**: someone with full database-owner power could rewrite the diary. Helper proof by ID number, birth date and household size is not a secret; a one-time SMS code would be stronger.

---

## 15. How it would scale

The decision itself is tiny (about 6.6 ms); the cost is photo analysis, the database and the review queue.

- **Pilot (one district):** replace the three mocks with real services (one adapter each), test the card reader on real photos, fairness-test the face model, native Urdu review, add regional languages, build the payout-confirmation call.
- **Province:** several copies of the stateless service behind a load balancer, rate limits in a shared store, photo analysis in background workers with photos in object storage, a database connection pooler and read replicas, tables split by quarter, USSD or SMS and voice input for keypad phones.
- **National:** auto-scaling workers for the quarter-start peak, a content network for the app and voice files, the diary hash published outside the database, monitoring of accuracy, false alarms and fairness, retraining from approved human decisions, and the same rails reused for other benefit programmes.

We have **not** load-tested the service, so we claim no claims-per-second number. The first scaling step is to measure photo analysis under load.

---

## 16. More documentation

- `docs/Sahara_Relief_Instruction_Manual.pdf`: the full manual (users, rules, technology, AI and how it was trained, tests, limits).
- `docs/Sahara_Relief_Complete_Guide.pdf`: a short designed guide (why, tech stack, roles, AI, limits, scaling).
- `docs/CARD_FORMAT.md`: the sample ID card layout the reader expects.
- `service/README.md`, `web/README.md`, `db/README.md`: each part in detail. Swagger at `/docs` on a running service.
- `CONTRACT.md`: the agreement between the web app, the service and the database.

**Status:** a hackathon prototype. No licence has been chosen yet, so the code is shared for review and demonstration; all rights are reserved until one is added.
