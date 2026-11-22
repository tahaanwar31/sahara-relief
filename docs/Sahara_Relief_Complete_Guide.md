# Sahara Relief Platform: The Complete Guide

**Written for someone who knows nothing about the project.** Every word is meant to be simple. If a word is new, the glossary at the end explains it.

> **PROTOTYPE. Not a real government service.** Every person, ID number, payment and message in this project is made up (synthetic). Nothing here is real data. Built for **Coder's Cup '26: "The Last Mile: AI on Public Rails"** (ACM, FAST-NUCES Karachi).

---

## 1. What is this project, in one minute

Imagine a government gives a **cash relief payment** to poor families every three months (we call the programme **"Sahara Relief Programme"**; it is made up). Many of the women who should get this money:

- **cannot read** well,
- **have a weak phone signal**,
- have **their name spelled three different ways** in different government records (Muhammad, Mohammad, Muhammed),
- and get **fake "relief payment" SMS messages** from scammers, so nobody is sure what is real.

Our platform is a **website and app** that helps such a woman (and a community helper who sits next to her) **claim her payment from start to end**. It also gives the government staff the tools to check claims **fairly, safely and with a record of every step**.

The platform does four big things:

1. **Decides.** It looks at a claim and says: approve, ask for more proof, or send to a person.
2. **Explains.** Every decision comes with plain reasons, in Urdu and English.
3. **Protects.** It guards people's private data, catches scams and fake papers, and keeps a record nobody can edit.
4. **Says "I am not sure".** When it is not sure, it does **not guess**. It hands the case to a human.

This is **not a chatbot**. It is a full multi-user system with different accounts, rules, cases, consent, and an audit trail.

---

## 1A. The real numbers behind the problem

These are the facts that justify the project. Every figure is explained, with its source link, in **Section 3A of the full Instruction Manual**. Most come from news reports of official data, so check the source before quoting one.

| The number | What it means |
|---|---|
| **54%** of women are literate, against **73%** of men | Almost 1 in 2 women cannot read and write |
| **44%** of rural women are literate | In villages, more than half cannot |
| **28%** of women in the poorest rural households are literate | Fewer than 3 in 10 poor village women can read |
| **44.7%** of Pakistanis are below the World Bank's $4.20-a-day line (about 107 million people); about **22%** on the national line | The need is enormous |
| About **10 to 12 million families** receive BISP Kafaalat; budget about **Rs 716 billion** | At this scale a small error rate means thousands of wrong decisions |
| **Rs 14,500** a quarter (from March 2026); cutoff **32** | Rules and amounts change, so they must be editable without code |
| **68%** of women own a phone (men **93%**); **28%** of women internet users use a **borrowed** phone | Phones are shared, so we built Helper Mode |
| About **140 million** people live in coverage but do not use mobile internet | A good connection cannot be assumed, so the app works offline |
| Cybercrime reports up about **35%** in 2025; about **90%** of financial scams use digital or branchless accounts | Fraud is common, so we check scams and payout accounts |
| Genuine BISP messages come **only from 8171**; agents reported deducting **Rs 1,000 to 2,000** | Fake messages and agent cuts are real, official problems |

**Our own prototype uses made-up values** (cutoff 30, Rs 13,500, sender code 9171) so nobody mistakes it for the real programme.

## 2. The problem we are solving (the "why")

The hackathon brief asked for eight things. Here is each one, and what we built for it.

| # | The challenge | What we built |
|---|---|---|
| 1 | **The cost of being wrong.** Paying someone who should not be paid is expensive. Refusing someone who should be paid is cruel. | A cost-based "approval line". The system only approves alone when it is at least 97% sure. Auto-reject is **turned off**: a human always decides a "no". A slider screen shows the maths. |
| 2 | **Say "I am not sure".** | Three zones: AUTO, ASK MORE, HUMAN. A "I am not sure" notes box tells the admin what was checked, what is missing and what to do next. |
| 3 | **Bad data and name variants.** | A name normaliser plus a matching score. It never says "same person" on the name alone. |
| 4 | **Rules change without redeploying the app.** | Rules live in the database as versions. The admin edits a draft, previews it with the Digital Twin, then makes it live. No code change. |
| 5 | **Explain and keep an audit trail.** | Every decision has reason codes, the rule version, the model version and a full trace. A hash-chained diary records every action and cannot be edited. |
| 6 | **Consent and take-back.** | The citizen gives permission and can take it back at any time. When she does, admins lose access immediately (the database enforces it). |
| 7 | **Works for non-readers on weak internet.** | Big buttons, pictures, spoken Urdu and English, offline saving, resume codes. |
| 8 | **Scams and fake documents, with honest false-alarm numbers.** | A scam message checker and a document checker. The evaluation page shows the real error numbers. |

**Bonus items we built:** Digital Twin (replay old cases under new rules), Helper Mode (one helper, many families, separate permission each), offline sync, scam reporting.

---

## 3. Who uses it: the three roles

| Account | Who they are in real life | What they do |
|---|---|---|
| **Person** (eligible for relief) | A woman claiming her payment (also a shopkeeper who wants to check a message) | Claims her payment, checks scam messages, gives and takes back permission |
| **Helper** | A community worker who helps many women | Helps one family at a time with their claim |
| **Admin** | Programme staff in an office | Reviews the cases the system is unsure about, edits rules, previews changes, reads evaluation reports, manages API keys, **reads and verifies the diary** |

### 3.1 The Person's journey, step by step

The claim has **8 steps**. One small question at a time. A progress bar shows where she is. The phone speaks each step in Urdu or English.

1. **Welcome.** "Do you want to claim your relief payment?" Pick the language (Urdu or English).
2. **Permission.** The screen explains who can see what: the office sees her name, ID number and household; her helper sees her details only while helping; the payment service checks her account. She taps **I agree** (or **No, not now**). She is told she can take permission back any time in "My data".
3. **Is this you?** She **types her 13-digit ID number first**. The system looks it up in the government record and shows what it holds (name in English and Urdu, father or husband, date of birth, district, masked ID number), then asks "Is this you?". If she types **someone else's** number that exists, only the **name** is shown and her papers will be compared with that record; the claim then goes to a person. A number that is not in the records gets "Sorry, this is an invalid ID number".
4. **Your household.** She **types how many people live in her household**. We never show the number; the server checks it against the survey record and says only yes or no. Three wrong tries send the claim to a person.
5. **Your ID card.** Only if step 4 matched, she photographs the **front and back** of her ID card. Nothing else is asked for (no income letter, no bill, no death certificate: many rural women have none). The system checks each photo (blur, signs of editing, duplicates), **reads the card** and compares its **ID number, name and face** with the government record. If the signal drops, the photo waits on her phone and sends later.
6. **Where should the money go?** She types her correct 11-digit mobile account number (it starts with 03) and checks it before pressing **Continue**. The system checks only the shape and whether another family uses it. **No account number or holder name is ever shown back**, and no account is stored in the government registry up front: it is saved there only after the claim is approved.
7. **Send your claim.** She sees a summary (papers sent, account, amount for this quarter) and presses **Send my claim**.
8. **Result.** She sees one of three answers:
   - **Approved** (green) with the amount: "your payment is approved and the amount has been sent to your account" (the mock payment service pays at once).
   - **Please send one more thing** (it says exactly what is missing).
   - **I am not sure. A person will look at your case.** (blue) with the **exact reason**, for example "The face on your card does not match the photo in our record", and what happens next and by when.

A faint reset icon in the top bar (demo only) puts the person back to her initial state: a fresh claim, and her payout side emptied (no account number, none in the payout registry, no payment given). Her old claims and decisions are kept as history.


She can stop at any time. Her work is **saved on the server** (or on her phone if offline). A **6-digit resume code** lets her continue later, even on another phone.

### 3.2 The Helper's journey

1. Logs in and sees **"Families you help"**: a list of the families he helps (one in the demo: Zainab). Names are **hidden** (`Z*** B***`) until the woman has given permission.
2. Opens one family. **Only one family can be open at a time.** This stops mix-ups.
3. If she has not given permission yet, he **asks her three things and types them on his own phone**: her **ID number, date of birth and household size**. The server checks them against the government records (he never sees the records) and records her permission as hers. Three wrong tries lock the family for 30 minutes.
4. The helper then fills in the claim steps **with her** (asking her for each detail), takes the photos, and sends. If she had already started, he carries on from where she stopped. Either she claims herself, or the helper does it for her.
5. He ends the session. The screen locks to protect her details.

What a helper **cannot** do: approve or reject any claim; see families that are not his; see a name before permission; change rules; read the audit diary.

### 3.3 The Admin's journey, part 1: reviewing cases

1. Opens **Cases to review**: a list sorted by **priority first**, then the **least sure** case first. It refreshes every 10 seconds.
2. Opens a case and sees the **Decision card**: zone, result, confidence, a plain reason, and a **Checks** list (permission, ID card, household score, name match, payout account, and so on).
3. Reads the **"I am not sure" notes**: what was checked, what is missing, suggested next steps.
4. Sees the papers with a clear/blurry/suspicious label, and the **side-by-side name comparison** when the system thinks the person may be in the records twice.
5. Chooses: **Approve**, **Reject**, **Ask for more proof**, or **Hold**, and writes a short note. Every choice makes a new row in the diary. Nothing is overwritten.
6. If the payment is large (over Rs 20,000), a **second admin** must approve too.

An admin **cannot** approve their own case or one they helped with, cannot change rules, and loses access to a case the moment the person takes back permission.

### 3.4 The Admin's journey, part 2: rules and reports

- **Rules:** sees all rule versions. Makes a **new draft** (rules are never edited in place). Changes the cutoff, amount, payout cap, second-approver limit and the "costs of being wrong". Adds or removes rules with a simple form.
- **Policy screen:** sliders for "a wrong approval costs / a wrong rejection costs / a person reviewing costs". It draws a chart of where the approval line should sit. This is a **preview only**.
- **Digital Twin:** replays up to 500 past cases under a draft version and shows **who would change**, which cases move zone, how many approvals change, and the before/after cost. Then the admin makes the version live (with a confirmation).
- **Evaluation:** how the system did on a labelled test set, with error numbers.
- Manages **API keys** for the public API.

Rules and decisions are kept apart in the database: nobody can approve their own case or one they helped with, and a rule change always starts as a new draft.

### 3.5 The Admin's journey, part 3: checking the diary

- Opens **The diary**: every important action, in order. Filters: Decisions, Cases, Consent history, Rule changes, Documents. Search box. Sign-in lines are hidden by default.
- Clicks **Verify the diary**: the system re-checks the whole chain from the first row. It says **"The diary is intact"** or **"broken at row N"**.
- Opens any decision and reads its full trace: which rules ran, which fired, which model version, what confidence.
- Reads the evaluation numbers. Nobody can change the diary, the admin included.

### 3.6 The shopkeeper / anyone: "Is this message real?"

Any citizen can paste an SMS and optionally the sender. The system says **Looks real / Be careful / Looks like a scam**, shows the **reasons in plain words** ("it asks for your PIN", "it has a link that does not look official"), and lets the person **report** it. It **only warns**. It never blocks or deletes anything.

---

## 4. Access rights: who can see and do what

These rules are **enforced inside the database** (called row-level security, or "row locks"). That means even a bug in our code cannot leak data. Each person sees only the rows they are allowed to.

| | Person | Helper | Admin |
|---|---|---|---|
| See **own** claim and data | Yes | n/a | n/a |
| See a **family's** data | n/a | Only the family in the open session, **and only with her active consent** | Only cases in **own office**, **and only with active consent**. Identity records only through a masked view |
| Create / edit a claim draft | Own | For the open family | No |
| Give consent | Yes (own) | **Only with her three details** | No |
| Take back consent | Yes | Yes (for that family) | No |
| Approve / reject / hold a case | No | **No** | **Yes** (not own, not one they helped with) |
| Edit rules | No | No | **Yes** (as a new draft) |
| Make a rule version live | No | No | **Yes** |
| Run Digital Twin | No | No | Yes |
| Read the audit diary | Only lines about themselves | Own | Yes, all |
| Change the diary | **Nobody** | **Nobody** | **Nobody** |
| Change their own role | No | No | No |
| Manage API keys | No | No | Yes |

**Extra safety rules (the database refuses these even if the app tries):**

- **Separation of duties:** nobody approves their own case or one they helped with.
- **Two-person approval** for payments over Rs 20,000.
- **Consent is checked every time.** Take it back and access stops at once.
- **The diary is append-only.** Update, delete and truncate are refused with an error.
- **Rule versions are immutable.** Once saved they cannot change. Only one version is live at a time.
- **Mass-assignment guards:** a user cannot sneak in extra fields (like changing their own role).
- **Hard flags beat any score:** a deceased flag, an expired ID card, or a missing consent always blocks auto-approval, whatever the model says.

---

## 5. The decision rules: how a claim is judged

### 5.1 The order of checks

1. **Hard rules first.** These beat any score. Examples: no consent, invalid or expired ID card, a "deceased" flag, missing core details, an exclusion rule hit, an ID number that is someone else's, or a card whose number, name or face differs from the government record, or a household size that does not match the survey.
2. **Checks run:** permission, ID card, name match, household score, exclusions, papers, payout account, scam signals.
3. **The probability model** gives a number, `p_eligible` (how likely this claim is truly eligible).
4. **The zone is chosen:**
   - **AUTO (approve alone):** only if `p_eligible` is at least the approval line (**0.97**), **no rule fired**, and **no check is unsure or failing**.
   - **ASK MORE:** one thing is missing or unclear (a blurry photo, a missing paper). The system says exactly what.
   - **HUMAN:** anything else. This is the default, safe answer. Below the reject line (0.15) the case still goes to a human ("likely not eligible"), because **auto-reject is off**.

### 5.2 The "cost of being wrong" maths

The approval line is not a guess. It comes from costs:

- A **wrong approval** costs **100** (paying someone who should not be paid).
- A **wrong rejection** costs **20** (turning away an eligible person).
- A **person reviewing** costs **3** (staff time).
- Asking for proof costs **1**.

**Approval line = 1 − (review cost ÷ wrong-approval cost) = 1 − 3/100 = 0.97.**
In plain words: approve alone only if you are at least 97% sure, otherwise it is cheaper to let a person look.
**Reject line = review cost ÷ wrong-rejection cost = 3/20 = 0.15.**

### 5.3 The rule set (all editable without code)

The current live version ("v1") has:

| Setting | Value |
|---|---|
| Poverty-score cutoff | 30 (a score at or below this is eligible) |
| Borderline band | 5 (within 5 points of the cutoff is "close", so a person looks) |
| Payment amount | Rs 13,500 per quarter |
| Payout cap | Rs 29,000 |
| Second approver needed above | Rs 20,000 |
| Auto-reject | Off |
| Costs of being wrong | wrong approval 100, wrong rejection 20, review 3, ask for proof 1 |

A draft "v2" exists for the demo (cutoff 25, amount Rs 14,500). The Digital Twin shows it would move 22 cases from AUTO to HUMAN.

### 5.4 The 33 decision reason codes

Every outcome has a code and a plain sentence in English and Urdu (for example `R_AUTO_APPROVED`, `R_DOC_BLURRY`, `R_CARD_FACE_MISMATCH`, `R_ID_NOT_YOURS`, `R_PMT_BORDERLINE`, `R_PAYOUT_HELPER_OWNED`, `R_DUPLICATE_IDENTITY`, `R_LOW_CONFIDENCE`). The citizen sees a kind sentence ("The photo is not clear. Please take it again in good light."). Officers see a staff sentence ("A photo is too blurry to read.").

### 5.5 Payout account safety

The system sends a claim to a human if the account is **shared by other families**, was **changed recently**, **belongs to a helper** (a classic abuse), or the payment is **over the cap** (two officers needed). Payout accounts are **not pre-stored** in the government registry: a typed number is only shape-checked, and it is written to the registry after approval.

---

## 6. The technology (the "what" and the "why")

### 6.1 The big picture

```
 Phone or computer          Python service            Database
 (React web app)   --->     (FastAPI)       --->      (Postgres on Supabase)
 Urdu + English             decides, explains,        row locks, diary,
 works offline              protects, serves API      rules, consent
```

**Rule of the road:** the web app talks **only to our service**, never straight to the database. The service talks to the database. This keeps all the important logic and all the secrets in one place.

### 6.2 Front end (what people see)

| Choice | Why |
|---|---|
| **React + TypeScript** | React builds screens from small reusable pieces. TypeScript catches many mistakes before the app runs. |
| **Vite** | A very fast tool to build and run the app. |
| **Tailwind CSS** | Quick, consistent styling. Supports right-to-left Urdu through "logical" spacing. |
| **PWA (installable web app)** | Works like an app on a phone, loads fast, and works **offline**. No app store needed. |
| **Offline outbox (IndexedDB)** | Actions are saved on the phone when there is no signal and sent later. Each has a unique "idempotency key" so nothing is ever sent twice. |
| **Spoken prompts** | 108 pre-recorded audio files (54 Urdu, 54 English), made with the free Edge text-to-speech voices (`ur-PK-UzmaNeural` and `en-US-JennyNeural`). Because they are files, they work **without internet**. |
| **Inter font** for English, **Noto Naskh Arabic** for Urdu | Clean, readable type. The whole app flips to right-to-left in Urdu. |
| **Polling every 10 seconds** | Simple, reliable updates. We did not need heavy live connections. |

**Benefit for the problem:** big buttons, pictures and speech help someone who cannot read; the offline outbox helps someone with a weak signal; resume codes let a woman stop and come back.

### 6.3 Back end (the "brain")

| Choice | Why |
|---|---|
| **Python + FastAPI** | Python is the language of machine learning, so the AI and the API live together. FastAPI is fast, checks every input automatically and creates the Swagger documentation for free. |
| **psycopg 3** (direct Postgres connection) | Lets us set the user's identity inside each database transaction, so the row locks apply. |
| **scikit-learn** | The standard library for training small, explainable models. |
| **rapidfuzz** | Fast text-similarity maths for name matching. |
| **numpy / Pillow** | Image maths for the document checks. |
| **JWT login tokens** | A signed ticket proving who you are. |

How a request is handled: the service reads your token, **opens a database transaction as you** (`SET LOCAL ROLE authenticated` and your id), so the **database itself** applies your row locks. The "master key" is used in one single file only, for system jobs such as writing the diary.

**Safety features in the service:** rate limits (login 40 per minute per computer and 8 per minute per email; uploads 20 per minute; scam check 30 per minute), input checks, a size limit on uploads, same-answer-for-wrong-email-or-password (so nobody can guess which emails exist), request ids, and no secrets in the logs.

### 6.4 Database

**Postgres, hosted by Supabase** (region **Mumbai**, close to Pakistan for speed).

**Why Postgres (SQL) and not Mongo or Firebase:**
- Our data is **full of links**: people, households, cases, consents, decisions. SQL handles links well.
- **Row-level security** (row locks) is built in and is exactly what we need for "each role sees only its rows".
- **Triggers** let the database itself build the unbreakable diary.
- **Migrations** (numbered SQL files) are a hackathon requirement and make the structure repeatable.

**Why Supabase:** a managed Postgres with a free plan, backups, and easy hosting. We use it as a **Postgres host**. (We tried the Seoul region first. It took 20 to 60 seconds per page from Karachi. Mumbai takes about 1.3 seconds. Region matters.)

**The 6 migrations:** `0001_core` (tables), `0002_rls` (row locks), `0003_audit` (diary), `0004_rules_consent`, `0005_case_safety`, `0006_function_grants`.

**Main tables (27 in total, all with row locks on):** `people`, `households`, `person_links`, `profiles`, `user_roles`, `cases`, `case_events`, `drafts`, `documents`, `doc_checks`, `consents`, `consent_events`, `helper_assignments`, `decisions`, `case_notes`, `case_flags`, `rule_sets`, `rules`, `api_keys`, `audit_log`, `scam_reports`, `eval_runs`, `eval_cases`, `labelled_cases`, `data_quality_queue`, `schema_migrations`.

**The hash-chained diary (`audit_log`):** each row stores a **hash** (a digital fingerprint) of its own content **plus the previous row's hash**. Change any old row and every fingerprint after it stops matching, so "Verify the diary" shows exactly where it broke. Update, delete and truncate are refused by triggers.
*Honest limit:* someone with full database-owner power could rewrite the whole chain. We say so.

**Seed data (all invented):** 189 people, 151 cases, 120 labelled past cases, 393 consents, 40 scam reports, 2 API keys, and 184 demo logins.

**Local fallback:** for a laptop with no internet, a plain Postgres runs locally (PGlite), loaded with the same migrations and seed.

### 6.5 The APIs (how programs talk to the service)

The service has a **Swagger page** at `/docs` (an automatic, clickable list of every API call).

**Main groups (about 55 calls):**

| Group | Examples |
|---|---|
| Login and me | `POST /auth/login`, `GET /me`, `PATCH /me` |
| Cases | `GET/POST /cases`, `PUT /cases/{id}/draft`, `POST /cases/{id}/submit`, `.../documents`, `.../decide`, `.../decisions`, `.../notes`, `.../officer-decision`, `.../assign`, `.../escalate`, `.../close` |
| Queue | `GET /queue` (admins, sorted by priority and confidence) |
| Consent | `GET/POST /consents`, `POST /consents/{id}/withdraw`, `GET /data-access-log` |
| Helper | `GET /helper/families`, `POST /helper/session` |
| Drafts | `GET /drafts/resume/{code}` |
| Rules (admin) | `GET /rule-sets`, `POST /rules/validate`, `POST /rules/activate`, `POST /rules/twin` |
| Policy | `GET /policy/cost-curve`, `GET /policy/search` |
| Identity | `POST /identity/match`, `POST /cases/{id}/identity-check` |
| Scam | `POST /scam/check`, `POST /scam/report` |
| Documents | `POST /docs/analyze` |
| Diary | `GET /audit`, `GET /audit/mine`, `GET /audit/verify` |
| Evaluation | `POST /eval/run`, `GET /eval/latest`, `GET /analytics/summary`, `GET /metrics` |
| Mock government services | `GET /mock/nadra/{cnic}`, `GET /mock/nser/{household_id}`, `POST /mock/raast/verify`, `/release`, `/settle` |
| **Public API (needs an API key)** | `POST /public/v1/scam/check`, `POST /public/v1/eligibility/precheck`, `GET /public/v1/cases/{id}/status` |

**The public API** is for other organisations (for example a bank or an NGO). It needs an **`X-API-Key`** header. Without a key it answers 401. Keys are stored as hashes, can be revoked (a revoked key stops working at once), and have rate limits. The demo key is `sahara_demo_key_0001` (fake).

**The three mock services** pretend to be real national systems:
- **NADRA** (identity records), **NSER** (the national poverty survey and household score), **Raast** (instant payments). Each one checks the person's **consent** before it answers. They are **simulated**.

---

## 7. The AI: what it is, how it was trained, how it works

### 7.1 First, the basics (read this if "AI" is new to you)

- **Machine learning** means a computer learns a pattern from examples instead of being given step-by-step rules.
- **Supervised learning:** you show the computer many examples **with the right answer attached** ("this message is a scam", "this claim was truly eligible"). It learns to guess the answer for new examples. **Both our trained models are supervised.**
- **Unsupervised learning:** you give the computer examples **with no answers** and it finds groups or patterns on its own (for example grouping similar customers). **We do not use any unsupervised model** in this project. We say that honestly. (Our policy search uses a word-counting method, TF-IDF, which needs no labels, but it is a search tool, not a learned model.)
- **Training** = showing the examples so the model adjusts its internal numbers.
- **A feature** = one fact the model looks at (for example "the photo is blurry").
- **Probability** = a number from 0 to 1 for how likely something is. 0.97 means 97% likely.
- **Calibration** = making sure "97% sure" really is right about 97 times in 100. A model can sound sure and still be wrong. Calibration fixes that.
- **Synthetic data** = invented examples. We use it because the rules of the hackathon forbid real personal data.

### 7.2 Why we built our own small models (and did not use ChatGPT or similar)

- **No real data allowed.** We cannot send anything real to an outside service anyway.
- **"I am not sure" needs a trustworthy confidence number.** A small calibrated model gives one. A chat model sounds confident even when it is wrong.
- **Explainable.** A logistic regression is a weighted score. We can show **which facts pushed the decision**. A court, an auditor or a citizen can ask "why?" and get a real answer.
- **Cheap, fast and private.** Each decision takes about **6.6 milliseconds**. It runs on a laptop with no internet and no fees.
- **Safe by design.** The AI is a **helper inside guard rails**: hard rules run first, auto-reject is off, and a human decides every "no".

**We used no ready-made AI models.** Nothing is downloaded from a model hub. There is an **optional** wrapper to call an outside language model (Ollama or Claude) to rewrite explanations, but it is **switched off by default** and is **never** used to decide.

### 7.3 The AI features at a glance

| # | Feature | Type | Learns from data? |
|---|---|---|---|
| 1 | **Decision and routing with confidence** | Logistic regression, calibrated | **Yes, supervised** |
| 2 | **Scam message detector** | TF-IDF text features + logistic regression + rules | **Yes, supervised** |
| 3 | **Name and duplicate matching** | Spelling normaliser + weighted similarity | No (maths and rules) |
| 4 | **Document checks** (blur, editing, duplicates) | Image maths | No (maths) |
| 4b | **ID card reading and face matching** | OCR (RapidOCR) + OpenCV YuNet and SFace face models | Pretrained, not trained by us |
| 5 | **Policy answers with sources** | TF-IDF word search | No labels needed (retrieval) |
| 6 | **Digital Twin and cost curve** | Replays the engine under new rules | No (simulation) |
| 7 | **Evaluation dashboard** | Measures all of the above | No |
| 8 | **Optional language model for wording** | Outside model | Off by default |

### 7.4 AI #1: The decision model (probability of being eligible)

**Purpose:** give a trustworthy number `p_eligible` for the zone decision.

**What it is:** a **logistic regression** (a simple scoring model that turns a weighted sum of facts into a probability) wrapped in **isotonic calibration** (a method that bends the output so the probabilities are honest).

**What it looks at: 21 features**

`id_same, id_maybe, id_diff, id_score, id_known` (how well the name and ID match), `doc_conf, doc_blurry, doc_edited, doc_missing` (paper quality), `pmt_margin, pmt_missing, pmt_clear_below, pmt_clear_above` (how far the household score is from the cutoff), `flags, payout_risk, cnic_bad, deceased, scam, duplicate, missing_fields, any_visible_problem`.

**What it was trained on:** **12,000 synthetic cases** made by our own generator (`synth.py`), each with a hidden **true answer**. The mix we chose (not measured from the real world):

| Category | Share |
|---|---|
| Clearly eligible | 40% |
| Clearly ineligible | 25% |
| Borderline | 15% |
| Bad data | 15% |
| Scam | 5% |

A case is "truly eligible" when the **true** survey score is at or below the cutoff, there is no true exclusion, the person is who the record says, and nothing is fraudulent. What the system **sees** is the true value **plus noise**, so cases near the cutoff are honestly uncertain, and a small share of clean-looking cases secretly hide a problem. The generator also uses two different cutoffs (25 and 30) so the model does not memorise one number.

**Settings (parameters):**

| Setting | Value | Meaning in plain words |
|---|---|---|
| Algorithm | Logistic regression | Simple weighted scoring |
| `C` | 100 | How closely it fits the data (higher means less holding back) |
| `max_iter` | 2000 | Maximum rounds of learning |
| Calibration | Isotonic, `cv=5` | Learn the honesty correction on 5 splits of the data |
| Random seed | 20261121 | Makes the training repeatable |
| Model version | `logreg-synth-v1-…` | Saved in every decision so it is auditable |

**How it works at decision time:** the facts about the claim are turned into the 21 numbers; the model returns `p_eligible`; the engine compares it to the approval line (0.97) and only then allows AUTO, and only if all the hard rules and checks are clean.

**Results on 2,000 fresh synthetic cases:**

| Measure | Result |
|---|---|
| Sent to AUTO | 758 cases (about 38%) |
| Sent to HUMAN | 1,117 cases (about 56%) |
| Sent to ASK MORE | 125 cases (about 6%) |
| Wrong auto-approvals | 14 out of 758 (about 1.8%), all among "clearly eligible" cases hiding a problem |
| Total cost (engine) vs naive "always decide alone" | **4,876 vs 5,500** (the engine is cheaper) |
| Brier score (lower is better, measures honesty of the probabilities) | 0.0383 |
| Time per decision | about 6.6 ms |
| Clearly ineligible, scam and borderline cases wrongly approved | **0** |

### 7.5 AI #2: The scam message detector

**Purpose:** warn a person that an SMS looks like a scam, and say **why**.

**How it works (in steps):**
1. The text is cut into **character pieces of 2 to 5 letters** (so it works for English, **Roman Urdu** and **Urdu script**, and survives spelling changes). This is **TF-IDF**, which gives more weight to unusual pieces and less to common ones.
2. We add **rule signals**: asks for a PIN/OTP, asks for the ID card number, asks for a fee, uses urgent words ("blocked today"), prize language ("you won"), has a strange link, claims to be official from the wrong sender code. Negations such as "never share your PIN" are understood, so a **real** warning message is not flagged.
3. A **logistic regression** turns these into probabilities for **safe / suspicious / scam**.
4. Score = P(scam) + 0.5 × P(suspicious). **At or above 0.62 = "Looks like a scam". At or above 0.30 = "Be careful".** A direct ask for a PIN, OTP or ID number is **never labelled safe**.
5. The official sender code is `9171` (made up). A message from it is treated more kindly.

**Trained on:** about **480 synthetic messages** that we wrote (English, Roman Urdu, Urdu script), labelled safe / suspicious / scam.

| Setting | Value |
|---|---|
| Text features | `char_wb` character n-grams, length 2 to 5, `sublinear_tf`, `min_df=2`, up to 30,000 features |
| Classifier | Logistic regression, `C=8`, `max_iter=2000` |
| Model version | `scam-tfidf-lr-synth-v1` |

**Results on a small labelled test set of 56 messages:** 3-way accuracy **92.9%**; scam precision **95.7%** and recall **95.7%**; **false-alarm rate on safe messages 3.7%** (1 of 27 safe messages was wrongly flagged); **1 scam missed**; about 39 ms per message.
*Honest limit:* it only warns, never blocks. Real SMS would be messier than our invented ones.

### 7.6 AI #3: Name and duplicate matching (not trained)

**Purpose:** decide whether two records are the **same person**, even when names are spelled differently (Muhammad, Mohammad, Muhammed, Mohd all match).

**How it works:**
1. A **normaliser** cleans spelling (case, common variants, spaces).
2. **rapidfuzz** measures how similar the names are.
3. A **weighted score** combines the fields: **name 30%, father's name 20%, ID number 30%, date of birth 15%, district 5%**. Fields that are missing are left out fairly.
4. Result bands: **SAME** (score at least 0.95 and strong evidence), **MAYBE** (at least 0.82, or conflicting evidence), **DIFFERENT**.

**The golden rule:** it **never says SAME on the name alone**. MAYBE goes to a person. On our small test (10 labelled pairs) there were **0 false merges** (two different people called the same). The admin sees a side-by-side table to decide.

### 7.7 AI #4: Document checks (not trained)

**Purpose:** catch blurry, edited or duplicated paper photos.

- **Blur:** a Laplacian filter measures sharpness. Variance below **60** (at 800 pixels wide) means **blurry**, so "please take it again".
- **Edit signs:** **error-level analysis (ELA)** re-saves a JPEG and looks for patches that react differently, plus a metadata check (for example editing-software tags).
- **Duplicates:** a fingerprint (hash) of the image catches the same paper sent twice.
- **QR reading** needs a program not installed everywhere; if it is missing the system **asks for another photo instead of guessing**.
- **ID card reading (OCR):** the front of the card is read with RapidOCR (CPU only). Our prototype uses one fixed English card layout. The 13-digit **number** is compared digit by digit and the **name** at 88% letter similarity with the government record.
- **Face matching:** the photo on the card is compared with the photo in the government record by two small OpenCV models (YuNet finds the face, SFace makes 128 numbers). "Same person" means cosine similarity of 0.50 or more; the model paper suggests 0.363, but that let one pair of different test people through, so we use the stricter line. **This cutoff was set on a handful of AI-generated faces and has not been tested on real people or skin tones.**
- Every combination of face, name and number mismatch has its own reason code and plain sentence (Urdu and English), and says a staff member will check.

**Results:** 21 of 21 invented card images were judged as expected, with 0 clean images called suspicious. *Honest limit:* tiny sample, simple methods.

### 7.8 AI #5: Policy answers with sources

A person or admin can search the (made-up) programme policy. The system finds the best matching policy lines with a word-counting search (TF-IDF) and **shows the lines and their source**. It does **not** invent an answer.

### 7.9 AI #6: Digital Twin and the cost curve

- **Digital Twin:** takes up to 500 past cases, runs them through a **draft** rule set, and shows **who would change** before you go live. Example: the draft v2 would move 56 cases, including 22 from AUTO to HUMAN, and change the total cost from 1,399 to 1,373.
- **Cost curve:** draws the total expected cost against the approval line so the admin sees why 0.97 is sensible.

### 7.10 What "I am not sure" means in practice

The system says it when: the probability is below the approval line, a check is unsure, a hard rule fires, data is missing, the checks disagree, or the case is borderline. The admin then gets a notes box: **what was checked, what is missing, what to do next.**

---

## 8. Testing: what was checked and what passed

| Area | Result |
|---|---|
| Database tests (row locks, diary, rules, consent) | **50 of 50 pass** |
| Service tests (including API security tests, real-database flows and 8 ID card and face tests) | **178 of 178 pass** |
| Web tests and type check | **27 of 27 pass**, type check clean |
| Live check in real Chrome (all three roles (person, helper, admin) against the real service and database) | **Pass**, no server or page errors |
| Evaluation script on synthetic data | numbers in section 7 |

Bugs we found by testing and fixed: the engine first sent 96% of cases to a human (the invented data mix and the calibration were wrong), revoked API keys still worked, some buttons lost their colour in the build, the helper list took 12 seconds (too many database calls), and the Urdu names did not match the English ones.

---

## 9. How to run it

On a Windows laptop, in PowerShell, from the project folder:

```
.\scripts\dev.ps1
```

This starts a local database, loads the data, starts the service at `http://localhost:8000` (Swagger at `/docs`) and the web app at `http://localhost:5173`.

**Demo logins (all fake):**

| Role | Email | Password / PIN |
|---|---|---|
| Person | `fam-abc0e0aa070a@citizens.sahara.test` (Khair Bibi, fresh claim) | 246810 |
| Person | `zainab@citizens.sahara.test` | 246810 |
| Helper (Yousuf) | `yousuf@helpers.sahara.test` | 246810 |
| Admin | `admin1@gov.sahara.test` | Admin#2026 |

**Test commands:** `node --test "db/tests/*.test.mjs"` (database), `python -m pytest tests -q` inside `service/`, `npm test` inside `web/`, `node web/scripts/smoke_live.mjs` (real Chrome).

---

## 10. What is real and what is simulated

| Real (built and running) | Simulated (made up) |
|---|---|
| Login, roles, and database row locks | NADRA identity (with photos), NSER survey and Raast payment services |
| The hash-chained diary and its check | All people, ID numbers, households and cases |
| Consent give and take-back that really stops access | The relief programme and its rules ("Sahara Relief Programme") |
| Rule versions, the Digital Twin, cost maths | The scam messages and test cases used to train and test |
| The decision engine, name matching, scam and document checks | The official SMS sender code (`9171`) |
| Offline saving, resume codes, Urdu and English voice | Money: nothing is ever really paid |

---

## 11. Honest limits (say these out loud before anyone asks)

1. **All training and test data is synthetic.** The numbers show the **method works**, not how it would perform on real people. We wrote the data generator, so the accuracy numbers measure how well the model learned our own rules.
2. **Urdu text needs a native speaker's check.** The voice files were made with a computer voice.
3. **QR reading** is not installed everywhere. The system asks for another photo instead of guessing.
3a. **The ID card reader and face matcher** work on our fixed template card and on AI-generated faces. A real NADRA card (Urdu text, glare, bent corners) needs a bigger model, and the face model needs a fairness test on a real population. Only Zainab has a registry photo.
4. **The diary** can in theory be rewritten by someone with full database-owner power. Normal users and even the admin cannot.
5. **PIN proof for Helper Mode** works in the local login mode we run. The hosted-login mode is built but not tested.
6. **Docker deployment** is written but untested on this laptop. **The app is not deployed yet.**
7. **No voice input.** The citizen listens and taps.
8. **Rate limiting** is in the service's memory (fine for one server; a bigger system would use Redis).

---

## 12. Glossary (simple meanings)

- **API:** a menu of requests one program can make to another.
- **Audit trail / diary:** a record of every important action that nobody can edit.
- **Calibration:** making a model's "97% sure" honest.
- **Consent:** a person's permission, which they can take back.
- **Digital Twin:** a safe copy where you replay past cases under new rules.
- **FastAPI:** the Python tool we used to build the service.
- **Feature:** one fact the model looks at.
- **Hash:** a digital fingerprint of some data.
- **Idempotency key:** a unique label that stops the same action being done twice.
- **JWT:** a signed login ticket.
- **Logistic regression:** a simple scoring model that outputs a probability.
- **Migration:** a numbered database setup file.
- **Mock:** a pretend version of a real service.
- **Offline-first:** works without internet and syncs later.
- **PWA:** a website that behaves like an installable app.
- **Postgres:** a popular, reliable database (SQL).
- **Probability:** a number from 0 to 1 for how likely something is.
- **Prototype:** an early working version, not a finished product.
- **RLS (row-level security) / row locks:** the database itself decides which rows each user may see.
- **Supervised learning:** learning from examples that have the right answers attached.
- **Swagger / OpenAPI:** an automatic, clickable page that documents the API.
- **Synthetic data:** invented data used instead of real data.
- **TF-IDF:** a way to turn text into numbers by weighting rare pieces more than common ones.
- **Unsupervised learning:** finding patterns in data that has no answers attached (we do not use it).
- **Zone (AUTO / ASK MORE / HUMAN):** the three possible outcomes of a decision.

---

*End of the guide. Everything in it comes from the project's code, database and test runs.*
