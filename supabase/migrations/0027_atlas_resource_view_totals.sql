-- ATLAS GEARS 카드별 누적 조회수. 공개 클라이언트는 테이블에 직접 접근하지 않고
-- 제한된 RPC만 호출한다. 같은 브라우저의 일별 중복 방지는 클라이언트에서 수행한다.

create table if not exists public.resource_view_totals (
  resource_id text primary key check (resource_id ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  view_count bigint not null default 0 check (view_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.resource_view_totals enable row level security;

create or replace function public.list_resource_view_totals(p_resource_ids text[])
returns table(resource_id text, view_count bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(cardinality(p_resource_ids), 0) > 100 then
    raise exception '조회할 자료 수는 100개를 넘길 수 없습니다';
  end if;

  return query
  select totals.resource_id, totals.view_count
  from public.resource_view_totals as totals
  where totals.resource_id = any(coalesce(p_resource_ids, array[]::text[]));
end;
$$;

create or replace function public.record_resource_view(p_resource_id text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total bigint;
begin
  if p_resource_id is null or p_resource_id !~ '^[a-z0-9][a-z0-9-]{0,63}$' then
    raise exception '유효하지 않은 자료 식별자입니다';
  end if;

  insert into public.resource_view_totals as totals (resource_id, view_count, updated_at)
  values (p_resource_id, 1, now())
  on conflict (resource_id) do update
  set view_count = totals.view_count + 1,
      updated_at = now()
  returning view_count into v_total;

  return v_total;
end;
$$;

revoke all on table public.resource_view_totals from anon, authenticated;
revoke all on function public.list_resource_view_totals(text[]) from public;
revoke all on function public.record_resource_view(text) from public;
grant execute on function public.list_resource_view_totals(text[]) to anon, authenticated;
grant execute on function public.record_resource_view(text) to anon, authenticated;
