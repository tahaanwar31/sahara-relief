# Sahara Relief Platform

> **PROTOTYPE. Not an official service.** Every person, CNIC, payment and message in this project is **synthetic** (made up). Nothing here is real data.

Built for **Coder's Cup '26: "The Last Mile: AI on Public Rails"** (ACM NUCES, FAST-NUCES Karachi).

## What it does

> We help **a widow who cannot read, and her community helper,** claim her **quarterly relief payment** end to end, even though **her name is spelled three ways across records, her signal drops, and fake "relief payment" messages make nobody sure what is real.**

The platform **decides, explains and protects**, and it says **"I am not sure"** and hands the case to a person when it should.

| Person | What they do |
|---|---|
| **Person** (eligible for relief, e.g. the widow) | Claims her payment with big buttons, pictures and spoken Urdu. Types her ID number, photographs her ID card, and the system checks the card's number, name and **face** against the government record and says exactly what did not match. Gives and takes back permission. Works with a weak signal. |
| **Helper** | Logs in on his own phone and helps a family with its claim, one family at a time. He asks her for her ID number, date of birth and household size; the server checks them, so he never sees the records. In the demo there is one helper (Yousuf) and one family (Zainab). |
| **Shopkeeper** (a person) | Checks whether a "relief payment" message is real. |
| **Admin** | Reviews the cases the AI is unsure about. Edits the rules with no code change. Previews a change on past cases (Digital Twin). Reads and verifies the diary. |

## How it is built

```
web/       React + TypeScript installable web app (works offline)
service/   Python (FastAPI): decisions, rules, AI checks, mock services, REST API + Swagger
db/        Postgres migrations and seed data (Supabase in the cloud, plain Postgres locally)
shared/    Reason codes with English and Urdu text
scripts/   Local database, start-up, audio maker
CONTRACT.md  The agreement between the three parts
```

- **Database:** Postgres (Supabase). **Row locks** inside the database decide who may see which row. **Triggers** write a **hash-chained audit diary** that cannot be changed.
- **The decision engine** checks hard rules first, then scores the case. It handles a case **automatically only when very sure**, **asks for more proof** when one thing is missing, and **sends to a human** when unsure. The cost numbers behind these zones are on the Policy screen.
- **AI used:** decision and routing with confidence, guardrails and human approval, explanations, name and duplicate matching, scam message detection, document checks, **ID card reading (OCR) and face matching**, policy answers with sources, evaluation dashboard.
- **Payout accounts** are never pre-stored in the government registry: the person types a mobile account number (shape-checked only, nothing shown back) and it is saved after approval. An automatic approval ends with the mock payment settled.

## Run it

See `service/README.md`, `web/README.md` and `db/README.md` for each part. In short (Windows, PowerShell):

```powershell
.\scripts\dev.ps1
```

This starts a local database, loads the seed data, starts the service on http://localhost:8000 (Swagger at `/docs`) and the web app on http://localhost:5173.

**Demo:** run `python scripts/make_sample_cards.py` to create the sample ID cards (`Desktop\sahara-sample-docs`: A1 and A2 correct, B1 to B5 wrong fronts). Log in as Zainab, type her ID number `4130190000112`, her household size `4`, upload A1 and A2 and a mobile account such as `03009900044`: approved and paid. Press the faint restart icon in the top bar and upload a B card as the front: sent to a person with the exact reason. Details: `docs/CARD_FORMAT.md`.

Test users (all synthetic): `zainab@citizens.sahara.test` / `246810` (citizen), `yousuf@helpers.sahara.test` / `246810` (helper), `admin1@gov.sahara.test` / `Admin#2026` (the admin). The login page shows only these three.

### Using Supabase (hosted Postgres)

Put `DATABASE_URL` (Session pooler string) and `DB_SERIALIZE=0` in `.env`, then: `python db/apply_migrations.py`, then run `db/local/01_local_auth.sql` and `db/seed/seed.sql` (see `db/README.md`). Choose a Supabase region close to the service: from Karachi, Seoul took 20-60 s per page, Mumbai about 1.3 s.

### Checks

`node --test "db/tests/*.test.mjs"` (database), `cd service && python -m pytest tests -q`, `cd web && npm test`, and `node web/scripts/smoke_live.mjs` (real Chrome, real service, real database).

## What is real and what is simulated

| Real (built and running) | Simulated (mock) |
|---|---|
| Login, role checks and database row locks | NADRA identity (with photos), NSER survey and Raast payment services |
| The audit diary and its chain check | All people, CNICs and households |
| Consent give / take-back that really stops access | The relief programme's rules and amounts ("Sahara Relief Programme") |
| The rule versions and the Digital Twin | The scam messages and test cases used to train and test |
| The decision engine, name matching, scam and document checks | The official SMS sender code (we use `9171`) |

## Honest limits

- All training and test data is synthetic, so the accuracy numbers show the **method works**, not how it would do on real people.
- The Urdu text is a draft and needs a native-speaker check.
- QR reading needs a program that is not installed on every laptop; the system asks for another photo instead of guessing.
- The ID card reader and face matcher work on our fixed template card and AI-generated faces. The face cutoff (0.50) was set on a handful of faces and has not been tested on a real population; a real card needs a bigger model.
- Pre-recorded Urdu audio is made with `python scripts/make_audio.py` (needs internet once).
- A person with full database admin power could rewrite the whole diary chain. We name this limit.
