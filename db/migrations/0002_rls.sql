-- 0002_rls.sql : who we are (helper functions) and the row locks (row-level security).
-- Roles come from table user_roles, NEVER from the token alone. The token only says who you are (sub).
-- Safe to run more than once.

set search_path = public, extensions;

-- ------------------------------------------------------------------ identity helpers (schema app)
-- All of these are SECURITY DEFINER with a fixed search_path so they read the base tables without
-- being blocked by (or looping through) the row locks themselves.

create or replace function app.current_user_id() returns uuid
language sql stable
as $$ select auth.uid() $$;

create or replace function app.current_role() returns text
language sql stable security definer set search_path = public, pg_temp
as $$ select r.role from public.user_roles r where r.user_id = auth.uid() $$;

create or replace function app.current_office() returns text
language sql stable security definer set search_path = public, pg_temp
as $$ select p.office from public.profiles p where p.user_id = auth.uid() $$;

create or replace function app.current_person_id() returns uuid
language sql stable security definer set search_path = public, pg_temp
as $$ select p.person_id from public.profiles p where p.user_id = auth.uid() $$;

create or replace function app.person_user(pid uuid) returns uuid          -- the login of a person
language sql stable security definer set search_path = public, pg_temp
as $$ select p.user_id from public.people p where p.id = pid $$;

create or replace function app.person_of_user(uid uuid) returns uuid       -- the person of a login
language sql stable security definer set search_path = public, pg_temp
as $$ select p.person_id from public.profiles p where p.user_id = uid $$;

-- Is there an ACTIVE consent? grantee = office code, helper user id (text) or 'service'.
-- field NULL = "any field". A consent for '*' covers every field.
create or replace function app.has_consent(grantee text, subject uuid, purpose text, field text default null)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.consents c
     where c.subject_id = subject
       and c.grantee_id = grantee
       and c.status = 'granted'
       and (c.expires_at is null or c.expires_at > now())
       and (purpose is null or c.purpose = purpose)
       and (field is null or c.fields @> array[field] or c.fields @> array['*'])
  )
$$;

-- Is this person (or someone in the same household) the family the calling helper has open right now?
create or replace function app.is_active_family(pid uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.helper_assignments a
      join public.people ap on ap.id = a.person_id
      join public.people p  on p.id = pid
     where a.helper_user_id = auth.uid()
       and a.active
       and (a.person_id = pid
            or (ap.household_id is not null and ap.household_id = p.household_id))
  )
$$;

-- Helper may see this person: role helper + open session on the family + that family's consent.
create or replace function app.helper_can_see_person(pid uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select app.current_role() = 'helper' and exists (
    select 1
      from public.helper_assignments a
      join public.people ap on ap.id = a.person_id
      join public.people p  on p.id = pid
     where a.helper_user_id = auth.uid()
       and a.active
       and (a.person_id = pid
            or (ap.household_id is not null and ap.household_id = p.household_id))
       and app.has_consent(auth.uid()::text, ap.user_id, 'claim_help', null)
  )
$$;

-- Officer may see a case: same office, not a draft, and the citizen's consent for this office is active.
create or replace function app.officer_sees_case(c_owner uuid, c_office text, c_status text) returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select app.current_role() = 'admin'
     and c_office = app.current_office()
     and c_status <> 'draft'
     and app.has_consent(app.current_office(), c_owner, 'claim_processing', null)
$$;

-- Can the caller see this person's record? (used by people / person_links / households)
create or replace function app.can_see_person(pid uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select
    exists (select 1 from public.people p where p.id = pid and p.user_id = auth.uid())
    or exists (select 1 from public.profiles f where f.user_id = auth.uid() and f.person_id = pid)
    or app.helper_can_see_person(pid)
    or (app.current_role() = 'admin' and (
         -- the person has a case this officer may see ...
         exists (select 1 from public.cases c
                  where c.person_id = pid and app.officer_sees_case(c.owner_user_id, c.office, c.status))
         -- ... or is a possible duplicate of one (needed to review a name match; never band DIFFERENT)
         or exists (select 1 from public.person_links l
                      join public.cases c on c.person_id = case when l.a_id = pid then l.b_id else l.a_id end
                     where pid in (l.a_id, l.b_id) and l.band in ('SAME','MAYBE')
                       and app.officer_sees_case(c.owner_user_id, c.office, c.status))
       ))
$$;

create or replace function app.can_see_household(hid uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (select 1 from public.people p where p.household_id = hid and app.can_see_person(p.id))
$$;

-- ------------------------------------------------------------------ turn the locks on
do $$
declare t text;
begin
  foreach t in array array[
    'households','people','person_links','profiles','user_roles','rule_sets','rules','cases','case_events',
    'drafts','documents','doc_checks','consents','consent_events','helper_assignments','decisions',
    'case_notes','case_flags','api_keys','audit_log','scam_reports','eval_runs','eval_cases',
    'labelled_cases','data_quality_queue','schema_migrations']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- A policy helper: drop-then-create so this file can run twice.
create or replace function pg_temp.pol(tbl text, name text, cmd text, roles text, using_expr text, check_expr text default null)
returns void language plpgsql as $$
begin
  execute format('drop policy if exists %I on public.%I', name, tbl);
  execute format('create policy %I on public.%I for %s to authenticated %s %s',
    name, tbl, cmd,
    case when using_expr is not null then 'using (' || using_expr || ')' else '' end,
    case when check_expr is not null then 'with check (' || check_expr || ')' else '' end);
end $$;

-- ------------------------------------------------------------------ profiles, user_roles
select pg_temp.pol('profiles','profiles_select_own','select','authenticated','user_id = app.current_user_id()');
select pg_temp.pol('profiles','profiles_select_staff','select','authenticated',$q$app.current_role() in ('admin')$q$);
select pg_temp.pol('profiles','profiles_insert_admin','insert','authenticated',null,$q$app.current_role() = 'admin'$q$);
select pg_temp.pol('profiles','profiles_update_own','update','authenticated','user_id = app.current_user_id()','user_id = app.current_user_id()');
select pg_temp.pol('profiles','profiles_update_admin','update','authenticated',$q$app.current_role() = 'admin'$q$,$q$app.current_role() = 'admin'$q$);

select pg_temp.pol('user_roles','roles_select_own','select','authenticated','user_id = app.current_user_id()');
select pg_temp.pol('user_roles','roles_select_staff','select','authenticated',$q$app.current_role() in ('admin')$q$);
-- Only an admin changes roles, and never their own (mass assignment / privilege escalation).
select pg_temp.pol('user_roles','roles_insert_admin','insert','authenticated',null,$q$app.current_role() = 'admin' and user_id <> app.current_user_id()$q$);
select pg_temp.pol('user_roles','roles_update_admin','update','authenticated',$q$app.current_role() = 'admin' and user_id <> app.current_user_id()$q$,$q$app.current_role() = 'admin' and user_id <> app.current_user_id()$q$);
select pg_temp.pol('user_roles','roles_delete_admin','delete','authenticated',$q$app.current_role() = 'admin' and user_id <> app.current_user_id()$q$);

-- ------------------------------------------------------------------ people, households, links
select pg_temp.pol('people','people_select','select','authenticated','app.can_see_person(id)');
-- admin reads people only through the masked view people_masked (below)
select pg_temp.pol('households','households_select','select','authenticated','app.can_see_household(id)');
select pg_temp.pol('households','households_select_admin','select','authenticated',$q$app.current_role() = 'admin'$q$);
select pg_temp.pol('person_links','links_select','select','authenticated','app.can_see_person(a_id) or app.can_see_person(b_id)');
select pg_temp.pol('person_links','links_select_admin','select','authenticated',$q$app.current_role() = 'admin'$q$);

-- ------------------------------------------------------------------ cases
select pg_temp.pol('cases','cases_select_owner','select','authenticated','owner_user_id = app.current_user_id()');
select pg_temp.pol('cases','cases_select_helper','select','authenticated','app.helper_can_see_person(person_id)');
select pg_temp.pol('cases','cases_select_officer','select','authenticated','app.officer_sees_case(owner_user_id, office, status)');

select pg_temp.pol('cases','cases_insert_citizen','insert','authenticated',null,
  $q$app.current_role() = 'citizen' and owner_user_id = app.current_user_id() and helper_user_id is null
     and status = 'draft' and person_id = app.current_person_id()$q$);
select pg_temp.pol('cases','cases_insert_helper','insert','authenticated',null,
  $q$app.current_role() = 'helper' and helper_user_id = app.current_user_id() and status = 'draft'
     and app.helper_can_see_person(person_id) and owner_user_id = app.person_user(person_id)$q$);

select pg_temp.pol('cases','cases_update_citizen','update','authenticated',
  $q$app.current_role() = 'citizen' and owner_user_id = app.current_user_id() and status in ('draft','awaiting_proof')$q$,
  $q$owner_user_id = app.current_user_id() and status in ('draft','awaiting_proof','submitted')$q$);
select pg_temp.pol('cases','cases_update_helper','update','authenticated',
  $q$app.helper_can_see_person(person_id) and status in ('draft','awaiting_proof')$q$,
  $q$helper_user_id = app.current_user_id() and status in ('draft','awaiting_proof','submitted')$q$);
select pg_temp.pol('cases','cases_update_officer','update','authenticated',
  'app.officer_sees_case(owner_user_id, office, status)',
  $q$app.current_role() = 'admin' and office = app.current_office()$q$);
select pg_temp.pol('cases','cases_update_admin','update','authenticated',   -- admin: assign / priority only (trigger enforces)
  $q$app.current_role() = 'admin'$q$,$q$app.current_role() = 'admin'$q$);
-- no DELETE policy for anyone: cases are never deleted

-- ------------------------------------------------------------------ things that hang off a case
-- "case_id in (select id from cases)" re-uses the case locks, so the rule is the same everywhere.
select pg_temp.pol('case_events','events_select','select','authenticated','case_id in (select id from public.cases)');
select pg_temp.pol('case_events','events_insert','insert','authenticated',null,
  $q$app.current_role() in ('citizen','helper','admin') and actor_id = app.current_user_id()
     and case_id in (select id from public.cases)$q$);

select pg_temp.pol('documents','documents_select','select','authenticated','case_id in (select id from public.cases)');
select pg_temp.pol('documents','documents_insert','insert','authenticated',null,
  $q$app.current_role() in ('citizen','helper') and uploaded_by = app.current_user_id()
     and case_id in (select id from public.cases where status in ('draft','awaiting_proof'))$q$);
select pg_temp.pol('doc_checks','doc_checks_select','select','authenticated','document_id in (select id from public.documents)');

select pg_temp.pol('drafts','drafts_select','select','authenticated',
  $q$app.current_role() in ('citizen','helper') and case_id in (select id from public.cases)$q$);
select pg_temp.pol('drafts','drafts_insert','insert','authenticated',null,
  $q$app.current_role() in ('citizen','helper') and case_id in (select id from public.cases where status in ('draft','awaiting_proof'))$q$);

select pg_temp.pol('decisions','decisions_select','select','authenticated','case_id in (select id from public.cases)');
-- an officer records their own choice as a NEW row; decisions are never edited
select pg_temp.pol('decisions','decisions_insert_officer','insert','authenticated',null,
  $q$app.current_role() = 'admin' and actor_type = 'user' and actor_id = app.current_user_id()
     and case_id in (select id from public.cases)$q$);

select pg_temp.pol('case_notes','notes_select','select','authenticated',
  $q$app.current_role() in ('admin') and case_id in (select id from public.cases)$q$);
select pg_temp.pol('case_notes','notes_insert','insert','authenticated',null,
  $q$app.current_role() = 'admin' and case_id in (select id from public.cases)$q$);

select pg_temp.pol('case_flags','flags_select','select','authenticated',
  $q$app.current_role() in ('admin') and case_id in (select id from public.cases)$q$);
select pg_temp.pol('case_flags','flags_insert','insert','authenticated',null,
  $q$app.current_role() = 'admin' and opened_by = app.current_user_id() and case_id in (select id from public.cases)$q$);
select pg_temp.pol('case_flags','flags_update','update','authenticated',
  $q$app.current_role() = 'admin' and case_id in (select id from public.cases)$q$,
  $q$app.current_role() = 'admin' and case_id in (select id from public.cases)$q$);

-- ------------------------------------------------------------------ consent
select pg_temp.pol('consents','consents_select_own','select','authenticated','subject_id = app.current_user_id()');
select pg_temp.pol('consents','consents_select_helper','select','authenticated',
  $q$app.current_role() = 'helper' and app.helper_can_see_person(app.person_of_user(subject_id))$q$);
select pg_temp.pol('consents','consents_select_staff','select','authenticated',$q$app.current_role() in ('admin')$q$);
-- Officers get NO row access to consents: they only ask yes/no (app.has_consent / view consent_flags).
select pg_temp.pol('consents','consents_insert_own','insert','authenticated',null,
  $q$subject_id = app.current_user_id() and granted_by = app.current_user_id() and status = 'granted'$q$);
select pg_temp.pol('consents','consents_update_own','update','authenticated','subject_id = app.current_user_id()',
  $q$subject_id = app.current_user_id() and status in ('withdrawn')$q$);   -- take-back only

select pg_temp.pol('consent_events','cevents_select','select','authenticated','consent_id in (select id from public.consents)');
-- consent_events are written only by triggers (0004)

select pg_temp.pol('helper_assignments','assign_select_helper','select','authenticated','helper_user_id = app.current_user_id()');
select pg_temp.pol('helper_assignments','assign_select_citizen','select','authenticated','person_id = app.current_person_id()');
select pg_temp.pol('helper_assignments','assign_select_staff','select','authenticated',$q$app.current_role() in ('admin')$q$);
select pg_temp.pol('helper_assignments','assign_insert','insert','authenticated',null,
  $q$app.current_role() = 'admin' or (app.current_role() = 'citizen' and person_id = app.current_person_id() and active = false)$q$);
select pg_temp.pol('helper_assignments','assign_update_admin','update','authenticated',$q$app.current_role() = 'admin'$q$,$q$app.current_role() = 'admin'$q$);
select pg_temp.pol('helper_assignments','assign_delete','delete','authenticated',
  $q$app.current_role() = 'admin' or (app.current_role() = 'citizen' and person_id = app.current_person_id())$q$);
-- helpers open/close sessions only through app.helper_start_session / app.helper_end_session (0005)

-- ------------------------------------------------------------------ rules
select pg_temp.pol('rule_sets','rule_sets_select_public','select','authenticated',$q$status = 'active' and app.current_role() in ('citizen','admin')$q$);
select pg_temp.pol('rule_sets','rule_sets_select_staff','select','authenticated',$q$app.current_role() in ('admin')$q$);
select pg_temp.pol('rule_sets','rule_sets_insert','insert','authenticated',null,$q$app.current_role() = 'admin'$q$);
select pg_temp.pol('rule_sets','rule_sets_update','update','authenticated',$q$app.current_role() = 'admin'$q$,$q$app.current_role() = 'admin'$q$);
select pg_temp.pol('rule_sets','rule_sets_delete','delete','authenticated',$q$app.current_role() = 'admin' and status = 'draft'$q$);
select pg_temp.pol('rules','rules_select','select','authenticated','rule_set_id in (select id from public.rule_sets)');
select pg_temp.pol('rules','rules_insert','insert','authenticated',null,$q$app.current_role() = 'admin'$q$);
select pg_temp.pol('rules','rules_delete','delete','authenticated',$q$app.current_role() = 'admin'$q$);   -- trigger: drafts only

-- ------------------------------------------------------------------ api keys, diary
select pg_temp.pol('api_keys','keys_select','select','authenticated',$q$app.current_role() in ('admin')$q$);
select pg_temp.pol('api_keys','keys_insert','insert','authenticated',null,$q$app.current_role() = 'admin' and created_by = app.current_user_id()$q$);
select pg_temp.pol('api_keys','keys_update','update','authenticated',$q$app.current_role() = 'admin'$q$,$q$app.current_role() = 'admin'$q$);

-- Citizens read the diary rows they caused or that are ABOUT them ("who has seen my data").
select pg_temp.pol('audit_log','audit_select_own','select','authenticated',
  $q$actor_id = app.current_user_id() or details->>'subject_id' = app.current_user_id()::text$q$);
select pg_temp.pol('audit_log','audit_select_staff','select','authenticated',$q$app.current_role() in ('admin')$q$);

-- ------------------------------------------------------------------ scams, eval, data quality
select pg_temp.pol('scam_reports','scam_select_own','select','authenticated','reported_by = app.current_user_id()');
select pg_temp.pol('scam_reports','scam_select_staff','select','authenticated',$q$app.current_role() in ('admin')$q$);
select pg_temp.pol('scam_reports','scam_insert','insert','authenticated',null,
  $q$app.current_role() in ('citizen','helper','admin') and reported_by = app.current_user_id()$q$);
select pg_temp.pol('eval_runs','eval_runs_select','select','authenticated',$q$app.current_role() in ('admin')$q$);
select pg_temp.pol('eval_cases','eval_cases_select','select','authenticated',$q$app.current_role() in ('admin')$q$);
select pg_temp.pol('labelled_cases','labelled_select','select','authenticated',$q$app.current_role() in ('admin')$q$);
select pg_temp.pol('data_quality_queue','dq_select','select','authenticated',$q$app.current_role() in ('admin')$q$);
select pg_temp.pol('data_quality_queue','dq_update','update','authenticated',$q$app.current_role() in ('admin')$q$,$q$app.current_role() in ('admin')$q$);

-- ------------------------------------------------------------------ views
-- Admin sees people with the middle of the CNIC hidden and no phone / wallet details.
create or replace view public.people_masked as
  select p.id, p.name_roman, p.name_ur,
         case when p.cnic is null then null else substr(p.cnic,1,5) || '*****' || substr(p.cnic,13,1) end as cnic_masked,
         p.gender, p.district, p.deceased, p.household_id, p.dob_precision, p.synthetic
    from public.people p
   where app.current_role() = 'admin';

-- Officers may only ask "is consent active?", not read the consent rows.
create or replace view public.consent_flags as
  select c.subject_id, c.purpose, (c.status = 'granted' and (c.expires_at is null or c.expires_at > now())) as active
    from public.consents c
   where app.current_role() = 'admin' and c.grantee_type = 'office' and c.grantee_id = app.current_office();

-- ------------------------------------------------------------------ privileges (the locks above do the rest)
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all tables in schema mock from anon, authenticated;
revoke all on schema mock from anon, authenticated;
revoke all on all functions in schema public from anon;

grant usage on schema public to anon, authenticated;
grant usage on schema app to authenticated;

grant select on public.profiles, public.user_roles, public.people, public.households, public.person_links,
  public.cases, public.case_events, public.documents, public.doc_checks, public.drafts, public.decisions,
  public.case_notes, public.case_flags, public.consents, public.consent_events, public.helper_assignments,
  public.rule_sets, public.rules, public.api_keys, public.audit_log, public.scam_reports, public.eval_runs,
  public.eval_cases, public.labelled_cases, public.data_quality_queue, public.people_masked, public.consent_flags
  to authenticated;
grant insert on public.profiles, public.user_roles, public.cases, public.case_events, public.documents,
  public.drafts, public.decisions, public.case_notes, public.case_flags, public.consents,
  public.helper_assignments, public.rule_sets, public.rules, public.api_keys, public.scam_reports
  to authenticated;
grant update on public.profiles, public.user_roles, public.cases, public.case_flags, public.consents,
  public.helper_assignments, public.rule_sets, public.api_keys
  to authenticated;
grant update (status, resolved_by, resolved_at, note) on public.data_quality_queue to authenticated;
grant delete on public.user_roles, public.helper_assignments, public.rule_sets, public.rules to authenticated;

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant usage on schema public, app, mock to service_role;
    grant all on all tables in schema public to service_role;
    grant all on all tables in schema mock to service_role;
    grant all on all sequences in schema public to service_role;
  end if;
end $$;
