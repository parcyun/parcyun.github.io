-- Discovery pages show every published review and feedback item with its
-- service tag. Service pages continue to use the scoped list RPCs.

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

  return case v_path
    when '/' then 'home'
    when '/atlas-gears' then 'atlas-gears'
    when '/world-map' then 'geoweb'
    when '/spell-drill' then 'spell-drill'
    when '/korean-spell-drill-parcyun' then 'spell-drill'
    when '/reviews' then
      case
        when v_raw ~ '[?&]source=(home|spell-drill|atlas-gears|geoweb|other)(&|$)'
          then substring(v_raw from '[?&]source=(home|spell-drill|atlas-gears|geoweb|other)(&|$)')
        when v_raw ~ '[?&]service=(home|spell-drill|atlas-gears|geoweb|other)(&|$)'
          then substring(v_raw from '[?&]service=(home|spell-drill|atlas-gears|geoweb|other)(&|$)')
        else 'other'
      end
    else 'other'
  end;
end;
$$;

create or replace function public.list_all_reviews(p_voter_id text)
returns table(id bigint, rating smallint, body text, service_key text, created_at timestamptz, like_count bigint, liked boolean)
language plpgsql security definer set search_path = public
as $$
begin
  if char_length(coalesce(p_voter_id, '')) not between 16 and 128 then
    raise exception '브라우저 식별자가 올바르지 않습니다.';
  end if;
  return query
    select r.id, r.rating, r.body, r.service_key, r.created_at,
      count(v.review_id)::bigint as like_count,
      coalesce(bool_or(v.voter_id = p_voter_id), false) as liked
    from public.reviews r
    left join public.review_votes v on v.review_id = r.id
    where r.status = 'published'
      and r.service_key <> 'unclassified'
    group by r.id, r.rating, r.body, r.service_key, r.created_at
    order by count(v.review_id) desc, r.created_at desc
    limit 50;
end;
$$;

create or replace function public.list_all_feedback()
returns table(id bigint, body text, service_key text, created_at timestamptz, like_count bigint, implemented_at timestamptz)
language sql security definer set search_path = public
as $$
  select p.id, p.body, p.service_key, p.created_at,
    count(v.post_id)::bigint as like_count, p.implemented_at
  from public.feedback_posts p
  left join public.feedback_votes v on v.post_id = p.id
  where p.status = 'published'
    and p.service_key <> 'unclassified'
  group by p.id, p.body, p.service_key, p.created_at, p.implemented_at
  order by p.created_at desc
  limit 50;
$$;

revoke all on function public.list_all_reviews(text) from public, anon, authenticated;
revoke all on function public.list_all_feedback() from public, anon, authenticated;
grant execute on function public.list_all_reviews(text) to anon, authenticated;
grant execute on function public.list_all_feedback() to anon, authenticated;

update public.resources
set url = '/spell-drill/'
where id = 'spell-drill';
