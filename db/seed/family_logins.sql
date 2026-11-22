-- Mock family members get a login too (demo PIN 246810), so Helper Mode can ask each woman for HER OWN PIN.
-- Synthetic data only. Safe to run again.
insert into public.local_users (user_id, email, password_hash)
select p.user_id, 'fam-' || substr(replace(p.user_id::text, '-', ''), 1, 12) || '@citizens.sahara.test', crypt('246810', gen_salt('bf'))
from public.people p
where p.user_id is not null
  and not exists (select 1 from public.local_users l where l.user_id = p.user_id)
on conflict do nothing;

-- Everyone with a login is also a citizen the service knows (role + profile). Safe to run again.
insert into public.profiles (user_id, full_name, language, office, person_id)
select p.user_id, coalesce(p.name_roman, 'Citizen'), 'ur', 'KHI-EAST', p.id
from public.people p
where p.user_id is not null and not exists (select 1 from public.profiles x where x.user_id = p.user_id)
on conflict do nothing;
insert into public.user_roles (user_id, role)
select p.user_id, 'citizen' from public.people p
where p.user_id is not null and not exists (select 1 from public.user_roles x where x.user_id = p.user_id)
on conflict do nothing;
