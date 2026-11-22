# CONTRACT: the shared agreement between database, service and web app

Project: **Sahara Relief Platform** (Coder's Cup '26). Prototype. All data is synthetic.
Written at the start of the build window. Change this file only when all owners agree.

## 0. How the parts fit

```
 web/  (React + TypeScript, installable offline web app)
   │   talks ONLY to the service, by REST (JSON), with a login token
   ▼
 service/  (Python, FastAPI)  ── decisions, rules, AI checks, mock services, all APIs, Swagger at /docs
   │   connects to Postgres with psycopg
   │   for user-driven reads/writes it runs as the user:  SET LOCAL ROLE authenticated + the user's token claims
   ▼          (so the database row locks protect the data, even if our code has a bug)
 db/  (Postgres: Supabase in the cloud, plain Postgres locally. Same migration files for both.)
```

Decisions that came out of the build, all agreed by the team lead:

1. **The web app talks only to the service.** It never calls Supabase directly. One API, one login, one place to test. Same code path locally and in the cloud.
2. **Live updates are done by polling every 10 seconds** (server-sent events are optional). Supabase Realtime is not used.
3. **Two auth modes**, chosen by `AUTH_MODE`:
   - `supabase`: `POST /auth/login` signs in through Supabase Auth and returns the Supabase token.
   - `local`: `POST /auth/login` checks the seeded users table and signs a token with `JWT_SECRET` (HS256). Same claims shape. This is the default for development and the demo fallback if Supabase or the internet is down.
4. **Roles are read from the database table `user_roles`** through the function `app.current_role()`. They are never trusted from the token alone.
5. **The master key** (`SUPABASE_SERVICE_KEY` / the superuser connection) is used in ONE module only (`service/app/service_writes.py`) with a short allow-list of functions. It never reaches the web app, Git or logs.

## 1. Folder layout (who owns what)

```
sahara-relief/
  CONTRACT.md  README.md  .env.example  .gitignore
  shared/reasons.json            reason codes with English + Urdu text   (owner: service, used by web)
  db/                            OWNER: P1 (database)
    migrations/0001_core.sql 0002_rls.sql 0003_audit.sql 0004_rules_consent.sql ...
    local/00_supabase_shim.sql   roles + auth.uid() shim for plain Postgres
    seed/seed.sql  (or seed.py)  mock data, 5 test users, 28 messy people, rule set v1
    tests/                       SQL/permission tests
    apply_migrations.py          runs migrations in order, records them in schema_migrations
  service/                       OWNER: P2 (Python service)
    app/ (main.py, config.py, auth.py, db.py, deps.py, errors.py, service_writes.py,
          routers/, engine/, identity/, docs/, scam/, mock/, audit/, eval/)
    tests/  requirements.txt  Dockerfile
  web/                           OWNER: P3 (frontend)
    src/ (api/, auth/, i18n/, offline/, audio/, pages/, components/)  public/  package.json
  scripts/                       OWNER: P4 (dev, reset_demo, make_audio, docker-compose.yml)
```

## 2. Roles and test users (all synthetic)

Roles: `citizen` (shown as Person), `helper`, `admin`. The admin also reviews cases (own office, with consent).

| Login (email) | Secret | Role | Notes |
|---|---|---|---|
| zainab@citizens.sahara.test | 246810 | citizen | the widow; cannot read; has 3 spellings of her name |
| yousuf@helpers.sahara.test | 246810 | helper | serves 40 families; shared phone |
| asim@citizens.sahara.test | 246810 | citizen | the shopkeeper (scam messages) |
| admin@gov.sahara.test | Admin#2026 | admin | |

Citizens and helpers use a 6-digit PIN as the secret (a simulation of CNIC + biometric login).

## 3. Enums (exact spelling, used by all three parts)

| Name | Values |
|---|---|
| `zone` | `AUTO`, `ASK_MORE`, `HUMAN` |
| `result` | `APPROVE`, `HOLD`, `ASK_PROOF`, `HUMAN_REVIEW`, `REJECT` |
| `case_status` | `draft`, `submitted`, `awaiting_proof`, `in_review`, `approved`, `rejected`, `paid`, `stopped`, `closed` |
| `actor_type` | `user`, `ai`, `job`, `system` |
| `consent_status` | `granted`, `withdrawn`, `expired` |
| `rule_status` | `draft`, `active`, `retired` |
| `rule_outcome` | `PASS`, `HOLD`, `ASK_MORE` |
| `match_band` | `SAME`, `MAYBE`, `DIFFERENT` |
| `check_verdict` | `pass`, `fail`, `unsure`, `skip` |
| `scam_label` | `safe`, `suspicious`, `scam` |
| `doc_type` | `cnic_front`, `cnic_back`, `death_certificate`, `utility_bill`, `b_form`, `other` |

## 4. Database (names and key columns; P1 owns the exact SQL)

All primary keys are `uuid` (`gen_random_uuid()`), all timestamps are `timestamptz`, every person row has `synthetic boolean default true`.

| Table | Key columns |
|---|---|
| `profiles` | `user_id` (= auth user id), `full_name`, `language` (`ur`/`en`), `office`, `person_id` |
| `user_roles` | `user_id`, `role` |
| `people` | `id`, `name_roman`, `name_ur`, `cnic` (13 digits, text), `cnic_expiry`, `dob_raw`, `dob_iso`, `father_or_husband`, `gender`, `district`, `deceased bool`, `household_id`, `synthetic` |
| `person_links` | `a_id`, `b_id`, `band`, `score`, `evidence jsonb` |
| `households` | `id`, `district`, `members int`, `pmt_score numeric null`, `flags jsonb` (`gov_employee`, `owns_vehicle`, `tax_filer`, `foreign_trips`, `high_phone_bill`) |
| `cases` | `id`, `owner_user_id`, `helper_user_id null`, `person_id`, `household_id`, `office`, `quarter` (e.g. `2026-Q4`), `status`, `zone null`, `result null`, `amount int`, `payout_account text`, `payout_account_title text`, `draft jsonb`, `step int`, `resume_code text`, `assigned_officer null`, `priority numeric`, `created_at`, `updated_at` |
| `case_events` | `id`, `case_id`, `kind` (`created`, `submitted`, `assigned`, `escalated`, `closed`, `proof_requested`, `officer_decision`...), `actor_id`, `data jsonb`, `at` |
| `documents` | `id`, `case_id`, `doc_type`, `storage_path`, `sha256`, `signals jsonb`, `verdict`, `uploaded_by` |
| `decisions` | see section 6 (never updated) |
| `case_notes` | `id`, `case_id`, `decision_id`, `package jsonb` (the "I am not sure" notes), `created_at` |
| `rule_sets` | `id`, `version int`, `status`, `params jsonb`, `checksum`, `parent_version`, `created_by`, `created_at`, `effective_from`, `effective_to` |
| `rules` | `id`, `rule_set_id`, `code`, `expression jsonb`, `outcome`, `reason_code`, `reason_en`, `reason_ur` |
| `consents` | `id`, `subject_id` (person's user), `grantee_type` (`office`, `helper`, `service`), `grantee_id`, `purpose`, `fields text[]`, `status`, `granted_at`, `withdrawn_at`, `expires_at`, `version` |
| `consent_events` | `id`, `consent_id`, `kind` (`granted`, `shared`, `corrected`, `withdrawn`, `expired`), `by`, `receipt_hash`, `at` |
| `helper_assignments` | `id`, `helper_user_id`, `person_id`, `active bool`, `session_started_at` |
| `api_keys` | `id`, `name`, `key_hash`, `scopes text[]`, `rate_limit_per_min`, `revoked bool`, `created_by` |
| `audit_log` | `id`, `ts`, `actor_id`, `actor_type`, `actor_role`, `action`, `entity_type`, `entity_id`, `input_hash`, `rule_version`, `model_version`, `confidence`, `result`, `details jsonb`, `prev_hash`, `hash` |
| `scam_reports` | `id`, `text`, `sender`, `label`, `score`, `reasons jsonb`, `district`, `created_at` |
| `eval_runs`, `eval_cases` | run id, metrics jsonb, case text, truth, predicted, zone, correct, cost |
| `data_quality_queue` | `id`, `entity`, `entity_id`, `problem`, `reason_code`, `created_at` |
| `mock_nadra`, `mock_nser`, `mock_raast_accounts`, `mock_raast_payments` | in schema `mock` (private; only the service reads them) |
| `schema_migrations` | `filename`, `applied_at` |

**Helper functions in schema `app`:** `app.current_user_id()`, `app.current_role()`, `app.current_office()`, `app.has_consent(grantee, subject, purpose, field)`, `app.is_active_family(person_id)`, `app.verify_audit_chain()` (returns first broken row or null).

**Row-lock (RLS) summary** (full table is in Build Plan section 8): citizen sees only own rows; helper sees only the family in the active session and only with that family's consent; officer sees only own-office cases and only when consent is active; admin edits rules and reads all but cannot decide cases; admin sees people only through a masked view. A user cannot approve their own case or one they helped with. A citizen cannot change their own role.

**Diary rules:** triggers write an `audit_log` row for every insert/update/delete on `cases`, `decisions`, `consents`, `documents`, `rule_sets`, `rules`, `api_keys`, `helper_assignments`. A trigger fills `prev_hash` and `hash = sha256(prev_hash || canonical_row_text)` under a lock. UPDATE and DELETE on `audit_log` are refused for everyone, including the master key.

**Local mode:** `db/local/00_supabase_shim.sql` creates roles `anon`, `authenticated`, `service_role` and schema `auth` with `auth.uid()`, `auth.role()`, `auth.jwt()` reading `current_setting('request.jwt.claims', true)`. This is exactly how Supabase works, so the migrations run unchanged on both.

## 5. Reason codes

Defined once in `shared/reasons.json` (id, zone hint, `en`, `ur`). The service returns codes; the web app shows the text and plays the audio for that code. The Urdu text is a draft and needs a native-speaker check.

## 6. The rule set (what an admin edits)

`rule_sets.params`:

```json
{
  "programme": "Sahara Relief Programme (MOCK)",
  "cutoff": 30,
  "borderline_band": 5,
  "amount": 13500,
  "payout_cap": 29000,
  "auto_reject_enabled": false,
  "second_approver_over": 20000,
  "costs": { "wrong_approve": 100, "wrong_reject": 20, "review": 3, "proof": 1 }
}
```

`rules` rows: each has `code`, `expression` (a small json-logic subset: `var`, `==`, `!=`, `<`, `<=`, `>`, `>=`, `and`, `or`, `!`, `in`, `missing`), `outcome` (`PASS`/`HOLD`/`ASK_MORE`) and `reason_code`. An expression that is TRUE means the rule FIRES with its outcome. Variables available (the "facts" object):

```
person.gender  person.cnic_valid  person.cnic_expired  person.deceased  person.age
household.pmt_score (may be null)  household.members
household.flags.gov_employee  .owns_vehicle  .tax_filer  .foreign_trips  .high_phone_bill
payout.shared_with_other_households  payout.changed_within_days  payout.owner_is_helper
doc.required_missing  doc.any_blurry  doc.any_edited  doc.min_confidence
identity.band  identity.score  claim.amount
```

Rule set v1 (seed): cutoff 30, amount 13500. Rule set v2 (for the demo edit): cutoff 25, amount 14500. Rules are immutable once saved; an edit creates a new draft version; activation sets the old version's `effective_to` and the new one's `effective_from` in one step. Every decision stores `rule_set_id`, `rule_version`, `rule_checksum`.

## 7. The decision card (response of `POST /cases/{id}/decide` and what the web app shows)

```json
{
  "decision_id": "uuid",
  "case_id": "uuid",
  "created_at": "2026-11-21T10:15:00Z",
  "actor_type": "ai",
  "zone": "HUMAN",
  "result": "HUMAN_REVIEW",
  "reason_code": "R_NAME_AMBIGUOUS",
  "confidence": 0.62,
  "p_eligible": 0.62,
  "rule_version": 1,
  "rule_checksum": "sha256-...",
  "model_version": "logreg-2026-11-21",
  "checks": [
    {"name": "consent", "verdict": "pass", "confidence": 1.0, "detail": "active consent #12"},
    {"name": "identity_match", "verdict": "unsure", "confidence": 0.62, "detail": "band MAYBE", "reason_code": "R_NAME_AMBIGUOUS"}
  ],
  "explain_citizen": { "en": "The name matches more than one record. A staff member will check.", "ur": "..." },
  "trace": [ {"step": 1, "what": "hard_rule", "rule": "NO_CONSENT", "fired": false}, "..." ],
  "next_step": { "type": "human", "doc_type": null },
  "case_notes_id": "uuid or null",
  "costs_used": { "wrong_approve": 100, "wrong_reject": 20, "review": 3, "proof": 1 },
  "approve_line": 0.97,
  "reject_line": 0.15
}
```

Rules for the engine: **hard rules run first and beat any score** (no consent, invalid CNIC, expired CNIC, deceased, duplicate identity, payout over cap, payout account shared/changed/helper-owned, scam or forgery flag, any two checks disagree, too many missing fields). `AUTO` + `APPROVE` only when `p_eligible >= approve_line` AND no hard rule fired AND no check says `unsure`/`fail`. `approve_line = 1 - review/wrong_approve`. `reject_line = review/wrong_reject`, but **auto-reject is OFF unless `auto_reject_enabled`**: below `reject_line` the case goes to `HUMAN` with reason `R_LIKELY_NOT_ELIGIBLE`. Every decision has a zone, a result and a reason code; never empty. An officer's choice creates a NEW decision row with `actor_type='user'`; decisions are never edited.

## 8. API (all JSON; the web app uses only these)

Errors always look like:

```json
{ "error": { "code": "FORBIDDEN", "message": "You are not allowed to do this.", "message_ur": "...", "details": {}, "request_id": "..." } }
```

Codes: `UNAUTHENTICATED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `VALIDATION` 422, `CONFLICT` 409, `RATE_LIMITED` 429, `CONSENT_REQUIRED` 403, `INTERNAL` 500 (no stack traces, ever).

Auth: `Authorization: Bearer <token>` for people; `X-API-Key: <key>` for `/public/v1/*`.

**P0 (the vertical slice, build first)**

| Method + path | Who | What |
|---|---|---|
| `POST /auth/login` | anyone | `{email, secret}` -> `{access_token, expires_in, user:{id, role, name, language, office}}` |
| `GET /me` | any | the logged-in user |
| `POST /cases` | citizen, helper | start a claim draft; helper sends `person_id` of the active family |
| `GET /cases`, `GET /cases/{id}` | role-scoped | list / detail |
| `PUT /cases/{id}/draft` | owner, helper | save progress `{step, draft}`; returns `resume_code` |
| `GET /drafts/resume/{code}` | anyone with code | continue on another phone |
| `POST /cases/{id}/documents` | owner, helper | multipart upload; runs document analysis; returns signals + verdict |
| `POST /cases/{id}/submit` | owner, helper | runs the decision; returns the decision card |
| `POST /cases/{id}/decide` | officer, admin | re-run the engine (new decision row) |
| `GET /cases/{id}/decisions` | scoped | decisions newest first |
| `GET /queue` | officer | cases in `HUMAN` zone sorted by priority then lowest confidence |
| `POST /cases/{id}/officer-decision` | officer | `{decision: approve|reject|ask_more|hold, note}`; second approver needed above `second_approver_over` |
| `GET /consents`, `POST /consents`, `POST /consents/{id}/withdraw` | citizen (own), helper (per family) | consent list / grant / take back |
| `GET /audit`, `GET /audit/verify`, `GET /audit/mine` | admin / admin / any | diary |
| `GET /rule-sets`, `GET /rule-sets/{id}`, `POST /rule-sets` (new draft), `POST /rules/validate`, `POST /rules/activate` | admin (read: officer) | rule versions |
| `GET /healthz`, `GET /docs` | anyone | health, Swagger |

**P1 (next)**

`POST /identity/match`, `POST /docs/analyze`, `POST /scam/check` (any logged-in user), `POST /scam/report`, `POST /rules/twin` (Digital Twin: replay stored cases under a draft rule set), `GET /policy/cost-curve?wrong_approve=&wrong_reject=&review=` (preview only), `POST /eval/run`, `GET /eval/latest`, `GET /analytics/summary`, `GET /helper/families`, `POST /helper/session` (`{person_id}` to start, `{person_id: null}` to end), `GET /data-access-log` (who has seen my data), `POST /cases/{id}/assign`, `POST /cases/{id}/escalate`, `POST /cases/{id}/close`, `GET /cases/{id}/events`, `GET /cases/{id}/notes`.

**P2 (if time)**

`GET|POST|DELETE /api-keys` (admin), `GET /public/v1/cases/{id}/status`, `POST /public/v1/scam/check`, `POST /public/v1/eligibility/precheck` (API key + rate limit), `GET|POST /users` (admin; a request body may never set `role` on self), `GET /metrics`, mock services: `GET /mock/nadra/{cnic}`, `GET /mock/nser/{household_id}`, `POST /mock/raast/verify`, `POST /mock/raast/release`.

### Key request/response shapes

`POST /identity/match`
```json
{ "a": {"name":"Muhammad Aslam","father":"Abdul Rehman","cnic":"4210112345671","dob":"1978-03-02","district":"Karachi East"},
  "b": {"name":"Mohd Aslam","father":"Abd ur Rehman","cnic":null,"dob":"02/03/1978","district":"Karachi East"} }
```
-> `{ "band":"MAYBE|SAME|DIFFERENT", "score":0.0-1.0, "evidence":[{"field":"name","a":"..","b":"..","agree":"yes|no|missing|close","weight":0.4}], "reason_code":"R_NAME_AMBIGUOUS|null" }`. Never auto-merge on name alone. Always normalise (Muhammad/Mohammad/Muhammed/Mohd/Mohamed -> one form) before scoring.

`POST /docs/analyze` (multipart `file`, `doc_type`) -> `{ "signals": {"blur_score":0-1,"is_blurry":false,"qr":{"found":false,"payload":null,"valid":null},"cnic_numbers":["..."],"duplicate_of":null,"edit_signs":[],"confidence":0-1}, "verdict":"ok|ask_better_photo|suspicious" }`. Signals, not a final verdict. Low confidence means ask for another photo, never guess.

`POST /scam/check` `{ "text":"...", "sender":"..." }` -> `{ "label":"safe|suspicious|scam", "score":0-1, "reasons":[{"code":"ASKS_FEE","en":"...","ur":"..."}], "advice":{"en":"...","ur":"..."} }`. The genuine mock sender code is `9171`. Warn or quarantine; never block silently.

`POST /rules/twin` `{ "rule_set_id": "draft id", "limit": 500 }` -> `{ "cases": 123, "changed": 17, "moves": {"AUTO->HUMAN": 10, "HUMAN->AUTO": 3, "...": 4}, "approvals_changed": 7, "cost_before": 0, "cost_after": 0, "examples": [ ... ] }`. Preview only.

`PUT /cases/{id}/draft` `{ "step": 4, "draft": { ... } }` -> `{ "saved_at": "...", "resume_code": "482913" }`. Safe to call again with the same `Idempotency-Key` header (offline outbox). Reusing a key returns the first result.

## 9. Environment variables (`.env.example` lists them)

`AUTH_MODE` (`local` | `supabase`), `DATABASE_URL` (Postgres connection string), `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` (server only), `SUPABASE_JWT_SECRET`, `STORAGE_MODE` (`local` | `supabase`), `LLM_PROVIDER` (`none` | `claude` | `ollama`, default `none`), `CORS_ORIGINS`, `RATE_LIMIT_PER_MIN`.

## 10. Rules of the road

- Everything is mock and synthetic. A visible **SYNTHETIC / PROTOTYPE** banner is on every screen.
- Server-side checks only count. The web app may hide screens, but the service and the database must refuse.
- The AI never decides alone about money. A model score is one input; hard rules win; low confidence goes to a human with notes.
- The language model, if any, is optional. Every feature has a non-LLM path and the product works with no internet.
- No secrets in Git. The master key never goes to the browser.
- Every change to the database is a numbered file in `db/migrations/`. No clicking in dashboards.
- Small commits. `main` always runs.
