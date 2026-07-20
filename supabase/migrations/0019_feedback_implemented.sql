alter table public.feedback_posts
  add column if not exists implemented_at timestamptz;

drop function if exists public.list_feedback(text);
drop function if exists public.admin_list_feedback(text);

create or replace function public.list_feedback(p_service_key text)
returns table(id bigint, body text, created_at timestamptz, like_count bigint, implemented_at timestamptz)
language plpgsql security definer set search_path = public
as $$
begin
  if p_service_key is null or p_service_key not in ('home', 'spell-drill', 'atlas-gears', 'geoweb', 'other', 'unclassified') then
    raise exception '허용되지 않은 서비스입니다.';
  end if;
  return query
    select p.id, p.body, p.created_at, count(v.post_id)::bigint, p.implemented_at
    from public.feedback_posts p
    left join public.feedback_votes v on v.post_id = p.id
    where p.status = 'published'
      and p.service_key = p_service_key
      and p_service_key <> 'unclassified'
    group by p.id, p.body, p.created_at, p.implemented_at
    order by p.created_at desc
    limit 50;
end;
$$;

create or replace function public.admin_list_feedback(p_pw text)
returns table(id bigint, body text, source_path text, status text, service_key text, created_at timestamptz, reviewed_at timestamptz, implemented_at timestamptz, like_count bigint)
language plpgsql security definer set search_path = public
as $$
begin
  if not public.admin_check(p_pw) then raise exception '인증 실패'; end if;
  return query
    select p.id, p.body, p.source_path, p.status, p.service_key, p.created_at, p.reviewed_at, p.implemented_at, count(v.post_id)::bigint
    from public.feedback_posts p
    left join public.feedback_votes v on v.post_id = p.id
    group by p.id, p.body, p.source_path, p.status, p.service_key, p.created_at, p.reviewed_at, p.implemented_at
    order by case p.status when 'pending' then 0 when 'published' then 1 else 2 end, p.created_at desc;
end;
$$;

create or replace function public.admin_mark_feedback_implemented(p_pw text, p_id bigint)
returns jsonb language plpgsql security definer set search_path = public
as $$
begin
  if not public.admin_check(p_pw) then raise exception '인증 실패'; end if;
  update public.feedback_posts
  set implemented_at = now()
  where id = p_id and status = 'published';
  if not found then raise exception '공개된 개선 요청을 찾을 수 없습니다.'; end if;
  return jsonb_build_object('ok', true, 'implemented_at', now());
end;
$$;

revoke all on function public.list_feedback(text) from public, anon, authenticated;
revoke all on function public.admin_list_feedback(text) from public, anon, authenticated;
revoke all on function public.admin_mark_feedback_implemented(text, bigint) from public, anon, authenticated;

grant execute on function public.list_feedback(text) to anon, authenticated;
grant execute on function public.admin_list_feedback(text) to anon, authenticated;
grant execute on function public.admin_mark_feedback_implemented(text, bigint) to anon, authenticated;
