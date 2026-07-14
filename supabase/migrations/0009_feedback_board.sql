-- 기능 개선 요청 게시판: 공개 작성 → 관리자 승인 후 공개, 브라우저별 공감 1회.
create table if not exists public.feedback_posts (
  id          bigint generated always as identity primary key,
  body        text not null check (char_length(body) between 3 and 1000),
  source_path text not null check (char_length(source_path) between 1 and 160),
  author_id   text not null check (char_length(author_id) between 16 and 128),
  status      text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.feedback_votes (
  post_id    bigint not null references public.feedback_posts(id) on delete cascade,
  voter_id   text not null check (char_length(voter_id) between 16 and 128),
  created_at timestamptz not null default now(),
  primary key (post_id, voter_id)
);

create index if not exists feedback_posts_public_idx on public.feedback_posts (status, created_at desc);
create index if not exists feedback_posts_author_idx on public.feedback_posts (author_id, created_at desc);

alter table public.feedback_posts enable row level security;
alter table public.feedback_votes enable row level security;

create or replace function public.submit_feedback(p_body text, p_source_path text, p_author_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  if char_length(trim(coalesce(p_body, ''))) not between 3 and 1000 then
    raise exception '요청 내용은 3~1000자로 작성해 주세요.';
  end if;
  if char_length(trim(coalesce(p_source_path, ''))) not between 1 and 160 then
    raise exception '요청 경로가 올바르지 않습니다.';
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

  insert into public.feedback_posts (body, source_path, author_id)
  values (trim(p_body), trim(p_source_path), p_author_id)
  returning id into v_id;

  return json_build_object('id', v_id, 'status', 'pending');
end;
$$;

create or replace function public.list_feedback()
returns table (id bigint, body text, created_at timestamptz, like_count bigint)
language sql
security definer
set search_path = public
as $$
  select p.id, p.body, p.created_at, count(v.post_id)::bigint as like_count
  from public.feedback_posts p
  left join public.feedback_votes v on v.post_id = p.id
  where p.status = 'published'
  group by p.id, p.body, p.created_at
  order by p.created_at desc
  limit 50;
$$;

create or replace function public.toggle_feedback_like(p_post_id bigint, p_voter_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_liked boolean;
  v_like_count bigint;
begin
  if char_length(coalesce(p_voter_id, '')) not between 16 and 128 then
    raise exception '브라우저 식별자가 올바르지 않습니다.';
  end if;
  if not exists (
    select 1 from public.feedback_posts where id = p_post_id and status = 'published'
  ) then
    raise exception '공개된 요청만 공감할 수 있습니다.';
  end if;

  delete from public.feedback_votes where post_id = p_post_id and voter_id = p_voter_id;
  if found then
    v_liked := false;
  else
    insert into public.feedback_votes (post_id, voter_id) values (p_post_id, p_voter_id);
    v_liked := true;
  end if;

  select count(*) into v_like_count from public.feedback_votes where post_id = p_post_id;
  return json_build_object('liked', v_liked, 'like_count', v_like_count);
end;
$$;

create or replace function public.admin_list_feedback(p_pw text)
returns table (id bigint, body text, source_path text, status text, created_at timestamptz, reviewed_at timestamptz, like_count bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.admin_check(p_pw) then raise exception '인증 실패'; end if;
  return query
    select p.id, p.body, p.source_path, p.status, p.created_at, p.reviewed_at, count(v.post_id)::bigint
    from public.feedback_posts p
    left join public.feedback_votes v on v.post_id = p.id
    group by p.id, p.body, p.source_path, p.status, p.created_at, p.reviewed_at
    order by case p.status when 'pending' then 0 when 'published' then 1 else 2 end, p.created_at desc;
end;
$$;

create or replace function public.admin_set_feedback_status(p_pw text, p_id bigint, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.admin_check(p_pw) then raise exception '인증 실패'; end if;
  if p_status not in ('published', 'rejected') then raise exception '허용되지 않는 상태입니다.'; end if;
  update public.feedback_posts set status = p_status, reviewed_at = now() where id = p_id;
  if not found then raise exception '요청을 찾을 수 없습니다.'; end if;
end;
$$;

revoke all on function public.submit_feedback(text, text, text) from public;
revoke all on function public.list_feedback() from public;
revoke all on function public.toggle_feedback_like(bigint, text) from public;
revoke all on function public.admin_list_feedback(text) from public;
revoke all on function public.admin_set_feedback_status(text, bigint, text) from public;

grant execute on function public.submit_feedback(text, text, text) to anon, authenticated;
grant execute on function public.list_feedback() to anon, authenticated;
grant execute on function public.toggle_feedback_like(bigint, text) to anon, authenticated;
grant execute on function public.admin_list_feedback(text) to anon, authenticated;
grant execute on function public.admin_set_feedback_status(text, bigint, text) to anon, authenticated;
