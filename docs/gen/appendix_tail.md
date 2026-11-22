<div class="pagebreak"></div>

# Appendix D. Settings, folder map and glossary

## D.1 Settings (environment variables)

Copy `.env.example` to `.env` and fill it in. **Never commit `.env`.**

| Variable | What it does | Example or default |
|---|---|---|
| `AUTH_MODE` | `local` (our own login) or `supabase` | `local` |
| `DATABASE_URL` | The Postgres connection string | Local: `postgresql://postgres:postgres@127.0.0.1:5433/postgres`. Supabase: the Session pooler string |
| `DB_SERIALIZE` | `1` for the one-connection-at-a-time local test database, `0` for Supabase | `0` on Supabase |
| `JWT_SECRET` | The secret that signs login tokens in local mode | a long random string |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `SUPABASE_JWT_SECRET` | Only for Supabase login mode. The service key is the master key and stays on the server. | empty |
| `STORAGE_MODE` | Where photos are kept | `local` |
| `LLM_PROVIDER` | Optional wording helper: `none`, `ollama` or `anthropic` | `none` |
| `CORS_ORIGINS` | Which web address may call the service | `http://localhost:5173` |
| `RATE_LIMIT_PER_MIN` | General rate limit | `120` |

## D.2 Folder map

```
sahara-relief/
  README.md             The short project description
  CONTRACT.md           The agreement between web, service and database
  Dockerfile            One image: service + built web app (untested)
  docker-compose.yml    Database + app on one machine (untested)
  .env.example          Settings template
  shared/
    reasons.json        The reason codes in English and Urdu
  db/
    migrations/         0001 to 0006 (tables, row locks, diary, rules, consent, safety)
    local/              A Supabase look-alike and local login for plain Postgres
    seed/               Invented data (people, cases, consents, scams) and helper SQL
    tests/              53 database tests
    apply_migrations.py Applies the files in order
  service/
    app/                The Python service (see section 20.2)
    tests/              179 tests
    requirements.txt
  web/
    src/                The React app (pages, components, api, i18n, offline)
    public/audio/       154 voice files (ur/, en/)
    tests/              27 tests
    scripts/            Live Chrome checks and audio manifest
  scripts/
    dev.ps1             Start or stop everything on one laptop
    local_pg.mjs        The local Postgres (PGlite)
    make_audio.py       Makes the voice files
  docs/
    Sahara_Relief_Complete_Guide.pdf   The short guide
    Sahara_Relief_Instruction_Manual.pdf   This manual
```

## D.3 Commands

| Task | Command |
|---|---|
| Start everything locally | `.\scripts\dev.ps1` |
| Stop it | `.\scripts\dev.ps1 -Stop` |
| Database tests | `node --test "db/tests/*.test.mjs"` |
| Service tests | from `service/`: `python -m pytest tests -q` |
| Web tests and type check | from `web/`: `npm test` and `npx tsc --noEmit` |
| Browser click-through | from `web/`: `node scripts/e2e_full.mjs` (needs the sample cards; `ONLY="tutorial"` runs part of it) |
| Evaluation numbers | from `service/`: `python -m app.eval.run` |
| Make the voice files | `python scripts/make_audio.py` (needs internet once) |

## D.4 Glossary

- **Admin:** the role of programme staff. Reviews cases, manages rules and reports, and checks the diary.
- **API:** a menu of requests one program can make to another.
- **API key:** a secret code that lets another program use our public API.
- **Audit trail (diary):** a record of every important action that nobody can edit.
- **Bias (in a model):** the starting number before any facts are added.
- **bcrypt:** a method that scrambles passwords so they cannot be read back.
- **Calibration:** making a model's "97% sure" honest.
- **Case:** one claim by one person for one quarter.
- **Person (citizen):** the role of a woman claiming her payment, shown as Person in the app.
- **Classifier:** a model that puts something into a category.
- **CNIC:** the 13-digit national ID number.
- **Consent:** a person's permission, which she can take back.
- **Cost of being wrong:** the numbers that say how bad a wrong approval or wrong refusal is.
- **Cross-validation:** testing a model on rotating parts of the data.
- **Digital Twin:** a safe replay of past cases under new rules.
- **Docker:** a way to package a program with everything it needs.
- **ELA (error-level analysis):** a trick to find edited parts of a JPEG photo.
- **Endpoint:** one address of an API.
- **FastAPI:** the Python tool we used to build the service.
- **Feature:** one fact a model looks at.
- **Foreign key:** a link from one table to another.
- **Hash:** a digital fingerprint of some data.
- **Helper:** the role of a community worker who helps families.
- **Idempotency key:** a unique label that stops the same action being applied twice.
- **IndexedDB:** a small database inside the browser.
- **Isotonic regression:** a staircase-shaped curve used to make probabilities honest.
- **JWT:** a signed login ticket.
- **Laplacian:** an image filter that finds edges, used to measure blur.
- **Logistic regression:** a simple scoring model that outputs a probability.
- **Migration:** a numbered database setup file.
- **Mock:** a pretend version of a real service.
- **n-gram:** a piece of text of n letters or words.
- **Offline-first:** works without internet and syncs later.
- **OCR:** reading text from a photo.
- **PGlite:** a Postgres that runs inside a program, used for the local database.
- **PIN:** the 6-digit secret a citizen types to log in.
- **PMT score:** the poverty score from the household survey. Lower means poorer.
- **Postgres:** a popular, reliable SQL database.
- **Precision / recall:** how often a "scam" label is right / how many real scams are caught.
- **Probability:** a number from 0 to 1 for how likely something is.
- **Prototype:** an early working version, not a finished product.
- **PWA:** a website that behaves like an installable app.
- **Rate limit:** a cap on how many requests are allowed per minute.
- **RLS (row-level security):** database rules that decide which rows each user may see or change.
- **Rule set:** one version of the programme rules.
- **Sigmoid:** the S-shaped curve that turns a score into a probability.
- **Supabase:** a hosted Postgres service.
- **Supervised learning:** learning from examples that have the right answers attached.
- **Swagger / OpenAPI:** an automatic, clickable page that documents an API.
- **Synthetic data:** invented data used instead of real data.
- **TF-IDF:** a way to turn text into numbers by weighting rare pieces more than common ones.
- **Trigger (database):** code that runs automatically when a row is added, changed or deleted.
- **Unsupervised learning:** finding patterns in data that has no answers attached (not used here).
- **View (database):** a saved query that behaves like a table.
- **Zone (AUTO / ASK_MORE / HUMAN):** the three possible outcomes of a decision.

---

*End of the manual. Every number in it comes from the project's code, database and test runs.*
