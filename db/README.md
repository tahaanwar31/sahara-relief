# db/ : the database layer (owner P1)

Plain SQL files, a seed, and tests. The same migration files run on Supabase and on local Postgres.
Everything is synthetic.

## What is here

| Path | What |
|---|---|
| `migrations/0001_core.sql` | all tables, constraints, indexes, schema `mock` |
| `migrations/0002_rls.sql` | `app.*` identity helpers and the row locks (RLS) for every table |
| `migrations/0003_audit.sql` | the hash-chained diary, its triggers, `app.verify_audit_chain()` |
| `migrations/0004_rules_consent.sql` | rule versions + activation, immutable decisions, consent take-back |
| `migrations/0005_case_safety.sql` | status moves, separation of duties, hard flags, mass-assignment guards, helper sessions, drafts |
| `migrations/0006_function_grants.sql` | who may call which function |
| `local/00_supabase_shim.sql`, `local/01_local_auth.sql` | local mode only: roles, `auth.uid()`, local login |
| `seed/build_seed.mjs` -> `seed/seed.sql` | deterministic, re-runnable mock data |
| `seed/test_users.json` | the 7 test users with their fixed ids |
| `tests/` | Node test suite on in-memory PGlite (53 tests) |
| `apply_migrations.py` | applies the files with psycopg, records them in `schema_migrations` |

## Run it locally

```
node scripts/local_pg.mjs                      # starts Postgres on 127.0.0.1:5433 (PGlite, persistent in ./.local-pg)
.venv\Scripts\python db\apply_migrations.py --local --seed --dsn postgresql://postgres:postgres@127.0.0.1:5433/postgres
```

Run it again any time: files already applied are skipped; the seed changes nothing the second time.
To rebuild the seed after editing the script: `node db/seed/build_seed.mjs`.

## Run the tests (one command, from the repo root)

```
node --test "db/tests/*.test.mjs"
```

(or `cd db && npm test`). No installs are needed: the tests import PGlite from `scripts/node_modules`.
Each test file builds a fresh in-memory database (shim, migrations, seed) in about 5 seconds and runs every check
inside a transaction that is rolled back.

## How the service must talk to the database

For anything a person does, run **as that person**, inside one transaction:

```sql
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"<user uuid>","role":"authenticated"}', true);
-- ... your queries ...
```

Only `sub` is used. The role (citizen, helper, admin) is read from table `user_roles` by
`app.current_role()`, so a token that claims a role means nothing. For the master connection (jobs, AI engine, payments)
use no role switch and tell the diary who is acting:

```sql
SELECT set_config('app.actor_type', 'ai', true);      -- 'ai' | 'job' | 'system'
SELECT set_config('app.actor_name', 'engine', true);
```

Things the service should know:

* Write the **decision row first**, then move the case status. `approved`/`rejected` is accepted only when the newest decision says APPROVE/REJECT.
* A decision's `rule_set_id` may be left out (the active one is used); `rule_version`, `rule_checksum` and `input_hash` are filled by the database.
* Helper session: `select app.helper_start_session(person_id)` / `app.helper_end_session()`. Missing consent raises SQLSTATE `SR403` with a message starting `CONSENT_REQUIRED`. Other refusals are `42501` (message starts `FORBIDDEN` or says what is not allowed).
* Take back consent: `select app.withdraw_consent(consent_id)` returns the receipt hash. It stops pending cases, stops queued mock payments, closes helper sessions and queues a purge row in `data_quality_queue`.
* Drafts: `select app.save_draft(case_id, step, draft, idempotency_key)` returns `{saved_at, resume_code, repeat}`; `select * from app.resume_draft(code)`. Runs as the caller, so the case locks decide.
* Rules: `app.create_rule_set(params, rules, parent_version, name)`, `app.validate_rule_set(id)` (list of problems), `app.activate_rule_set(id)`. Rules inside an expression may only use the variables in CONTRACT section 6; numbers such as the cutoff are written into the expressions (the rules do not read `params`).
* Diary: `app.verify_audit_chain()` (first broken id or NULL), `app.audit_head()` (latest hash), `app.log_access(entity_type, entity_id, purpose, subject_user_id)` to record that someone looked at personal data (feeds "who has seen my data").
* Local login: `select app.local_login(email, secret)` returns the user id or NULL (5 wrong tries lock the account for 30 s). Master connection only.
* Seed facts: see the section below.

## Seed facts

* Test users and fixed ids: `seed/test_users.json` (ids `a0000000-0000-4000-8000-00000000000N`, N = 1..7). Passwords are those in CONTRACT section 2 (stored as bcrypt in `local_users`).
* Rule set v1 is `active` (cutoff 30, amount 13500, band 5, cap 29000, second approver over 20000, auto reject off, costs 100/20/3/1) with 9 rules; v2 is a `draft` (cutoff 25, amount 14500).
* 30 messy people (`people.record_no` 1..30; 29 and 30 are deceased extras), 11 `person_links`, Zainab's CNIC `4130190000112` appears under 3 spellings. Zainab's draft case has resume code `482913` and Yousuf's helper link.
* Yousuf serves 40 families (`helper_assignments`, all inactive). Three of them (not Zainab) have no helper consent, to test refusal.
* 151 cases: 120 history cases in 2026-Q1..Q3 (labelled in `labelled_cases` with a ready-made `facts` object), the rest in 2026-Q4. Offices: mostly `KHI-EAST`, some `KHI-WEST`, `LHR-CENTRAL`, `ISB-CENTRAL` (to test office isolation).
* Open hard flags exist on a duplicate-identity case, a wallet-in-brother's-name case and the helper-owned / shared-account cases.
* `mock.nadra`, `mock.nser`, `mock.raast_accounts` (one helper-owned account, two shared accounts), `mock.raast_payments`. Readable only by the master connection / `service_role`.
* 40 `scam_reports`, 2 `api_keys` (hash only; the synthetic demo key text is `sahara_demo_key_0001`).

## Move to Supabase

1. Create the project. Check that `pgcrypto` is available (the migrations need it; `pg_trgm` and `fuzzystrmatch` are optional and skipped with a notice if missing).
2. Run `python db/apply_migrations.py --dsn <direct connection string>` WITHOUT `--local` (Supabase already has `auth.uid()` and the roles).
3. Create the 7 users in Supabase Auth with the same UUIDs as `seed/test_users.json`, then run the seed (`--seed`; the local_users part is skipped automatically when that table is absent).
4. The service connects with the `postgres` user and switches with `SET LOCAL ROLE authenticated`.

## Honest limits

* **Verified only on PGlite** (Postgres 18 in WebAssembly): every migration, policy, trigger and test above. `SET ROLE authenticated` from the connecting user, the `postgres` role's rights, `service_role` bypassing RLS, default privileges, and the pgcrypto/pg_trgm extensions on Supabase are **assumed, not verified**. PGlite's `postgres` is a true superuser; on Supabase it is not, but it owns the tables, which is what the migrations rely on.
* PGlite serves **one connection at a time**: keep the service's pool at size 1-2 locally, and do not use concurrent transactions in tests.
* The diary is tamper-evident, not tamper-proof. A full database administrator can switch triggers off (`session_replication_role = replica`, `ALTER TABLE ... DISABLE TRIGGER`) and rewrite the whole chain, and deleting the newest rows cannot be seen from inside. The tests show a simulated tamper being detected. Mitigation: copy `app.audit_head()` somewhere outside (slide, Diary screen).
* Admins read people through the view `people_masked` (CNIC middle hidden), not the base table.
* An officer sees a case only while the citizen's office consent is active; after take-back the case disappears for them, even to see that it was stopped.
* Data purge after withdrawal is only queued (a row in `data_quality_queue`); no job deletes anything yet.
* Resume codes are 6 digits: the case locks stop strangers, but the service should still rate-limit `resume_draft`.
