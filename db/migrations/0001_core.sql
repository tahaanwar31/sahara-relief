-- 0001_core.sql : all tables, constraints and indexes. No security yet (that is 0002).
-- Enum values are plain text + CHECK, spelled exactly as in CONTRACT.md section 3.
-- Safe to run more than once.

set search_path = public, extensions;

create schema if not exists extensions;
create schema if not exists app;
create schema if not exists mock;      -- private: only the master key reads this

create extension if not exists pgcrypto with schema extensions;   -- required (hashes, bcrypt)
do $$ begin
  create extension if not exists pg_trgm with schema extensions;          -- optional (fuzzy names)
  create extension if not exists fuzzystrmatch with schema extensions;    -- optional
exception when others then
  raise notice 'pg_trgm / fuzzystrmatch not available: fuzzy matching stays in Python';
end $$;

create table if not exists public.schema_migrations (
  filename   text primary key,
  applied_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- people and households
create table if not exists public.households (
  id          uuid primary key default gen_random_uuid(),
  district    text,
  members     int  check (members is null or members > 0),
  pmt_score   numeric check (pmt_score is null or (pmt_score >= 0 and pmt_score <= 100)),  -- NULL = never surveyed
  flags       jsonb not null default '{}'::jsonb check (jsonb_typeof(flags) = 'object'),
  -- flags keys: gov_employee, owns_vehicle, tax_filer, foreign_trips, high_phone_bill (booleans)
  survey_date date,
  synthetic   boolean not null default true check (synthetic),
  created_at  timestamptz not null default now()
);

create table if not exists public.people (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid,                       -- the login of this person, if they have one
  name_roman       text,
  name_ur          text,
  cnic             text check (cnic is null or cnic ~ '^[0-9]{13}$'),
  cnic_expiry      date,
  dob_raw          text,                       -- as written on the paper, any format
  dob_iso          date,
  dob_precision    text not null default 'day' check (dob_precision in ('day','year','missing')),
  father_or_husband text,
  relation_type    text check (relation_type is null or relation_type in ('S/O','D/O','W/O')),
  relation_late    boolean not null default false,   -- "late" husband / father
  gender           text check (gender is null or gender in ('F','M')),
  district         text,                       -- district written on the application
  district_cnic    text,                       -- district the CNIC implies
  deceased         boolean not null default false,
  household_id     uuid references public.households(id),
  phone_mock       text,
  wallet_name      text,
  bank_name        text,
  source           text not null default 'application',
  record_no        int,                        -- row number in the messy record set
  synthetic        boolean not null default true check (synthetic),   -- the database refuses real people
  created_at       timestamptz not null default now(),
  check (name_roman is not null or name_ur is not null)
);
create index if not exists people_cnic_idx on public.people (cnic);
create index if not exists people_household_idx on public.people (household_id);
create index if not exists people_user_idx on public.people (user_id);
do $$ begin
  create index if not exists people_name_trgm on public.people using gin (name_roman extensions.gin_trgm_ops);
exception when others then raise notice 'skipped trigram index'; end $$;

create table if not exists public.person_links (
  id         uuid primary key default gen_random_uuid(),
  a_id       uuid not null references public.people(id),
  b_id       uuid not null references public.people(id),
  band       text not null check (band in ('SAME','MAYBE','DIFFERENT')),
  score      numeric not null check (score >= 0 and score <= 1),
  evidence   jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  check (a_id <> b_id),
  unique (a_id, b_id)
);

-- ---------------------------------------------------------------- users
create table if not exists public.profiles (
  user_id    uuid primary key,                 -- = auth user id
  full_name  text not null,
  language   text not null default 'ur' check (language in ('ur','en')),
  office     text,                             -- office a citizen belongs to, or an officer works in
  person_id  uuid references public.people(id),
  created_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id    uuid primary key,                 -- one role per user
  role       text not null check (role in ('citizen','helper','admin')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- rules (before decisions)
create table if not exists public.rule_sets (
  id             uuid primary key default gen_random_uuid(),
  version        int  not null unique check (version > 0),
  name           text,
  status         text not null default 'draft' check (status in ('draft','active','retired')),
  params         jsonb not null check (jsonb_typeof(params) = 'object'),
  checksum       text,
  parent_version int,
  created_by     uuid,
  created_at     timestamptz not null default now(),
  effective_from timestamptz,
  effective_to   timestamptz,
  check (effective_to is null or effective_from is null or effective_to >= effective_from)
);
-- Only ONE rule set can be active at any time.
create unique index if not exists rule_sets_one_active on public.rule_sets ((true)) where status = 'active';

create table if not exists public.rules (
  id          uuid primary key default gen_random_uuid(),
  rule_set_id uuid not null references public.rule_sets(id) on delete cascade,
  code        text not null,
  expression  jsonb not null,
  outcome     text not null check (outcome in ('PASS','HOLD','ASK_MORE')),
  reason_code text not null check (reason_code ~ '^R_[A-Z0-9_]+$'),
  reason_en   text not null,
  reason_ur   text not null,
  created_at  timestamptz not null default now(),
  unique (rule_set_id, code)
);

-- ---------------------------------------------------------------- cases
create table if not exists public.cases (
  id                  uuid primary key default gen_random_uuid(),
  owner_user_id       uuid not null,
  helper_user_id      uuid,
  person_id           uuid not null references public.people(id),
  household_id        uuid references public.households(id),
  office              text not null,
  quarter             text not null check (quarter ~ '^[0-9]{4}-Q[1-4]$'),
  status              text not null default 'draft' check (status in
                        ('draft','submitted','awaiting_proof','in_review','approved','rejected','paid','stopped','closed')),
  zone                text check (zone in ('AUTO','ASK_MORE','HUMAN')),
  result              text check (result in ('APPROVE','HOLD','ASK_PROOF','HUMAN_REVIEW','REJECT')),
  amount              int  not null default 0 check (amount >= 0),
  payout_account      text,
  payout_account_title text,
  payout_changed_at   timestamptz,
  draft               jsonb not null default '{}'::jsonb,
  step                int  not null default 0 check (step >= 0),
  resume_code         text check (resume_code is null or resume_code ~ '^[0-9]{6}$'),
  assigned_officer    uuid,
  priority            numeric not null default 0,
  open_flags          int  not null default 0,        -- kept by a trigger: number of open HARD flags
  submitted_at        timestamptz,
  decided_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check ((zone is null) = (result is null))
);
create index if not exists cases_owner_idx   on public.cases (owner_user_id);
create index if not exists cases_person_idx  on public.cases (person_id);
create index if not exists cases_office_idx  on public.cases (office, status);
create index if not exists cases_queue_idx   on public.cases (zone, priority desc);
-- one live claim per person per quarter
create unique index if not exists cases_one_live_per_quarter
  on public.cases (person_id, quarter) where status not in ('closed','stopped','rejected');
create unique index if not exists cases_resume_code_uq on public.cases (resume_code) where resume_code is not null;

create table if not exists public.case_events (
  id       uuid primary key default gen_random_uuid(),
  case_id  uuid not null references public.cases(id),
  kind     text not null check (length(kind) > 0),
  -- kinds in use: created, draft_saved, submitted, assigned, escalated, closed, proof_requested,
  --               officer_decision, stopped, flag_opened, flag_resolved
  actor_id uuid,
  data     jsonb not null default '{}'::jsonb,
  at       timestamptz not null default now()
);
create index if not exists case_events_case_idx on public.case_events (case_id, at);

create table if not exists public.drafts (            -- the save log behind "continue on another phone"
  id              uuid primary key default gen_random_uuid(),
  case_id         uuid not null references public.cases(id),
  owner_user_id   uuid not null,
  step            int  not null,
  data            jsonb not null,
  resume_code     text not null check (resume_code ~ '^[0-9]{6}$'),
  idempotency_key text,
  saved_at        timestamptz not null default now(),
  expires_at      timestamptz not null default now() + interval '14 days'
);
create unique index if not exists drafts_idem_uq on public.drafts (case_id, idempotency_key) where idempotency_key is not null;
create index if not exists drafts_case_idx on public.drafts (case_id, saved_at desc);

create table if not exists public.documents (
  id           uuid primary key default gen_random_uuid(),
  case_id      uuid not null references public.cases(id),
  doc_type     text not null check (doc_type in ('cnic_front','cnic_back','death_certificate','utility_bill','b_form','other')),
  storage_path text not null,
  sha256       text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  signals      jsonb not null default '{}'::jsonb,
  verdict      text check (verdict is null or verdict in ('ok','ask_better_photo','suspicious')),
  uploaded_by  uuid,
  created_at   timestamptz not null default now()
);
create index if not exists documents_case_idx on public.documents (case_id);
create index if not exists documents_sha_idx  on public.documents (sha256);

create table if not exists public.doc_checks (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id),
  check_name  text not null,
  verdict     text not null check (verdict in ('pass','fail','unsure','skip')),
  confidence  numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  detail      jsonb not null default '{}'::jsonb,
  at          timestamptz not null default now()
);

-- ---------------------------------------------------------------- consent
create table if not exists public.consents (
  id           uuid primary key default gen_random_uuid(),
  subject_id   uuid not null,                  -- the person's user
  grantee_type text not null check (grantee_type in ('office','helper','service')),
  grantee_id   text not null,                  -- office code, helper user id, or 'service'
  purpose      text not null check (length(purpose) > 0),
  -- purposes in use: claim_processing (office, service), claim_help (helper), payout, scam_check
  fields       text[] not null default array['*'],      -- '*' = all fields
  status       text not null default 'granted' check (status in ('granted','withdrawn','expired')),
  granted_by   uuid,
  granted_at   timestamptz not null default now(),
  withdrawn_at timestamptz,
  expires_at   timestamptz,
  version      int not null default 1,
  check ((status = 'withdrawn') = (withdrawn_at is not null))
);
create index if not exists consents_lookup_idx on public.consents (subject_id, grantee_id, purpose, status);
-- at most one live consent per subject + grantee + purpose
create unique index if not exists consents_one_live on public.consents (subject_id, grantee_type, grantee_id, purpose) where status = 'granted';

create table if not exists public.consent_events (
  id           uuid primary key default gen_random_uuid(),
  consent_id   uuid not null references public.consents(id),
  kind         text not null check (kind in ('granted','shared','corrected','withdrawn','expired')),
  "by"         uuid,
  receipt_hash text not null,
  at           timestamptz not null default now()
);
create index if not exists consent_events_consent_idx on public.consent_events (consent_id, at);

create table if not exists public.helper_assignments (
  id                 uuid primary key default gen_random_uuid(),
  helper_user_id     uuid not null,
  person_id          uuid not null references public.people(id),
  active             boolean not null default false,       -- true = this family is the open session
  session_started_at timestamptz,
  session_ended_at   timestamptz,
  created_at         timestamptz not null default now(),
  unique (helper_user_id, person_id)
);
-- a helper can have only ONE open family session at a time
create unique index if not exists helper_one_active on public.helper_assignments (helper_user_id) where active;

-- ---------------------------------------------------------------- decisions (never updated)
create table if not exists public.decisions (
  id                  uuid primary key default gen_random_uuid(),
  case_id             uuid not null references public.cases(id),
  created_at          timestamptz not null default clock_timestamp(),   -- exact time, so order inside one transaction is kept
  actor_type          text not null check (actor_type in ('user','ai','job','system')),
  actor_id            uuid,                              -- the officer, for actor_type = 'user'
  zone                text not null check (zone in ('AUTO','ASK_MORE','HUMAN')),
  result              text not null check (result in ('APPROVE','HOLD','ASK_PROOF','HUMAN_REVIEW','REJECT')),
  reason_code         text not null check (reason_code ~ '^R_[A-Z0-9_]+$'),
  confidence          numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  approve_line        numeric,
  reject_line         numeric,
  rule_set_id         uuid not null references public.rule_sets(id),
  rule_version        int  not null,
  rule_checksum       text not null,
  model_version       text,
  checks              jsonb not null default '[]'::jsonb,
  explain_citizen     jsonb not null default '{}'::jsonb,
  trace               jsonb not null default '[]'::jsonb,
  next_step           jsonb,
  input_snapshot      jsonb,
  input_hash          text,
  consent_snapshot_id uuid references public.consents(id),
  costs_used          jsonb,
  note                text,
  check (actor_type <> 'user' or actor_id is not null),
  check (zone <> 'AUTO' or result in ('APPROVE','REJECT')),
  check (zone <> 'ASK_MORE' or result in ('ASK_PROOF','HOLD'))
);
create index if not exists decisions_case_idx on public.decisions (case_id, created_at desc);

create table if not exists public.case_notes (          -- the "I am not sure" package
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references public.cases(id),
  decision_id uuid references public.decisions(id),
  package     jsonb not null,
  created_at  timestamptz not null default now()
);
create index if not exists case_notes_case_idx on public.case_notes (case_id);

-- A "hard flag" stops approval until an officer resolves it (see 0005).
create table if not exists public.case_flags (
  id              uuid primary key default gen_random_uuid(),
  case_id         uuid not null references public.cases(id),
  kind            text not null,       -- scam, forgery, duplicate_identity, payout_account, other
  severity        text not null default 'hard' check (severity in ('hard','soft')),
  status          text not null default 'open' check (status in ('open','resolved')),
  note            text,
  opened_by       uuid,
  opened_at       timestamptz not null default now(),
  resolved_by     uuid,
  resolved_at     timestamptz,
  resolution_note text,
  check ((status = 'resolved') = (resolved_at is not null))
);
create index if not exists case_flags_case_idx on public.case_flags (case_id, status);

-- ---------------------------------------------------------------- keys, diary, scams, eval, data quality
create table if not exists public.api_keys (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  key_hash           text not null unique,          -- sha256 hex of the key. The key itself is never stored.
  scopes             text[] not null default '{}',
  rate_limit_per_min int not null default 60 check (rate_limit_per_min > 0),
  revoked            boolean not null default false,
  revoked_at         timestamptz,
  created_by         uuid,
  created_at         timestamptz not null default now(),
  last_used_at       timestamptz
);

create sequence if not exists public.audit_log_id_seq;
create table if not exists public.audit_log (         -- the diary. id is bigint so the order is the chain order.
  id            bigint primary key,
  ts            timestamptz not null default clock_timestamp(),
  actor_id      uuid,
  actor_type    text not null check (actor_type in ('user','ai','job','system')),
  actor_role    text,
  action        text not null,
  entity_type   text,
  entity_id     uuid,
  input_hash    text,
  rule_version  int,
  model_version text,
  confidence    numeric,
  result        text,
  details       jsonb not null default '{}'::jsonb,
  prev_hash     text not null,
  hash          text not null unique
);
create index if not exists audit_entity_idx on public.audit_log (entity_type, entity_id);
create index if not exists audit_actor_idx  on public.audit_log (actor_id);
create index if not exists audit_subject_idx on public.audit_log ((details->>'subject_id'));

create table if not exists public.scam_reports (
  id          uuid primary key default gen_random_uuid(),
  text        text not null,
  sender      text,
  label       text not null check (label in ('safe','suspicious','scam')),
  score       numeric check (score is null or (score >= 0 and score <= 1)),
  reasons     jsonb not null default '[]'::jsonb,
  district    text,
  language    text,
  source      text not null default 'user',
  reported_by uuid,
  created_at  timestamptz not null default now()
);

create table if not exists public.eval_runs (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  triggered_by uuid,
  rule_set_id uuid references public.rule_sets(id),
  model_version text,
  metrics     jsonb not null default '{}'::jsonb
);
create table if not exists public.eval_cases (
  id        uuid primary key default gen_random_uuid(),
  run_id    uuid not null references public.eval_runs(id) on delete cascade,
  case_id   uuid references public.cases(id),
  case_text text,
  truth     text,
  predicted text,
  zone      text check (zone is null or zone in ('AUTO','ASK_MORE','HUMAN')),
  correct   boolean,
  cost      numeric
);
create index if not exists eval_cases_run_idx on public.eval_cases (run_id);

-- The labelled history used by the Digital Twin and the evaluation.
create table if not exists public.labelled_cases (
  id         uuid primary key default gen_random_uuid(),
  case_id    uuid not null unique references public.cases(id),
  category   text not null check (category in ('clearly_eligible','clearly_ineligible','borderline','bad_data','scam')),
  truth      text not null check (truth in ('eligible','ineligible')),
  facts      jsonb not null,               -- the "facts" object of CONTRACT section 6
  outcome    text not null,                -- what really happened: paid, rejected, stopped ...
  notes      text
);

create table if not exists public.data_quality_queue (
  id          uuid primary key default gen_random_uuid(),
  entity      text not null,
  entity_id   uuid,
  problem     text not null,
  reason_code text check (reason_code is null or reason_code ~ '^R_[A-Z0-9_]+$'),
  status      text not null default 'open' check (status in ('open','fixed','ignored')),
  created_at  timestamptz not null default now(),
  resolved_by uuid,
  resolved_at timestamptz,
  note        text
);

-- ---------------------------------------------------------------- mock services (private schema)
create table if not exists mock.nadra (
  cnic          text primary key check (cnic ~ '^[0-9]{13}$'),
  name_roman    text not null,
  name_ur       text,
  father_or_husband text,
  dob_iso       date,
  gender        text check (gender in ('F','M')),
  district      text,
  expiry        date,
  status        text not null check (status in ('valid','expired','deceased','superseded','blocked')),
  phone_mock    text,
  photo         bytea      -- the photo in the (mock) government record; only some demo people have one
);
create table if not exists mock.nser (
  household_id uuid primary key,
  pmt_score    numeric,
  members      int,
  flags        jsonb not null default '{}'::jsonb,
  survey_date  date,
  district     text
);
create table if not exists mock.raast_accounts (
  account_id        text primary key,           -- wallet number or account id
  title             text not null,              -- the name the bank holds
  owner_cnic        text,
  owner_user_id     uuid,                       -- set when the owner is a helper
  kind              text not null check (kind in ('wallet','bank')),
  bank_name         text,
  registered_phone  text,
  created_at        timestamptz not null default now(),
  changed_at        timestamptz,                -- last time the account on a claim was changed
  status            text not null default 'active' check (status in ('active','frozen','closed'))
);
create table if not exists mock.raast_payments (
  id         uuid primary key default gen_random_uuid(),
  case_id    uuid not null,
  account_id text not null references mock.raast_accounts(account_id),
  amount     int  not null check (amount > 0),
  status     text not null check (status in ('queued','pending','settled','stopped','failed')),
  reference  text,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);
create index if not exists raast_payments_case_idx on mock.raast_payments (case_id);

