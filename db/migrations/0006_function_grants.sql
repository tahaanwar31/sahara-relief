-- 0006_function_grants.sql : who may call the functions in schema app.
-- Postgres lets everybody (PUBLIC) call every new function. We turn that off, then allow only the
-- logged-in role and the service role. Anonymous callers get nothing.
-- Safe to run more than once.

set search_path = public, extensions;

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as f
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'app' and p.proname <> 'local_login'
  loop
    execute format('revoke all on function %s from public', r.f);
    execute format('revoke all on function %s from anon', r.f);
    execute format('grant execute on function %s to authenticated', r.f);
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      execute format('grant execute on function %s to service_role', r.f);
    end if;
  end loop;
end $$;

-- The mock schema is private: no user role may even look at it.
revoke all on schema mock from public, anon, authenticated;
revoke all on all tables in schema mock from public, anon, authenticated;
