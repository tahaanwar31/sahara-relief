-- 01_local_auth.sql
-- LOCAL MODE ONLY. A tiny users table for AUTH_MODE=local, plus a login check function.
-- Passwords are stored as bcrypt hashes (pgcrypto crypt + gen_salt('bf')). Never plain text.
-- Safe to run more than once. Needs 00_supabase_shim.sql first.

create schema if not exists app;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.local_users (
  user_id         uuid primary key,
  email           text not null unique check (email = lower(email)),
  password_hash   text not null,
  failed_attempts int  not null default 0,
  locked_until    timestamptz,
  last_login_at   timestamptz,
  created_at      timestamptz not null default now()
);
alter table public.local_users enable row level security;   -- no policies: nobody but the owner / master key
revoke all on public.local_users from public, anon, authenticated;

-- Returns the user id when email + secret are right, otherwise NULL.
--  * A wrong email still does one bcrypt hash, so timing does not reveal if the email exists.
--  * 5 wrong tries in a row lock the account for 30 seconds (the service should add its own rate limit too).
create or replace function app.local_login(p_email text, p_secret text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  u public.local_users%rowtype;
  ok boolean;
begin
  select * into u from public.local_users where email = lower(trim(p_email));
  if not found then
    perform crypt(coalesce(p_secret, ''), gen_salt('bf'));   -- burn the same time
    return null;
  end if;
  if u.locked_until is not null and u.locked_until > now() then
    perform crypt(coalesce(p_secret, ''), gen_salt('bf'));
    return null;
  end if;
  ok := (crypt(coalesce(p_secret, ''), u.password_hash) = u.password_hash);
  if ok then
    update public.local_users
       set failed_attempts = 0, locked_until = null, last_login_at = now()
     where user_id = u.user_id;
    return u.user_id;
  end if;
  update public.local_users
     set failed_attempts = failed_attempts + 1,
         locked_until = case when failed_attempts + 1 >= 5 then now() + interval '30 seconds' else null end
   where user_id = u.user_id;
  return null;
end $$;

revoke all on function app.local_login(text, text) from public, anon, authenticated;
grant execute on function app.local_login(text, text) to service_role;
