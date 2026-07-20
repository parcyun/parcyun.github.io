-- Service-scoped public feedback and reviews. Legacy reviews remain unclassified
-- until an administrator explicitly assigns a service; feedback paths can be mapped.
alter table public.reviews add column if not exists service_key text not null default 'unclassified';
alter table public.feedback_posts add column if not exists service_key text not null default 'unclassified';

update public.feedback_posts
set service_key = 'geoweb'
where service_key = 'unclassified'
  and lower(regexp_replace(split_part(btrim(source_path), '?', 1), '/+$', '')) = '/world-map';

update public.feedback_posts
set service_key = 'spell-drill'
where service_key = 'unclassified'
  and lower(regexp_replace(split_part(btrim(source_path), '?', 1), '/+$', '')) = '/korean-spell-drill-parcyun';

update public.feedback_posts
set service_key = 'atlas-gears'
where service_key = 'unclassified'
  and lower(regexp_replace(split_part(btrim(source_path), '?', 1), '/+$', '')) = '/atlas-gears';

update public.feedback_posts
set service_key = 'home'
where service_key = 'unclassified' and btrim(source_path) = '/';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'reviews_service_key_check') then
    alter table public.reviews add constraint reviews_service_key_check
      check (service_key in ('home', 'spell-drill', 'atlas-gears', 'geoweb', 'other', 'unclassified'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'feedback_posts_service_key_check') then
    alter table public.feedback_posts add constraint feedback_posts_service_key_check
      check (service_key in ('home', 'spell-drill', 'atlas-gears', 'geoweb', 'other', 'unclassified'));
  end if;
end;
$$;

create index if not exists reviews_service_status_created_at_idx
  on public.reviews (service_key, status, created_at desc);
create index if not exists feedback_posts_service_status_created_at_idx
  on public.feedback_posts (service_key, status, created_at desc);

create table if not exists public.review_votes (
  review_id bigint not null references public.reviews(id) on delete cascade,
  voter_id text not null check (char_length(voter_id) between 16 and 128),
  created_at timestamptz not null default now(),
  primary key (review_id, voter_id)
);

alter table public.reviews enable row level security;
alter table public.feedback_posts enable row level security;
alter table public.review_votes enable row level security;
revoke all on table public.reviews from public, anon, authenticated;
revoke all on table public.feedback_posts from public, anon, authenticated;
revoke all on table public.review_votes from public, anon, authenticated;

-- Only exact public routes are classified. The reviews route may carry a
-- validated service query; arbitrary paths and invalid queries become "other".
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
    when '/korean-spell-drill-parcyun' then 'spell-drill'
    when '/reviews' then
      case
        when v_raw ~ '[?&]service=(home|spell-drill|atlas-gears|geoweb|other)(&|$)'
          then substring(v_raw from '[?&]service=(home|spell-drill|atlas-gears|geoweb|other)(&|$)')
        else 'other'
      end
    else 'other'
  end;
end;
$$;

create or replace function public.submit_review(p_rating integer, p_body text, p_service_key text, p_voter_id text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  clean_body text;
  normalized text;
  blocked text[] := array['시발','씨발','병신','좆','개새끼','꺼져','죽어','멍청이','한남','한녀','페미년','틀딱','등신','지랄','fuck','shit','bitch','idiot','stupid'];
  term text;
  review_id bigint;
begin
  if p_service_key is null
    or p_service_key = 'unclassified'
    or p_service_key not in ('home', 'spell-drill', 'atlas-gears', 'geoweb', 'other') then
    raise exception '허용되지 않은 서비스입니다.';
  end if;
  if char_length(coalesce(p_voter_id, '')) not between 16 and 128 then
    raise exception '브라우저 식별자가 올바르지 않습니다.';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    return jsonb_build_object('ok', false, 'error', '별점은 1점에서 5점 사이여야 합니다.');
  end if;
  clean_body := btrim(regexp_replace(coalesce(p_body, ''), '<[^>]*>', '', 'g'));
  clean_body := regexp_replace(clean_body, '\s+', ' ', 'g');
  if char_length(clean_body) < 1 or char_length(clean_body) > 500 then
    return jsonb_build_object('ok', false, 'error', '리뷰는 1자 이상 500자 이하로 작성해 주세요.');
  end if;
  normalized := lower(clean_body);
  foreach term in array blocked loop
    if position(lower(term) in normalized) > 0 then
      return jsonb_build_object('ok', false, 'error', '공격적이거나 부적절한 표현은 등록할 수 없습니다.');
    end if;
  end loop;
  insert into public.reviews(rating, body, status, service_key)
  values (p_rating, clean_body, 'pending', p_service_key)
  returning id into review_id;
  return jsonb_build_object('ok', true, 'id', review_id, 'status', 'pending');
end;
$$;

create or replace function public.list_reviews(p_service_key text, p_voter_id text)
returns table(id bigint, rating smallint, body text, created_at timestamptz, like_count bigint, liked boolean)
language plpgsql security definer set search_path = public
as $$
begin
  if p_service_key is null or p_service_key not in ('home', 'spell-drill', 'atlas-gears', 'geoweb', 'other', 'unclassified') then
    raise exception '허용되지 않은 서비스입니다.';
  end if;
  if char_length(coalesce(p_voter_id, '')) not between 16 and 128 then
    raise exception '브라우저 식별자가 올바르지 않습니다.';
  end if;
  return query
    select r.id, r.rating, r.body, r.created_at,
      count(v.review_id)::bigint as like_count,
      coalesce(bool_or(v.voter_id = p_voter_id), false) as liked
    from public.reviews r
    left join public.review_votes v on v.review_id = r.id
    where r.status = 'published'
      and r.service_key = p_service_key
      and p_service_key <> 'unclassified'
    group by r.id, r.rating, r.body, r.created_at
    order by count(v.review_id) desc, r.created_at desc
    limit 50;
end;
$$;

-- Migration-first deploy compatibility. Existing one-argument clients remain
-- service-scoped; the no-argument legacy endpoint intentionally exposes no rows.
create or replace function public.list_reviews(p_service_key text)
returns table(id bigint, rating smallint, body text, created_at timestamptz, like_count bigint)
language plpgsql security definer set search_path = public
as $$
begin
  if p_service_key is null or p_service_key not in ('home', 'spell-drill', 'atlas-gears', 'geoweb', 'other', 'unclassified') then
    raise exception '허용되지 않은 서비스입니다.';
  end if;
  return query
    select r.id, r.rating, r.body, r.created_at, count(v.review_id)::bigint
    from public.reviews r
    left join public.review_votes v on v.review_id = r.id
    where r.status = 'published'
      and r.service_key = p_service_key
      and p_service_key <> 'unclassified'
    group by r.id, r.rating, r.body, r.created_at
    order by count(v.review_id) desc, r.created_at desc
    limit 50;
end;
$$;

create or replace function public.list_reviews()
returns table(id bigint, rating smallint, body text, created_at timestamptz)
language sql security definer set search_path = public
as $$
  select r.id, r.rating, r.body, r.created_at
  from public.reviews r
  where false;
$$;

create or replace function public.submit_review(p_rating integer, p_body text)
returns jsonb language sql security definer set search_path = public
as $$
  select jsonb_build_object(
    'ok', false,
    'error', '리뷰 페이지를 새로고침한 뒤 다시 등록해 주세요.'
  );
$$;

create or replace function public.toggle_review_like(p_review_id bigint, p_voter_id text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_liked boolean;
  v_like_count bigint;
begin
  if char_length(coalesce(p_voter_id, '')) not between 16 and 128 then
    raise exception '브라우저 식별자가 올바르지 않습니다.';
  end if;
  if not exists (
    select 1 from public.reviews where id = p_review_id and status = 'published'
  ) then
    raise exception '공개된 리뷰만 공감할 수 있습니다.';
  end if;

  delete from public.review_votes where review_id = p_review_id and voter_id = p_voter_id;
  if found then
    v_liked := false;
  else
    insert into public.review_votes (review_id, voter_id) values (p_review_id, p_voter_id);
    v_liked := true;
  end if;

  select count(*) into v_like_count from public.review_votes where review_id = p_review_id;
  return jsonb_build_object('liked', v_liked, 'like_count', v_like_count);
end;
$$;

create or replace function public.submit_feedback(p_body text, p_source_path text, p_author_id text, p_service_key text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_id bigint;
  v_derived_service text;
  v_normalized_path text;
begin
  if p_service_key is null
    or p_service_key = 'unclassified'
    or p_service_key not in ('home', 'spell-drill', 'atlas-gears', 'geoweb', 'other') then
    raise exception '허용되지 않은 서비스입니다.';
  end if;
  v_derived_service := public.service_key_for_source_path(p_source_path);
  if p_service_key is distinct from v_derived_service then
    raise exception '요청 경로와 서비스가 일치하지 않습니다.';
  end if;
  if char_length(trim(coalesce(p_body, ''))) not between 3 and 1000 then
    raise exception '요청 내용은 3~1000자로 작성해 주세요.';
  end if;
  if char_length(coalesce(p_author_id, '')) not between 16 and 128 then
    raise exception '브라우저 식별자가 올바르지 않습니다.';
  end if;
  if exists (
    select 1 from public.feedback_posts
    where author_id = p_author_id and created_at > now() - interval '3 minutes'
  ) then
    raise exception '요청은 3분에 한 번만 등록할 수 있습니다.';
  end if;

  v_normalized_path := split_part(lower(btrim(p_source_path)), '?', 1);
  v_normalized_path := regexp_replace(v_normalized_path, '/{2,}', '/', 'g');
  if v_normalized_path <> '/' then
    v_normalized_path := regexp_replace(v_normalized_path, '/+$', '') || '/';
  end if;
  if v_normalized_path = '/reviews/' and v_derived_service <> 'other' then
    v_normalized_path := v_normalized_path || '?service=' || v_derived_service;
  end if;

  insert into public.feedback_posts (body, source_path, author_id, service_key)
  values (trim(p_body), v_normalized_path, p_author_id, v_derived_service)
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'status', 'pending');
end;
$$;

-- Legacy submission can safely derive its service from the exact source path.
create or replace function public.submit_feedback(p_body text, p_source_path text, p_author_id text)
returns json language plpgsql security definer set search_path = public
as $$
begin
  return public.submit_feedback(
    p_body,
    p_source_path,
    p_author_id,
    public.service_key_for_source_path(p_source_path)
  )::json;
end;
$$;

create or replace function public.list_feedback(p_service_key text)
returns table(id bigint, body text, created_at timestamptz, like_count bigint)
language plpgsql security definer set search_path = public
as $$
begin
  if p_service_key is null or p_service_key not in ('home', 'spell-drill', 'atlas-gears', 'geoweb', 'other', 'unclassified') then
    raise exception '허용되지 않은 서비스입니다.';
  end if;
  return query
    select p.id, p.body, p.created_at, count(v.post_id)::bigint as like_count
    from public.feedback_posts p
    left join public.feedback_votes v on v.post_id = p.id
    where p.status = 'published'
      and p.service_key = p_service_key
      and p_service_key <> 'unclassified'
    group by p.id, p.body, p.created_at
    order by p.created_at desc
    limit 50;
end;
$$;

create or replace function public.list_feedback()
returns table(id bigint, body text, created_at timestamptz, like_count bigint)
language sql security definer set search_path = public
as $$
  select p.id, p.body, p.created_at, 0::bigint
  from public.feedback_posts p
  where false;
$$;

-- Admin list return types are extended, so these two signatures must be
-- recreated. Public client compatibility wrappers above remain intact.
drop function if exists public.admin_list_reviews(text);
drop function if exists public.admin_list_feedback(text);

create or replace function public.admin_list_reviews(p_pw text)
returns table(id bigint, rating smallint, body text, status text, moderation_reason text, service_key text, created_at timestamptz, reviewed_at timestamptz, like_count bigint)
language plpgsql security definer set search_path = public
as $$
begin
  if not public.admin_check(p_pw) then raise exception '관리자 인증이 필요합니다.'; end if;
  return query
    select r.id, r.rating, r.body, r.status, r.moderation_reason, r.service_key, r.created_at, r.reviewed_at, count(v.review_id)::bigint
    from public.reviews r
    left join public.review_votes v on v.review_id = r.id
    group by r.id, r.rating, r.body, r.status, r.moderation_reason, r.service_key, r.created_at, r.reviewed_at
    order by case r.status when 'pending' then 0 when 'published' then 1 else 2 end, r.created_at desc;
end;
$$;

create or replace function public.admin_list_feedback(p_pw text)
returns table(id bigint, body text, source_path text, status text, service_key text, created_at timestamptz, reviewed_at timestamptz, like_count bigint)
language plpgsql security definer set search_path = public
as $$
begin
  if not public.admin_check(p_pw) then raise exception '인증 실패'; end if;
  return query
    select p.id, p.body, p.source_path, p.status, p.service_key, p.created_at, p.reviewed_at, count(v.post_id)::bigint
    from public.feedback_posts p
    left join public.feedback_votes v on v.post_id = p.id
    group by p.id, p.body, p.source_path, p.status, p.service_key, p.created_at, p.reviewed_at
    order by case p.status when 'pending' then 0 when 'published' then 1 else 2 end, p.created_at desc;
end;
$$;

create or replace function public.admin_set_review_status(p_pw text, p_id bigint, p_status text)
returns jsonb language plpgsql security definer set search_path = public
as $$
begin
  if not public.admin_check(p_pw) then raise exception '관리자 인증이 필요합니다.'; end if;
  if p_status not in ('pending', 'published', 'rejected') then raise exception '잘못된 리뷰 상태입니다.'; end if;
  update public.reviews
  set status = p_status, reviewed_at = case when p_status = 'pending' then null else now() end
  where id = p_id;
  if not found then raise exception '리뷰를 찾을 수 없습니다.'; end if;
  return jsonb_build_object('ok', true, 'status', p_status);
end;
$$;

create or replace function public.admin_set_review_service(p_pw text, p_id bigint, p_service_key text)
returns jsonb language plpgsql security definer set search_path = public
as $$
begin
  if not public.admin_check(p_pw) then raise exception '관리자 인증이 필요합니다.'; end if;
  if p_service_key is null or p_service_key not in ('home', 'spell-drill', 'atlas-gears', 'geoweb', 'other', 'unclassified') then
    raise exception '허용되지 않은 서비스입니다.';
  end if;
  update public.reviews set service_key = p_service_key where id = p_id;
  if not found then raise exception '리뷰를 찾을 수 없습니다.'; end if;
  return jsonb_build_object('ok', true, 'service_key', p_service_key);
end;
$$;

create or replace function public.admin_set_feedback_service(p_pw text, p_id bigint, p_service_key text)
returns jsonb language plpgsql security definer set search_path = public
as $$
begin
  if not public.admin_check(p_pw) then raise exception '인증 실패'; end if;
  if p_service_key is null or p_service_key not in ('home', 'spell-drill', 'atlas-gears', 'geoweb', 'other', 'unclassified') then
    raise exception '허용되지 않은 서비스입니다.';
  end if;
  update public.feedback_posts set service_key = p_service_key where id = p_id;
  if not found then raise exception '요청을 찾을 수 없습니다.'; end if;
  return jsonb_build_object('ok', true, 'service_key', p_service_key);
end;
$$;

create or replace function public.admin_delete_review(p_pw text, p_id bigint)
returns jsonb language plpgsql security definer set search_path = public
as $$
begin
  if not public.admin_check(p_pw) then raise exception '관리자 인증이 필요합니다.'; end if;
  delete from public.reviews where id = p_id;
  if not found then raise exception '리뷰를 찾을 수 없습니다.'; end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_delete_feedback(p_pw text, p_id bigint)
returns jsonb language plpgsql security definer set search_path = public
as $$
begin
  if not public.admin_check(p_pw) then raise exception '인증 실패'; end if;
  delete from public.feedback_posts where id = p_id;
  if not found then raise exception '요청을 찾을 수 없습니다.'; end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.service_key_for_source_path(text) from public, anon, authenticated;
revoke all on function public.submit_review(integer, text, text, text) from public, anon, authenticated;
revoke all on function public.submit_review(integer, text) from public, anon, authenticated;
revoke all on function public.list_reviews(text, text) from public, anon, authenticated;
revoke all on function public.list_reviews(text) from public, anon, authenticated;
revoke all on function public.list_reviews() from public, anon, authenticated;
revoke all on function public.toggle_review_like(bigint, text) from public, anon, authenticated;
revoke all on function public.submit_feedback(text, text, text, text) from public, anon, authenticated;
revoke all on function public.submit_feedback(text, text, text) from public, anon, authenticated;
revoke all on function public.list_feedback(text) from public, anon, authenticated;
revoke all on function public.list_feedback() from public, anon, authenticated;
revoke all on function public.admin_list_reviews(text) from public, anon, authenticated;
revoke all on function public.admin_list_feedback(text) from public, anon, authenticated;
revoke all on function public.admin_set_review_service(text, bigint, text) from public, anon, authenticated;
revoke all on function public.admin_set_feedback_service(text, bigint, text) from public, anon, authenticated;
revoke all on function public.admin_delete_review(text, bigint) from public, anon, authenticated;
revoke all on function public.admin_delete_feedback(text, bigint) from public, anon, authenticated;
revoke all on function public.toggle_feedback_like(bigint, text) from public, anon, authenticated;
revoke all on function public.admin_set_review_status(text, bigint, text) from public, anon, authenticated;
revoke all on function public.admin_set_feedback_status(text, bigint, text) from public, anon, authenticated;

grant execute on function public.submit_review(integer, text, text, text) to anon, authenticated;
grant execute on function public.submit_review(integer, text) to anon, authenticated;
grant execute on function public.list_reviews(text, text) to anon, authenticated;
grant execute on function public.list_reviews(text) to anon, authenticated;
grant execute on function public.list_reviews() to anon, authenticated;
grant execute on function public.toggle_review_like(bigint, text) to anon, authenticated;
grant execute on function public.submit_feedback(text, text, text, text) to anon, authenticated;
grant execute on function public.submit_feedback(text, text, text) to anon, authenticated;
grant execute on function public.list_feedback(text) to anon, authenticated;
grant execute on function public.list_feedback() to anon, authenticated;
grant execute on function public.admin_list_reviews(text) to anon, authenticated;
grant execute on function public.admin_list_feedback(text) to anon, authenticated;
grant execute on function public.admin_set_review_service(text, bigint, text) to anon, authenticated;
grant execute on function public.admin_set_feedback_service(text, bigint, text) to anon, authenticated;
grant execute on function public.admin_delete_review(text, bigint) to anon, authenticated;
grant execute on function public.admin_delete_feedback(text, bigint) to anon, authenticated;
grant execute on function public.toggle_feedback_like(bigint, text) to anon, authenticated;
grant execute on function public.admin_set_review_status(text, bigint, text) to anon, authenticated;
grant execute on function public.admin_set_feedback_status(text, bigint, text) to anon, authenticated;
