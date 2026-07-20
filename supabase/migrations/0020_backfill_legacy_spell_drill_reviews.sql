-- Reviews collected before service scoping came from the Spell Drill session.
-- Keep later unclassified submissions untouched for explicit administrator tagging.
update public.reviews
set service_key = 'spell-drill'
where service_key = 'unclassified'
  and created_at < timestamptz '2026-07-20 10:05:09+00';
