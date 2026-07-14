-- ATLAS GEARS에 포함된 내부 페이지들의 방문 합계를 반환한다.
-- page_visits는 RLS가 활성화돼 있으므로 공개 클라이언트는 이 제한된 집계 RPC만 호출한다.
create or replace function public.get_visit_totals(p_paths text[])
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  return (
    select json_build_object(
      'today', coalesce(sum(count) filter (where day = current_date), 0),
      'total', coalesce(sum(count), 0)
    )
    from public.page_visits
    where path = any(coalesce(p_paths, array[]::text[]))
  );
end;
$$;

revoke all on function public.get_visit_totals(text[]) from public;
grant execute on function public.get_visit_totals(text[]) to anon, authenticated;
