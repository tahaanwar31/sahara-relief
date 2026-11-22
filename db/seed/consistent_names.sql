-- Display fix: the Urdu name must read like the English one. Only the last word (Bano/Begum/Bibi/Khatoon) is aligned.
-- Name variants across records are still tested elsewhere (NADRA / NSER records use their own spellings). Safe to run again.
update public.people p
set name_ur = regexp_replace(p.name_ur, '\S+$', t.ur)
from (values ('Bano', 'بانو'), ('Begum', 'بیگم'), ('Bibi', 'بی بی'), ('Khatoon', 'خاتون')) as t(en, ur)
where p.name_roman is not null and p.name_ur is not null
  and (regexp_match(p.name_roman, '(\S+)$'))[1] = t.en
  and array_length(regexp_split_to_array(trim(p.name_roman), '\s+'), 1) = 2
  and array_length(regexp_split_to_array(trim(p.name_ur), '\s+'), 1) = 2
  and (regexp_match(p.name_ur, '(\S+)$'))[1] <> t.ur;
