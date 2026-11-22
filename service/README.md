# service/ : the Python service (owner P2)

FastAPI. Decisions, rules, AI checks, mock services, every API the web app uses. Swagger at `/docs`.
**Everything is synthetic and mock. All training and test data is invented.** The numbers show the machinery works; they say nothing about real people.

## Run it locally

```powershell
# from the repo root, with the repo .venv
node scripts/local_pg.mjs --memory                      # Postgres on 127.0.0.1:5433 (one connection at a time)
.venv\Scripts\python db\apply_migrations.py --local --seed --dsn postgresql://postgres:postgres@127.0.0.1:5433/postgres
cd service
$env:DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/postgres"
$env:JWT_SECRET="any-long-random-string"
..\.venv\Scripts\python -m uvicorn app.main:app --port 8000
```

Open http://localhost:8000/docs. Sign in with `POST /auth/login` (for example `officer1@gov.sahara.test` / `Officer#2026`), press *Authorize*, paste the token.
If `web/dist` exists the service also serves the web app at `/`.

## Tests and evaluation

```powershell
cd service
..\.venv\Scripts\python -m pytest tests -q            # 159 tests; the API tests start their own in-memory Postgres on port 5461 (needs node)
..\.venv\Scripts\python -m app.eval.run               # prints and saves honest numbers (eval_latest.json)
```

Set `TEST_DATABASE_URL` to use a database you started yourself. Part A tests (rules, engine, identity, scam, documents, bad AI output) need no database.

## Environment variables

`AUTH_MODE` (`local` default | `supabase`), `DATABASE_URL`, `MASTER_DATABASE_URL` (optional; defaults to `DATABASE_URL`), `JWT_SECRET`,
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_SERVICE_KEY` (never used by the web app), `STORAGE_MODE`, `LLM_PROVIDER` (`none` default),
`CORS_ORIGINS`, `RATE_LIMIT_PER_MIN`, `TOKEN_TTL_SECONDS`, `MAX_UPLOAD_BYTES`, `DB_SERIALIZE`. A `.env` in the repo root is read if present.

## How access control works

* A token only says WHO you are (`sub`). The role comes from the database (`app.current_role()`) on every request.
* Everything a person does runs in one transaction as that person (`SET LOCAL ROLE authenticated` + the user's claims), so the database row locks protect the data even if our code has a bug (`app/db.py`).
* The master connection exists in ONE file, `app/service_writes.py`, with a short allow-list (login check, write the AI decision, release the mock payment, scheduled jobs, narrow reads). A test checks no other file touches it, and that the DSN and secrets never appear in responses or logs.
* Every route depends on `require(role...)` (deny by default); a test walks the route table.
* Consent is checked in the engine (`read_case_facts` reads NOTHING else without it), document uploads, payments, helper sessions, the mock registries and the public API.

## How each check works

| Check | How | Honest limits |
|---|---|---|
| Rules | small json-logic subset (`var == != < <= > >= and or ! in missing`), strict validation, rule sets versioned by the database | the cutoff and band are also applied from `params` |
| Decision | hard rules first; then p_eligible from a calibrated logistic regression (isotonic) trained on 12,000 SYNTHETIC cases; `approve_line = 1 - review/wrong_approve`, `reject_line = review/wrong_reject`; auto-reject OFF unless the rule set says so; any two disagreeing checks go to a person | p is only as good as the synthetic data |
| Identity | names normalised (Muhammad/Mohammad/Muhammed/Mohd, Syed/Sayyid, Bibi/Begum, S/O W/O D/O, Urdu script, many date formats, CNIC gender digit), per-field weights, missing = neutral, never SAME on name alone | Urdu to Roman matching is approximate (consonant skeleton) |
| Scam | TF-IDF character n-grams + rule features (not 9171, fee, PIN/OTP/CNIC ask, urgency, link, prize) + logistic regression; warns, never blocks | trained on ~480 synthetic messages |
| Documents | blur (Laplacian variance), error-level analysis and metadata (JPEG, needs Pillow), SHA-256 and perceptual hash for duplicates, CNIC regex over supplied text | no OCR; no QR (OpenCV not installed: `qr.found` is `null`); ELA tested on a handful of invented images |
| Policy search | TF-IDF over 13 invented policy clauses; returns the clause and its source | retrieval only, no generated text |
| LLM | optional, off by default; output validated with Pydantic; garbage means HUMAN; it can only add doubt | not tested against a real model |
| Digital Twin | replays stored labelled cases under a draft rule set, returns the diff, writes nothing | |
| Cost curve | cost against approve line on a held-out synthetic set, compared with a naive 0.5 rule | |

## Endpoints

All of CONTRACT section 8 (P0, P1, P2) plus `PATCH /me`, `POST /cases/{id}/identity-check`, `GET /policy/search`, `POST /mock/raast/settle`. See `/docs`. Contract gaps and assumptions: `ISSUES.md`.

## Honest limits

* One in-process rate limiter and idempotency cache (use Redis for several processes).
* The decision engine sends most synthetic cases to a person because the invented mix has many ineligible and broken cases (see `app/engine/synth.py`).
* Verified only on PGlite (Postgres in WebAssembly). Supabase mode (`AUTH_MODE=supabase`) is written but NOT tested against a real Supabase project.
* Docker image not built here (no Docker on this laptop); Python 3.12 pins unverified.
