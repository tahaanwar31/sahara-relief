-- 0003_audit.sql : the diary (hash-chained audit_log).
--  * Triggers on the important tables write a diary row for every insert / update / delete.
--  * A BEFORE INSERT trigger on audit_log fills id, ts, prev_hash and hash = sha256(prev_hash | row text),
--    under an advisory lock so two writers cannot fork the chain.
--  * UPDATE, DELETE and TRUNCATE on audit_log are refused for everybody (trigger + REVOKE).
--  * app.verify_audit_chain() walks the chain and returns the id of the first broken row, or NULL.
-- Safe to run more than once.

set search_path = public, extensions;

-- The exact text that is hashed for one diary row. Used by the writer AND by the verifier.
create or replace function app.audit_canonical(a public.audit_log) returns text
language sql stable
as $$
  select concat_ws('|',
    a.id::text,
    to_char(a.ts at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US'),
    coalesce(a.actor_id::text, ''), coalesce(a.actor_type, ''), coalesce(a.actor_role, ''),
    coalesce(a.action, ''), coalesce(a.entity_type, ''), coalesce(a.entity_id::text, ''),
    coalesce(a.input_hash, ''), coalesce(a.rule_version::text, ''), coalesce(a.model_version, ''),
    coalesce(a.confidence::text, ''), coalesce(a.result, ''), coalesce(a.details::text, ''))
$$;

-- Fills the chain fields. Whatever the caller sent for id/ts/prev_hash/hash is thrown away.
create or replace function app.audit_chain_fill() returns trigger
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare prev text;
begin
  perform pg_advisory_xact_lock(727001);                  -- one writer at a time; held until commit
  select a.hash into prev from public.audit_log a order by a.id desc limit 1;
  new.id        := nextval('public.audit_log_id_seq');    -- numbered INSIDE the lock, so order = chain order
  new.ts        := clock_timestamp();
  new.prev_hash := coalesce(prev, 'GENESIS');
  new.hash      := encode(digest(new.prev_hash || '|' || app.audit_canonical(new), 'sha256'), 'hex');
  return new;
end $$;

drop trigger if exists audit_chain_fill on public.audit_log;
create trigger audit_chain_fill before insert on public.audit_log
  for each row execute function app.audit_chain_fill();

-- Nobody edits or removes the diary. Not users, not the service key, not a superuser.
create or replace function app.audit_refuse_change() returns trigger
language plpgsql as $$
begin
  raise exception 'audit_log is append-only: % is not allowed', tg_op using errcode = '42501';
end $$;

drop trigger if exists audit_no_update on public.audit_log;
create trigger audit_no_update before update or delete on public.audit_log
  for each row execute function app.audit_refuse_change();
drop trigger if exists audit_no_truncate on public.audit_log;
create trigger audit_no_truncate before truncate on public.audit_log
  for each statement execute function app.audit_refuse_change();

revoke insert, update, delete, truncate on public.audit_log from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    revoke update, delete, truncate on public.audit_log from service_role;
    grant select on public.audit_log to service_role;
    revoke insert on public.audit_log from service_role;   -- even the master key writes only through the triggers / log_access
  end if;
end $$;

-- Walk the chain from the start. Returns the id of the first row that does not fit, else NULL.
-- (A row deleted from the middle shows up as a broken link at the row after it.)
create or replace function app.verify_audit_chain() returns bigint
language plpgsql stable security definer set search_path = public, extensions, pg_temp
as $$
declare
  r public.audit_log%rowtype;
  prev text := 'GENESIS';
begin
  if auth.uid() is not null and app.current_role() not in ('admin') then
    raise exception 'only an admin may verify the diary' using errcode = '42501';
  end if;
  for r in select * from public.audit_log order by id loop
    if r.prev_hash is distinct from prev then return r.id; end if;
    if r.hash is distinct from encode(digest(r.prev_hash || '|' || app.audit_canonical(r), 'sha256'), 'hex') then
      return r.id;
    end if;
    prev := r.hash;
  end loop;
  return null;
end $$;

-- The newest hash. Write it on the slide or post it elsewhere: that is what makes a full rewrite visible.
create or replace function app.audit_head() returns table(last_id bigint, last_hash text, total bigint)
language sql stable security definer set search_path = public, pg_temp
as $$
  select (select max(id) from public.audit_log),
         (select hash from public.audit_log order by id desc limit 1),
         (select count(*) from public.audit_log)
$$;

-- Who is acting right now? A logged-in user, or a named job / the AI engine / the system.
-- The service sets  SET LOCAL app.actor_type = 'ai'|'job'|'system'  and  SET LOCAL app.actor_name = 'engine'
-- on its master connection. A real user id always wins.
create or replace function app.actor_type_now() returns text
language sql stable as $$
  select case
    when auth.uid() is not null then 'user'
    when current_setting('app.actor_type', true) in ('ai','job','system') then current_setting('app.actor_type', true)
    else 'system' end
$$;

-- The generic diary writer for one table. TG_ARGV[0] = comma list of columns whose VALUE is never copied
-- into the diary (big or private); only the fact that they changed is kept.
create or replace function app.audit_row() returns trigger
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare
  v_redact  text[] := string_to_array(coalesce(tg_argv[0], ''), ',');
  v_new     jsonb;
  v_old     jsonb;
  v_row     jsonb;
  v_changed jsonb := '{}'::jsonb;
  v_details jsonb;
  k         text;
  v_uid     uuid := auth.uid();
  v_atype   text := app.actor_type_now();
  v_aid     uuid := auth.uid();
  v_subject text;
  v_case    text;
begin
  if tg_op = 'DELETE' then v_old := to_jsonb(old); v_row := v_old;
  elsif tg_op = 'INSERT' then v_new := to_jsonb(new); v_row := v_new;
  else v_new := to_jsonb(new); v_old := to_jsonb(old); v_row := v_new;
  end if;

  -- decisions carry their own actor
  if tg_table_name = 'decisions' then
    v_atype := v_row->>'actor_type';
    v_aid   := nullif(v_row->>'actor_id', '')::uuid;
  end if;

  -- whose data is this about? (lets a citizen see "who touched my data")
  v_subject := coalesce(v_row->>'owner_user_id', v_row->>'subject_id');
  v_case    := v_row->>'case_id';
  if v_subject is null and v_case is not null then
    select c.owner_user_id::text into v_subject from public.cases c where c.id = v_case::uuid;
  end if;
  if v_subject is null and tg_table_name = 'consent_events' then
    select c.subject_id::text into v_subject from public.consents c where c.id = (v_row->>'consent_id')::uuid;
  end if;
  if v_subject is null and tg_table_name = 'helper_assignments' then
    select p.user_id::text into v_subject from public.people p where p.id = (v_row->>'person_id')::uuid;
  end if;
  if v_subject is null and tg_table_name = 'user_roles' then v_subject := v_row->>'user_id'; end if;

  -- hide big / private values
  foreach k in array v_redact loop
    if k <> '' and v_row ? k then v_row := jsonb_set(v_row, array[k], '"[redacted]"'); end if;
  end loop;

  if tg_op = 'UPDATE' then
    for k in select jsonb_object_keys(v_new) loop
      if k = 'updated_at' then continue; end if;
      if v_new->k is distinct from v_old->k then
        if k = any(v_redact) then
          v_changed := v_changed || jsonb_build_object(k, '"[redacted]"'::jsonb);
        else
          v_changed := v_changed || jsonb_build_object(k, jsonb_build_object('old', v_old->k, 'new', v_new->k));
        end if;
      end if;
    end loop;
    v_details := jsonb_build_object('changed', v_changed);
  elsif tg_op = 'INSERT' then
    v_details := jsonb_build_object('new', v_row);
  else
    v_details := jsonb_build_object('old', v_row);
  end if;

  v_details := v_details || jsonb_strip_nulls(jsonb_build_object(
      'subject_id', v_subject,
      'case_id', v_case,
      'actor_name', case when v_uid is null then nullif(current_setting('app.actor_name', true), '') end));

  insert into public.audit_log
    (actor_id, actor_type, actor_role, action, entity_type, entity_id, input_hash, rule_version,
     model_version, confidence, result, details, prev_hash, hash)
  values
    (v_aid, v_atype, case when v_uid is not null then app.current_role() end,
     tg_table_name || '.' || lower(tg_op), tg_table_name,
     nullif(v_row->>'id', '')::uuid,
     nullif(v_row->>'input_hash', ''),
     coalesce(nullif(v_row->>'rule_version', ''), case when tg_table_name = 'rule_sets' then v_row->>'version' end)::int,
     nullif(v_row->>'model_version', ''),
     nullif(v_row->>'confidence', '')::numeric,
     nullif(v_row->>'result', ''),
     v_details, '', '');
  return null;
end $$;

-- Attach the diary trigger to every table the contract names (plus roles and flags).
do $$
declare t record;
begin
  for t in select * from (values
      ('cases',              'draft'),
      ('decisions',          'trace,input_snapshot,explain_citizen,checks,next_step'),
      ('documents',          ''),
      ('consents',           ''),
      ('consent_events',     ''),
      ('rule_sets',          ''),
      ('rules',              ''),
      ('api_keys',           'key_hash'),
      ('helper_assignments', ''),
      ('user_roles',         ''),
      ('case_flags',         '')
    ) v(tbl, redact)
  loop
    execute format('drop trigger if exists zz_audit on public.%I', t.tbl);
    execute format('create trigger zz_audit after insert or update or delete on public.%I
                    for each row execute function app.audit_row(%L)', t.tbl, t.redact);
  end loop;
end $$;

-- Reads are not visible to triggers, so the service calls this when it shows personal data to someone.
-- (Feeds GET /data-access-log: "who has seen my data".)
create or replace function app.log_access(p_entity_type text, p_entity_id uuid, p_purpose text default null, p_subject uuid default null)
returns bigint
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare v_id bigint;
begin
  -- only staff and helpers log reads (a citizen cannot plant fake "access" entries in someone's log)
  if auth.uid() is not null and coalesce(app.current_role(), '') <> all (array['helper','admin']) then
    raise exception 'not allowed to write access entries' using errcode = '42501';
  end if;
  insert into public.audit_log
    (actor_id, actor_type, actor_role, action, entity_type, entity_id, details, prev_hash, hash)
  values
    (auth.uid(), app.actor_type_now(), case when auth.uid() is not null then app.current_role() end,
     'data.read', p_entity_type, p_entity_id,
     jsonb_strip_nulls(jsonb_build_object('purpose', p_purpose, 'subject_id', p_subject::text,
        'actor_name', case when auth.uid() is null then nullif(current_setting('app.actor_name', true), '') end)),
     '', '')
  returning id into v_id;
  return v_id;
end $$;
