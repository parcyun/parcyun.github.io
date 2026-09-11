-- 기존 resource_hits/bump_resource 집계를 Atlas 카드 조회수의 단일 원자료로 사용한다.
-- 0027에서 생성했던 중복 테이블은 제거하고, 필요한 합계 읽기 RPC만 추가한다.

drop function if exists public.list_resource_view_totals(text[]);
drop function if exists public.record_resource_view(text);
drop table if exists public.resource_view_totals;

create or replace function public.list_resource_click_totals(p_resource_ids text[])
returns table(resource_id text, total bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(cardinality(p_resource_ids), 0) > 100 then
    raise exception '조회할 자료 수는 100개를 넘길 수 없습니다';
  end if;

  return query
  select hits.resource_id, sum(hits.count)::bigint as total
  from public.resource_hits as hits
  where hits.resource_id = any(coalesce(p_resource_ids, array[]::text[]))
    and hits.kind = 'click'
  group by hits.resource_id;
end;
$$;

revoke all on function public.list_resource_click_totals(text[]) from public;
grant execute on function public.list_resource_click_totals(text[]) to anon, authenticated;
