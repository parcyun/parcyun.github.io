-- Atlas 카드가 독립 서비스로 연결될 때는 카드 클릭 수가 아니라 해당 서비스의
-- 기존 전체 기간 방문자수를 우선 표시한다.

create or replace function public.list_page_visit_totals(p_paths text[])
returns table(path text, total bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(cardinality(p_paths), 0) > 100 then
    raise exception '조회할 페이지 수는 100개를 넘길 수 없습니다';
  end if;

  return query
  select visits.path, sum(visits.count)::bigint as total
  from public.page_visits as visits
  where visits.path = any(coalesce(p_paths, array[]::text[]))
  group by visits.path;
end;
$$;

revoke all on function public.list_page_visit_totals(text[]) from public;
grant execute on function public.list_page_visit_totals(text[]) to anon, authenticated;
