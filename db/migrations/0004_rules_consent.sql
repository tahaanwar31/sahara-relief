-- 0004_rules_consent.sql : rule versions, decisions that never change, and consent take-back.
-- Safe to run more than once.

set search_path = public, extensions;

-- ================================================================== RULES
-- The only variables a rule expression may read (CONTRACT section 6).
create or replace function app.fact_vars() returns text[]
language sql immutable as $$
  select array[
    'person.gender','person.cnic_valid','person.cnic_expired','person.deceased','person.age',
    'household.pmt_score','household.members',
    'household.flags.gov_employee','household.flags.owns_vehicle','household.flags.tax_filer',
    'household.flags.foreign_trips','household.flags.high_phone_bill',
    'payout.shared_with_other_households','payout.changed_within_days','payout.owner_is_helper',
    'doc.required_missing','doc.any_blurry','doc.any_edited','doc.min_confidence',
    'identity.band','identity.score','claim.amount']
$$;

-- Returns NULL when the expression is a valid small json-logic rule, else a plain-English problem.
create or replace function app.expr_problem(e jsonb, top boolean default true) returns text
language plpgsql stable as $$
declare
  t  text := jsonb_typeof(e);
  op text;
  v  jsonb;
  el jsonb;
  p  text;
  nm text;
begin
  if t = 'object' then
    if (select count(*) from jsonb_object_keys(e)) <> 1 then
      return 'an operator object must have exactly one key';
    end if;
    select k into op from jsonb_object_keys(e) k;
    v := e -> op;
    if op = 'var' then
      if jsonb_typeof(v) = 'string' then nm := v #>> '{}';
      elsif jsonb_typeof(v) = 'array' and jsonb_array_length(v) >= 1 and jsonb_typeof(v -> 0) = 'string' then nm := v ->> 0;
      else return 'var needs a variable name';
      end if;
      if nm <> all (app.fact_vars()) then return 'unknown variable ' || nm; end if;
      return null;
    elsif op = 'missing' then
      if jsonb_typeof(v) <> 'array' then return 'missing needs a list of names'; end if;
      for el in select value from jsonb_array_elements(v) loop
        if jsonb_typeof(el) <> 'string' or (el #>> '{}') <> all (app.fact_vars()) then
          return 'unknown variable in missing: ' || el::text;
        end if;
      end loop;
      return null;
    elsif op = '!' then
      if jsonb_typeof(v) = 'array' then
        if jsonb_array_length(v) <> 1 then return '! needs exactly one argument'; end if;
        return app.expr_problem(v -> 0, false);
      end if;
      return app.expr_problem(v, false);
    elsif op in ('and','or') then
      if jsonb_typeof(v) <> 'array' or jsonb_array_length(v) < 1 then return op || ' needs a list'; end if;
    elsif op in ('==','!=','<','<=','>','>=','in') then
      if jsonb_typeof(v) <> 'array' or jsonb_array_length(v) <> 2 then return op || ' needs exactly two arguments'; end if;
    else
      return 'unknown operator ' || op;
    end if;
    for el in select value from jsonb_array_elements(v) loop
      p := app.expr_problem(el, false);
      if p is not null then return p; end if;
    end loop;
    return null;
  elsif t = 'array' then            -- a list of literals, e.g. for "in"
    for el in select value from jsonb_array_elements(e) loop
      p := app.expr_problem(el, false);
      if p is not null then return p; end if;
    end loop;
    return null;
  else                               -- number, string, boolean, null
    if top then return 'a rule must be an operator object, not a bare value'; end if;
    return null;
  end if;
end $$;

-- List every problem that stops a rule set from being activated (empty list = fine).
create or replace function app.validate_rule_set(p_id uuid) returns text[]
language plpgsql stable security definer set search_path = public, extensions, pg_temp
as $$
declare
  s record;
  p jsonb;
  probs text[] := '{}';
  r record;
  msg text;
  k text;
begin
  select * into s from public.rule_sets where id = p_id;
  if not found then return array['rule set not found']; end if;
  p := s.params;

  foreach k in array array['cutoff','borderline_band','amount','payout_cap','second_approver_over'] loop
    if jsonb_typeof(p -> k) is distinct from 'number' then probs := probs || ('params.' || k || ' must be a number'); end if;
  end loop;
  if jsonb_typeof(p -> 'auto_reject_enabled') is distinct from 'boolean' then
    probs := probs || 'params.auto_reject_enabled must be true or false'::text;
  end if;
  if jsonb_typeof(p -> 'costs') is distinct from 'object' then
    probs := probs || 'params.costs must be an object'::text;
  else
    foreach k in array array['wrong_approve','wrong_reject','review','proof'] loop
      if jsonb_typeof(p -> 'costs' -> k) is distinct from 'number' or (p -> 'costs' ->> k)::numeric <= 0 then
        probs := probs || ('params.costs.' || k || ' must be a positive number');
      end if;
    end loop;
  end if;

  if array_length(probs, 1) is null then            -- numbers are numbers, so the range checks are safe
    if (p ->> 'cutoff')::numeric not between 0 and 100 then probs := probs || 'cutoff must be between 0 and 100'::text; end if;
    if (p ->> 'borderline_band')::numeric < 0 then probs := probs || 'borderline_band cannot be negative'::text; end if;
    if (p ->> 'amount')::numeric <= 0 then probs := probs || 'amount must be above zero'::text; end if;
    if (p ->> 'payout_cap')::numeric < (p ->> 'amount')::numeric then probs := probs || 'payout_cap cannot be below amount'::text; end if;
    if (p ->> 'second_approver_over')::numeric <= 0 then probs := probs || 'second_approver_over must be above zero'::text; end if;
    if (p -> 'costs' ->> 'wrong_approve')::numeric <= (p -> 'costs' ->> 'review')::numeric then
      probs := probs || 'costs.wrong_approve must be larger than costs.review (otherwise nothing can be auto-approved)'::text;
    end if;
  end if;

  if not exists (select 1 from public.rules where rule_set_id = p_id) then
    probs := probs || 'the rule set has no rules'::text;
  end if;
  for r in select code, expression from public.rules where rule_set_id = p_id order by code loop
    msg := app.expr_problem(r.expression);
    if msg is not null then probs := probs || ('rule ' || r.code || ': ' || msg); end if;
  end loop;
  return probs;
end $$;

-- The fingerprint of a rule set: its numbers plus all its rules, in a fixed order.
create or replace function app.rule_set_checksum(p_id uuid) returns text
language sql stable security definer set search_path = public, extensions, pg_temp
as $$
  select 'sha256-' || encode(digest(
           s.params::text || '|' ||
           coalesce((select string_agg(r.code || ':' || r.expression::text || ':' || r.outcome || ':' || r.reason_code,
                                       ';' order by r.code)
                       from public.rules r where r.rule_set_id = s.id), ''),
           'sha256'), 'hex')
    from public.rule_sets s where s.id = p_id
$$;

-- --- rule_sets: new rows are always drafts; saved numbers never change; status only moves forward.
create or replace function app.rule_sets_guard() returns trigger
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare probs text[];
begin
  if auth.uid() is not null and app.current_role() is distinct from 'admin' then
    raise exception 'only an admin may change rule sets' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'draft' then raise exception 'a new rule set must start as a draft'; end if;
    new.version    := coalesce(new.version, (select coalesce(max(version), 0) + 1 from public.rule_sets));
    new.created_by := coalesce(new.created_by, auth.uid());
    new.checksum := null; new.effective_from := null; new.effective_to := null;
    return new;
  elsif tg_op = 'DELETE' then
    if old.status <> 'draft' then raise exception 'only a draft rule set can be deleted (history is kept)'; end if;
    return old;
  end if;

  -- UPDATE
  if new.id <> old.id or new.version <> old.version or new.params is distinct from old.params
     or new.parent_version is distinct from old.parent_version or new.created_by is distinct from old.created_by
     or new.created_at <> old.created_at or new.name is distinct from old.name then
    raise exception 'a saved rule set cannot be edited: create a new draft version instead' using errcode = '23514';
  end if;
  if new.checksum is distinct from old.checksum and old.checksum is not null then
    raise exception 'the checksum of a rule set cannot change' using errcode = '23514';
  end if;
  if new.status is distinct from old.status then
    if not ((old.status = 'draft'  and new.status in ('active','retired'))
         or (old.status = 'active' and new.status = 'retired')) then
      raise exception 'rule set status cannot go from % to %', old.status, new.status using errcode = '23514';
    end if;
    if new.status = 'active' then
      probs := app.validate_rule_set(new.id);
      if array_length(probs, 1) > 0 then
        raise exception 'rule set failed validation: %', array_to_string(probs, '; ') using errcode = '23514';
      end if;
      new.checksum       := app.rule_set_checksum(new.id);
      new.effective_from := coalesce(new.effective_from, now());
      new.effective_to   := null;
    elsif new.status = 'retired' then
      new.effective_to := coalesce(new.effective_to, now());
    end if;
  end if;
  return new;
end $$;

drop trigger if exists rule_sets_guard on public.rule_sets;
create trigger rule_sets_guard before insert or update or delete on public.rule_sets
  for each row execute function app.rule_sets_guard();

-- --- rules: can only be added to a DRAFT set, and never edited. (A change = a new draft version.)
create or replace function app.rules_guard() returns trigger
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare st text;
begin
  if auth.uid() is not null and app.current_role() is distinct from 'admin' then
    raise exception 'only an admin may change rules' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    raise exception 'rules cannot be edited: create a new draft rule set instead' using errcode = '23514';
  end if;
  select status into st from public.rule_sets where id = coalesce(new.rule_set_id, old.rule_set_id);
  if tg_op = 'INSERT' then
    if st is distinct from 'draft' then
      raise exception 'rules can only be added to a draft rule set (this one is %)', st using errcode = '23514';
    end if;
    return new;
  end if;
  -- DELETE: allowed only while the parent is a draft, or is being deleted together with its draft
  if st is not null and st <> 'draft' then
    raise exception 'rules of a % rule set cannot be deleted', st using errcode = '23514';
  end if;
  return old;
end $$;

drop trigger if exists rules_guard on public.rules;
create trigger rules_guard before insert or update or delete on public.rules
  for each row execute function app.rules_guard();

-- Make a new draft rule set with its rules in one call. p_rules = json array of
-- {code, expression, outcome, reason_code, reason_en, reason_ur}. Admin (or the master key) only.
create or replace function app.create_rule_set(p_params jsonb, p_rules jsonb, p_parent_version int default null, p_name text default null)
returns uuid
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare v_id uuid; r jsonb;
begin
  if auth.uid() is not null and app.current_role() is distinct from 'admin' then
    raise exception 'only an admin may create rule sets' using errcode = '42501';
  end if;
  insert into public.rule_sets (params, parent_version, name) values (p_params, p_parent_version, p_name) returning id into v_id;
  for r in select value from jsonb_array_elements(coalesce(p_rules, '[]'::jsonb)) loop
    insert into public.rules (rule_set_id, code, expression, outcome, reason_code, reason_en, reason_ur)
    values (v_id, r ->> 'code', r -> 'expression', r ->> 'outcome', r ->> 'reason_code', r ->> 'reason_en', r ->> 'reason_ur');
  end loop;
  return v_id;
end $$;

-- ONE step: retire the old active version, activate the new one. Refuses a set that fails validation.
create or replace function app.activate_rule_set(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare
  s record;
  probs text[];
  v_now timestamptz := now();
  v_old int;
begin
  if auth.uid() is not null and app.current_role() is distinct from 'admin' then
    raise exception 'only an admin may activate a rule set' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(727002);
  select * into s from public.rule_sets where id = p_id for update;
  if not found then raise exception 'rule set not found' using errcode = 'P0002'; end if;
  if s.status <> 'draft' then
    raise exception 'only a draft can be activated (this one is %)', s.status using errcode = '23514';
  end if;
  probs := app.validate_rule_set(p_id);
  if array_length(probs, 1) > 0 then
    raise exception 'rule set failed validation: %', array_to_string(probs, '; ') using errcode = '23514';
  end if;
  select version into v_old from public.rule_sets where status = 'active';
  update public.rule_sets set status = 'retired', effective_to = v_now where status = 'active';
  update public.rule_sets set status = 'active', effective_from = v_now where id = p_id;
  return jsonb_build_object('activated_version', s.version, 'retired_version', v_old, 'at', v_now,
                            'checksum', app.rule_set_checksum(p_id));
end $$;

-- ================================================================== DECISIONS (append-only)
create or replace function app.decisions_before_insert() returns trigger
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare v int; c text;
begin
  if auth.uid() is not null then
    if new.actor_type <> 'user' then raise exception 'a user can only record a decision as actor_type user' using errcode = '42501'; end if;
    new.actor_id := coalesce(new.actor_id, auth.uid());
    if new.actor_id <> auth.uid() then raise exception 'cannot record a decision in someone else''s name' using errcode = '42501'; end if;
  elsif new.actor_type = 'user' and new.actor_id is null then
    raise exception 'a user decision needs actor_id';
  end if;
  new.rule_set_id := coalesce(new.rule_set_id, (select id from public.rule_sets where status = 'active'));
  select version, checksum into v, c from public.rule_sets where id = new.rule_set_id;
  if v is null then raise exception 'decision needs a rule set (none given, none active)'; end if;
  if c is null then raise exception 'rule set has never been activated, so it has no checksum'; end if;
  if new.rule_version is not null and new.rule_version <> v then raise exception 'rule_version does not match the rule set'; end if;
  if new.rule_checksum is not null and new.rule_checksum <> c then raise exception 'rule_checksum does not match the rule set'; end if;
  new.rule_version  := v;
  new.rule_checksum := c;
  if new.input_hash is null and new.input_snapshot is not null then
    new.input_hash := encode(digest(new.input_snapshot::text, 'sha256'), 'hex');
  end if;
  return new;
end $$;

drop trigger if exists decisions_before_insert on public.decisions;
create trigger decisions_before_insert before insert on public.decisions
  for each row execute function app.decisions_before_insert();

create or replace function app.refuse_change() returns trigger
language plpgsql as $$
begin
  raise exception '% is append-only: % is not allowed', tg_table_name, tg_op using errcode = '42501';
end $$;

drop trigger if exists decisions_immutable on public.decisions;
create trigger decisions_immutable before update or delete on public.decisions
  for each row execute function app.refuse_change();
drop trigger if exists decisions_no_truncate on public.decisions;
create trigger decisions_no_truncate before truncate on public.decisions
  for each statement execute function app.refuse_change();

drop trigger if exists consent_events_immutable on public.consent_events;
create trigger consent_events_immutable before update or delete on public.consent_events
  for each row execute function app.refuse_change();
drop trigger if exists consents_no_delete on public.consents;
create trigger consents_no_delete before delete on public.consents
  for each row execute function app.refuse_change();

-- ================================================================== CONSENT
create or replace function app.consent_receipt(p_consent uuid, p_kind text, p_at timestamptz) returns text
language sql stable security definer set search_path = public, extensions, pg_temp
as $$
  select encode(digest(
    'consent:' || c.id || ':' || p_kind || ':' || c.subject_id || ':' || c.grantee_type || ':' || c.grantee_id || ':' || c.purpose
    || ':' || to_char(p_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US')
    || ':' || coalesce((select e.receipt_hash from public.consent_events e where e.consent_id = c.id order by e.at desc, e.id desc limit 1), 'first'),
    'sha256'), 'hex')
  from public.consents c where c.id = p_consent
$$;

create or replace function app.consents_before() returns trigger
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'granted' then raise exception 'a new consent must be granted'; end if;
    new.granted_by := coalesce(new.granted_by, auth.uid());
    return new;
  end if;
  -- UPDATE: the only legal move is granted -> withdrawn / expired. Everything else is frozen.
  if old.status <> 'granted' then
    raise exception 'this consent is already %', old.status using errcode = '23514';
  end if;
  if new.status = 'granted' then
    raise exception 'a consent cannot be changed, only taken back' using errcode = '23514';
  end if;
  if new.subject_id <> old.subject_id or new.grantee_type <> old.grantee_type or new.grantee_id <> old.grantee_id
     or new.purpose <> old.purpose or new.fields <> old.fields or new.granted_at <> old.granted_at
     or new.version <> old.version or new.granted_by is distinct from old.granted_by
     or new.expires_at is distinct from old.expires_at then
    raise exception 'only the status of a consent can change' using errcode = '23514';
  end if;
  if new.status = 'withdrawn' then new.withdrawn_at := coalesce(new.withdrawn_at, now()); end if;
  return new;
end $$;

drop trigger if exists consents_before on public.consents;
create trigger consents_before before insert or update on public.consents
  for each row execute function app.consents_before();

-- After a grant: write the first history line with a receipt.
create or replace function app.consents_after_insert() returns trigger
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
begin
  insert into public.consent_events (consent_id, kind, "by", receipt_hash, at)
  values (new.id, 'granted', coalesce(new.granted_by, auth.uid()), app.consent_receipt(new.id, 'granted', new.granted_at), new.granted_at);
  return null;
end $$;

drop trigger if exists consents_after_insert on public.consents;
create trigger consents_after_insert after insert on public.consents
  for each row execute function app.consents_after_insert();

-- After a take-back (or expiry): receipt, stop pending payment, close helper sessions, queue a purge.
create or replace function app.consents_after_update() returns trigger
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare
  r record;
  v_at timestamptz := coalesce(new.withdrawn_at, now());
begin
  if new.status = old.status then return null; end if;

  insert into public.consent_events (consent_id, kind, "by", receipt_hash, at)
  values (new.id, new.status, auth.uid(), app.consent_receipt(new.id, new.status, v_at), v_at);

  -- 1. pending payment stops (a helper's consent only stops the cases that helper handled)
  for r in
    with stopped as (
      update public.cases c
         set status = 'stopped'
       where c.owner_user_id = new.subject_id
         and c.status in ('submitted','awaiting_proof','in_review','approved')
         and (new.grantee_type <> 'helper' or c.helper_user_id::text = new.grantee_id)
      returning c.id
    ) select id from stopped
  loop
    insert into public.case_events (case_id, kind, actor_id, data)
    values (r.id, 'stopped', auth.uid(), jsonb_build_object('reason', 'consent_' || new.status, 'consent_id', new.id));
    update mock.raast_payments set status = 'stopped'
     where case_id = r.id and status in ('queued','pending');
  end loop;

  -- 2. open helper sessions for this person close
  update public.helper_assignments a
     set active = false, session_ended_at = v_at
   where a.active
     and a.person_id in (select p.id from public.people p where p.user_id = new.subject_id
                         union select app.person_of_user(new.subject_id));

  -- 3. derived data is queued for deletion
  insert into public.data_quality_queue (entity, entity_id, problem, reason_code)
  values ('consent', new.id, 'purge derived data (consent ' || new.status || ')', 'R_CONSENT_MISSING');
  return null;
end $$;

drop trigger if exists consents_after_update on public.consents;
create trigger consents_after_update after update on public.consents
  for each row execute function app.consents_after_update();

-- Take back one consent. Returns the receipt hash the citizen can keep.
create or replace function app.withdraw_consent(p_id uuid) returns text
language plpgsql set search_path = public, extensions, pg_temp
as $$
declare v_receipt text;
begin
  update public.consents set status = 'withdrawn' where id = p_id and status = 'granted';
  if not found then raise exception 'consent not found, not yours, or already taken back' using errcode = 'P0002'; end if;
  select e.receipt_hash into v_receipt from public.consent_events e
   where e.consent_id = p_id and e.kind = 'withdrawn' order by e.at desc limit 1;
  return v_receipt;
end $$;

-- A scheduled job calls this to expire consents whose date has passed.
create or replace function app.expire_consents() returns int
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare n int;
begin
  with x as (update public.consents set status = 'expired'
              where status = 'granted' and expires_at is not null and expires_at <= now() returning 1)
  select count(*) into n from x;
  return n;
end $$;
