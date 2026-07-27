-- Works is a first-class service scope. Its reviews and feedback stay separate
-- from the global discovery pages and from every other service.

alter table public.reviews drop constraint if exists reviews_service_key_check;
alter table public.reviews
  add constraint reviews_service_key_check
  check (service_key in ('home', 'spell-drill', 'atlas-gears', 'geoweb', 'works', 'other', 'unclassified'));

alter table public.feedback_posts drop constraint if exists feedback_posts_service_key_check;
alter table public.feedback_posts
  add constraint feedback_posts_service_key_check
  check (service_key in ('home', 'spell-drill', 'atlas-gears', 'geoweb', 'works', 'other', 'unclassified'));

update public.feedback_posts
set service_key = 'works'
where service_key in ('other', 'unclassified')
  and lower(regexp_replace(split_part(btrim(source_path), '?', 1), '/+$', '')) like '/works%';

create or replace function public.service_key_for_source_path(p_source_path text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_raw text := lower(btrim(coalesce(p_source_path, '')));
  v_path text;
begin
  if char_length(v_raw) not between 1 and 160
    or v_raw !~ '^/[a-z0-9_./?=&%-]*$' then
    raise exception '요청 경로가 올바르지 않습니다.';
  end if;
  v_path := split_part(v_raw, '?', 1);
  v_path := regexp_replace(v_path, '/{2,}', '/', 'g');
  if v_path <> '/' then v_path := regexp_replace(v_path, '/+$', ''); end if;

  if v_path = '/works' or v_path like '/works/%' then return 'works'; end if;
  return case v_path
    when '/' then 'home'
    when '/atlas-gears' then 'atlas-gears'
    when '/world-map' then 'geoweb'
    when '/spell-drill' then 'spell-drill'
    when '/korean-spell-drill-parcyun' then 'spell-drill'
    when '/reviews' then
      case
        when v_raw ~ '[?&]source=(home|spell-drill|atlas-gears|geoweb|works|other)(&|$)'
          then substring(v_raw from '[?&]source=(home|spell-drill|atlas-gears|geoweb|works|other)(&|$)')
        when v_raw ~ '[?&]service=(home|spell-drill|atlas-gears|geoweb|works|other)(&|$)'
          then substring(v_raw from '[?&]service=(home|spell-drill|atlas-gears|geoweb|works|other)(&|$)')
        else 'other'
      end
    else 'other'
  end;
end;
$$;

-- Preserve each current function body and extend only its service allow-list.
do $$
declare
  v_definition text;
  v_function record;
begin
  for v_function in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'submit_review', 'list_reviews', 'submit_feedback', 'list_feedback',
        'admin_set_review_service', 'admin_set_feedback_service'
      )
  loop
    v_definition := pg_get_functiondef(v_function.oid);
    v_definition := replace(
      v_definition,
      '(''home'', ''spell-drill'', ''atlas-gears'', ''geoweb'', ''other'', ''unclassified'')',
      '(''home'', ''spell-drill'', ''atlas-gears'', ''geoweb'', ''works'', ''other'', ''unclassified'')'
    );
    v_definition := replace(
      v_definition,
      '(''home'', ''spell-drill'', ''atlas-gears'', ''geoweb'', ''other'')',
      '(''home'', ''spell-drill'', ''atlas-gears'', ''geoweb'', ''works'', ''other'')'
    );
    v_definition := replace(
      v_definition,
      '(''home'',''spell-drill'',''atlas-gears'',''geoweb'',''other'',''unclassified'')',
      '(''home'',''spell-drill'',''atlas-gears'',''geoweb'',''works'',''other'',''unclassified'')'
    );
    v_definition := replace(
      v_definition,
      '(''home'',''spell-drill'',''atlas-gears'',''geoweb'',''other'')',
      '(''home'',''spell-drill'',''atlas-gears'',''geoweb'',''works'',''other'')'
    );
    execute v_definition;
  end loop;
end;
$$;
