-- 0005_case_safety.sql : the safety rules that do not depend on who wrote the code.
--  * which status moves are legal, and who may make them
--  * nobody approves / rejects their own case or one they helped with (separation of duties)
--  * a case cannot be approved while a HARD flag is open (table case_flags)
--  * above second_approver_over, two different officers must approve
--  * a citizen cannot set their own amount, zone, result, role, office ...
--  * helper sessions, saving a draft and "continue on another phone"
-- Safe to run more than once.
--
-- ORDER FOR THE SERVICE: write the decision row FIRST, then move the case status. The case can only become
-- approved / rejected when the newest decision says APPROVE / REJECT.
--
-- How the "hard flag" works: an officer (or the service) inserts a row into case_flags (severity 'hard',
-- status 'open'). A trigger keeps cases.open_flags equal to the number of open hard flags. The move to
-- 'approved' counts the open hard flags again itself (it does not trust the column). Only an officer
-- of that case's office resolves a flag, with a written note.

set search_path = public, extensions;

-- ================================================================== CASES
create or replace function app.cases_guard() returns trigger
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare
  v_uid      uuid    := auth.uid();
  v_role     text    := app.current_role();
  v_acting   boolean := auth.uid() is not null and pg_trigger_depth() <= 1;   -- a person's own statement (not a trigger's)
  v_allowed  text[];
  v_pair     text;
  v_pairs    text[] := array[
    'draft>submitted','draft>closed',
    'submitted>awaiting_proof','submitted>in_review','submitted>approved','submitted>rejected','submitted>stopped',
    'awaiting_proof>submitted','awaiting_proof>in_review','awaiting_proof>rejected','awaiting_proof>stopped',
    'in_review>awaiting_proof','in_review>approved','in_review>rejected','in_review>stopped',
    'approved>paid','approved>stopped','approved>in_review',
    'rejected>closed','rejected>in_review','paid>closed',
    'stopped>submitted','stopped>in_review','stopped>closed'];
  v_want     text;
  v_last     record;
  v_limit    numeric;
  v_n        int;
begin
  -- -------------------------------------------------------------- INSERT
  if tg_op = 'INSERT' then
    new.office     := coalesce(new.office, (select p.office from public.profiles p where p.user_id = new.owner_user_id));
    new.updated_at := now();
    if v_acting then
      if v_role is null or v_role not in ('citizen','helper') then
        raise exception 'only a citizen or a helper can start a claim' using errcode = '42501';
      end if;
      -- these values come from the profile and the active rule set, never from the caller
      new.office := (select p.office from public.profiles p where p.user_id = new.owner_user_id);
      new.amount := coalesce((select (params ->> 'amount')::int from public.rule_sets where status = 'active'), 0);
      if new.status <> 'draft' or new.zone is not null or new.result is not null or new.assigned_officer is not null
         or new.priority <> 0 or new.open_flags <> 0 or new.submitted_at is not null or new.decided_at is not null then
        raise exception 'a new claim must start as an empty draft' using errcode = '42501';
      end if;
    end if;
    return new;
  end if;

  -- -------------------------------------------------------------- UPDATE
  new.updated_at := now();

  if v_uid is not null then      -- these never change through a user (only the master key can fix them)
    if new.id <> old.id or new.owner_user_id <> old.owner_user_id or new.person_id <> old.person_id
       or new.household_id is distinct from old.household_id or new.created_at <> old.created_at
       or new.office <> old.office or new.quarter <> old.quarter
       or new.helper_user_id is distinct from old.helper_user_id then
      raise exception 'owner, person, office, quarter and helper of a case cannot be changed' using errcode = '42501';
    end if;
  end if;

  if v_acting then
    v_allowed := case v_role
      when 'citizen' then array['draft','step','resume_code','payout_account','payout_account_title','payout_changed_at','status','submitted_at','updated_at']
      when 'helper'  then array['draft','step','resume_code','payout_account','payout_account_title','payout_changed_at','status','submitted_at','updated_at']
      when 'admin'   then array['status','zone','result','assigned_officer','priority','decided_at','updated_at']
      else array['updated_at'] end;
    if (to_jsonb(new) - v_allowed) is distinct from (to_jsonb(old) - v_allowed) then
      raise exception 'you are not allowed to change that field of a case' using errcode = '42501';
    end if;
  end if;

  -- "changed" means: it replaced an account already on this claim, or it differs from the account on this person's earlier claim.
  -- Entering the account for the first time on a new claim is NOT a change.
  if new.payout_account is distinct from old.payout_account then
    if old.payout_account is not null
       or exists (select 1 from public.cases o
                  where o.person_id = new.person_id and o.id <> new.id and o.payout_account is not null
                    and o.payout_account is distinct from new.payout_account
                    and o.created_at = (select max(o2.created_at) from public.cases o2
                                        where o2.person_id = new.person_id and o2.id <> new.id and o2.payout_account is not null)) then
      new.payout_changed_at := now();
    end if;
  end if;

  -- -------------------------------------------------------------- status moves
  if new.status is distinct from old.status then
    v_pair := old.status || '>' || new.status;
    if not (v_pair = any (v_pairs)) then
      raise exception 'a case cannot go from % to %', old.status, new.status using errcode = '23514';
    end if;

    if v_acting then
      if v_role in ('citizen','helper') then
        if v_pair not in ('draft>submitted','awaiting_proof>submitted') then
          raise exception 'you can only submit your own claim' using errcode = '42501';
        end if;
      elsif v_role = 'admin' then
        if new.status not in ('in_review','awaiting_proof','approved','rejected','stopped','closed') then
          raise exception 'an officer cannot move a case to %', new.status using errcode = '42501';
        end if;
      else
        raise exception 'a % cannot decide or move a case', coalesce(v_role, 'user without a role') using errcode = '42501';
      end if;
    end if;

    if new.status = 'submitted' then new.submitted_at := coalesce(new.submitted_at, now()); end if;

    if new.status in ('approved','rejected') then
      v_want := case when new.status = 'approved' then 'APPROVE' else 'REJECT' end;

      -- (1) a hard flag blocks approval (counted live, not read from the column)
      if new.status = 'approved' and exists (
           select 1 from public.case_flags f where f.case_id = new.id and f.status = 'open' and f.severity = 'hard') then
        raise exception 'cannot approve: a hard flag is still open on this case' using errcode = '23514';
      end if;

      -- (2) the newest decision must say the same thing
      select d.result, d.actor_id, d.actor_type, d.rule_set_id into v_last
        from public.decisions d where d.case_id = new.id order by d.created_at desc limit 1;
      if not found or v_last.result is distinct from v_want then
        raise exception 'record a % decision first, then move the case to %', v_want, new.status using errcode = '23514';
      end if;

      -- (3) separation of duties (only for a person acting; the service writes as job/ai)
      if v_uid is not null then
        if v_last.actor_id is distinct from v_uid then
          raise exception 'the newest decision was not recorded by you' using errcode = '42501';
        end if;
        if v_uid = new.owner_user_id or v_uid = new.helper_user_id
           or exists (select 1 from public.documents d where d.case_id = new.id and d.uploaded_by = v_uid)
           or exists (select 1 from public.case_events e where e.case_id = new.id and e.actor_id = v_uid
                       and e.kind in ('created','draft_saved','submitted','helped','proof_uploaded')) then
          raise exception 'separation of duties: you cannot decide your own case or one you helped with' using errcode = '42501';
        end if;
      end if;

      -- (4) big payments need two different officers who both said APPROVE
      if new.status = 'approved' then
        select coalesce((s.params ->> 'second_approver_over')::numeric, 1e12) into v_limit
          from public.rule_sets s where s.id = v_last.rule_set_id;
        if new.amount > coalesce(v_limit, 1e12) then
          select count(distinct d.actor_id) into v_n from public.decisions d
           where d.case_id = new.id and d.actor_type = 'user' and d.result = 'APPROVE';
          if v_n < 2 then
            raise exception 'second approver needed: amount % is over %', new.amount, v_limit using errcode = '23514';
          end if;
        end if;
      end if;
      new.decided_at := now();
    end if;
  end if;
  return new;
end $$;

drop trigger if exists cases_guard on public.cases;
create trigger cases_guard before insert or update on public.cases
  for each row execute function app.cases_guard();

create or replace function app.cases_no_delete() returns trigger
language plpgsql as $$
begin
  raise exception 'cases are never deleted (close or stop them instead)' using errcode = '42501';
end $$;
drop trigger if exists cases_no_delete on public.cases;
create trigger cases_no_delete before delete on public.cases for each row execute function app.cases_no_delete();

-- ================================================================== FLAGS
create or replace function app.case_flags_guard() returns trigger
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'open' then raise exception 'a new flag must be open'; end if;
    new.opened_by := coalesce(new.opened_by, auth.uid());
    new.opened_at := now();
    return new;
  elsif tg_op = 'DELETE' then
    raise exception 'flags are never deleted (resolve them)' using errcode = '42501';
  end if;
  if old.status = 'resolved' then raise exception 'a resolved flag cannot be changed' using errcode = '23514'; end if;
  if new.status <> 'resolved' or new.id <> old.id or new.case_id <> old.case_id or new.kind <> old.kind
     or new.severity <> old.severity or new.opened_by is distinct from old.opened_by then
    raise exception 'a flag can only be resolved' using errcode = '23514';
  end if;
  if coalesce(trim(new.resolution_note), '') = '' then
    raise exception 'resolving a flag needs a written note' using errcode = '23514';
  end if;
  new.resolved_by := coalesce(auth.uid(), new.resolved_by);
  new.resolved_at := now();
  return new;
end $$;
drop trigger if exists case_flags_guard on public.case_flags;
create trigger case_flags_guard before insert or update or delete on public.case_flags
  for each row execute function app.case_flags_guard();

create or replace function app.case_flags_sync() returns trigger
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare v_case uuid := coalesce(new.case_id, old.case_id);
begin
  update public.cases c
     set open_flags = (select count(*) from public.case_flags f where f.case_id = v_case and f.status = 'open' and f.severity = 'hard')
   where c.id = v_case;
  insert into public.case_events (case_id, kind, actor_id, data)
  values (v_case, case when tg_op = 'INSERT' then 'flag_opened' else 'flag_resolved' end, auth.uid(),
          jsonb_build_object('flag_id', new.id, 'kind', new.kind, 'severity', new.severity));
  return null;
end $$;
drop trigger if exists case_flags_sync on public.case_flags;
create trigger case_flags_sync after insert or update on public.case_flags
  for each row execute function app.case_flags_sync();

-- ================================================================== ROLES AND PROFILES (mass assignment)
create or replace function app.user_roles_guard() returns trigger
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is not null then
    if app.current_role() is distinct from 'admin' then
      raise exception 'only an admin can change roles' using errcode = '42501';
    end if;
    if coalesce(new.user_id, old.user_id) = v_uid or old.user_id = v_uid then
      raise exception 'you cannot change your own role' using errcode = '42501';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
drop trigger if exists user_roles_guard on public.user_roles;
create trigger user_roles_guard before insert or update or delete on public.user_roles
  for each row execute function app.user_roles_guard();

create or replace function app.profiles_guard() returns trigger
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
begin
  if auth.uid() is not null and app.current_role() is distinct from 'admin' then
    if tg_op = 'INSERT' then raise exception 'only an admin creates profiles' using errcode = '42501'; end if;
    if new.user_id <> old.user_id or new.office is distinct from old.office or new.person_id is distinct from old.person_id then
      raise exception 'you can change your name and language, not your office or person record' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before insert or update on public.profiles
  for each row execute function app.profiles_guard();

-- ================================================================== HELPER SESSIONS
-- SQLSTATE 'SR403' = consent missing. Message starts with CONSENT_REQUIRED.
create or replace function app.helper_start_session(p_person uuid) returns uuid
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  a record;
begin
  if v_uid is null or app.current_role() is distinct from 'helper' then
    raise exception 'FORBIDDEN: only a helper can open a family session' using errcode = '42501';
  end if;
  select * into a from public.helper_assignments where helper_user_id = v_uid and person_id = p_person;
  if not found then
    raise exception 'FORBIDDEN: you do not serve this family' using errcode = '42501';
  end if;
  if not app.has_consent(v_uid::text, app.person_user(p_person), 'claim_help', null) then
    raise exception 'CONSENT_REQUIRED: this family has not agreed to your help' using errcode = 'SR403';
  end if;
  update public.helper_assignments set active = false, session_ended_at = now()
   where helper_user_id = v_uid and active and person_id <> p_person;
  update public.helper_assignments set active = true, session_started_at = now(), session_ended_at = null
   where id = a.id;
  return a.id;
end $$;

create or replace function app.helper_end_session() returns int
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare n int;
begin
  if auth.uid() is null or app.current_role() is distinct from 'helper' then
    raise exception 'FORBIDDEN: only a helper has a family session' using errcode = '42501';
  end if;
  with u as (update public.helper_assignments set active = false, session_ended_at = now()
              where helper_user_id = auth.uid() and active returning 1)
  select count(*) into n from u;
  return n;
end $$;

-- ================================================================== DRAFTS ("continue on another phone")
-- Runs AS the caller, so the case row locks decide whether it is allowed.
-- Same p_key twice returns the first result (offline outbox).
create or replace function app.save_draft(p_case uuid, p_step int, p_draft jsonb, p_key text default null) returns jsonb
language plpgsql set search_path = public, extensions, pg_temp
as $$
declare
  v_code  text;
  v_saved timestamptz;
  v_tries int := 0;
  c record;
begin
  if p_key is not null then
    select d.saved_at, d.resume_code into v_saved, v_code
      from public.drafts d where d.case_id = p_case and d.idempotency_key = p_key;
    if found then return jsonb_build_object('saved_at', v_saved, 'resume_code', v_code, 'repeat', true); end if;
  end if;

  select cs.id, cs.owner_user_id, cs.resume_code into c from public.cases cs where cs.id = p_case;
  if not found then raise exception 'case not found' using errcode = 'P0002'; end if;

  v_code := c.resume_code;
  while v_code is null loop
    v_code := lpad((((('x' || encode(gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 1000000))::text, 6, '0');
    begin
      update public.cases set resume_code = v_code where id = p_case;
    exception when unique_violation then
      v_code := null; v_tries := v_tries + 1;
      if v_tries > 25 then raise exception 'could not make a resume code, try again'; end if;
    end;
  end loop;

  update public.cases set draft = p_draft, step = p_step where id = p_case;
  if not found then raise exception 'you cannot save this draft' using errcode = '42501'; end if;

  insert into public.drafts (case_id, owner_user_id, step, data, resume_code, idempotency_key)
  values (p_case, c.owner_user_id, p_step, p_draft, v_code, p_key)
  returning drafts.saved_at into v_saved;

  insert into public.case_events (case_id, kind, actor_id, data)
  values (p_case, 'draft_saved', auth.uid(), jsonb_build_object('step', p_step));
  return jsonb_build_object('saved_at', v_saved, 'resume_code', v_code, 'repeat', false);
end $$;

-- Find your own unfinished claim by its 6-digit code. The case row locks still apply, so a stranger
-- who guesses a code gets nothing back; only the owner or the helper with the family session open sees it.
create or replace function app.resume_draft(p_code text)
returns table(case_id uuid, step int, draft jsonb, status text)
language sql stable set search_path = public, extensions, pg_temp
as $$
  select c.id, c.step, c.draft, c.status
    from public.cases c
   where c.resume_code = p_code
     and c.status in ('draft','awaiting_proof')
$$;
