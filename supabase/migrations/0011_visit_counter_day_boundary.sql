-- 방문자 "오늘"은 한국시간 오전 6시부터 다음 날 오전 5시 59분까지 집계한다.
-- DB 타임존은 UTC로 유지하고, 집계 키만 KST 기준으로 계산한다.

create or replace function public.bump_visit(p_path text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := timezone('Asia/Seoul', now() - interval '6 hours')::date;
  v_page_today int;
  v_page_total int;
  v_all_today int;
  v_all_total int;
begin
  insert into public.page_visits(day, path, count)
  values (v_day, p_path, 1)
  on conflict (day, path) do update set count = public.page_visits.count + 1
  returning count into v_page_today;

  select coalesce(sum(count), 0)
  into v_page_total
  from public.page_visits
  where path = p_path;

  select coalesce(sum(count), 0)
  into v_all_today
  from public.page_visits
  where day = v_day;

  select coalesce(sum(count), 0)
  into v_all_total
  from public.page_visits;

  return json_build_object(
    'page_today', v_page_today,
    'page_total', v_page_total,
    'all_today', v_all_today,
    'all_total', v_all_total
  );
end;
$$;

create or replace function public.get_visit_totals(p_paths text[])
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := timezone('Asia/Seoul', now() - interval '6 hours')::date;
begin
  return (
    select json_build_object(
      'today', coalesce(sum(count) filter (where day = v_day), 0),
      'total', coalesce(sum(count), 0)
    )
    from public.page_visits
    where path = any(coalesce(p_paths, array[]::text[]))
  );
end;
$$;

revoke all on function public.bump_visit(text) from public;
grant execute on function public.bump_visit(text) to anon, authenticated;
revoke all on function public.get_visit_totals(text[]) from public;
grant execute on function public.get_visit_totals(text[]) to anon, authenticated;
