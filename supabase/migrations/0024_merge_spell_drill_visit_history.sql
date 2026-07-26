-- 이전 긴 주소와 현재 짧은 주소의 Spell Drill 조회수를 날짜별로 합친다.
-- canonical 행도 집계 원본에 포함하므로 같은 날짜의 기존 조회수가 빠지지 않는다.
with merged as (
  select
    day,
    sum(count)::integer as count
  from public.page_visits
  where path in (
    '/spell-drill/',
    '/spell-drill',
    '/korean-spell-drill-parcyun/',
    '/korean-spell-drill-parcyun'
  )
  group by day
)
insert into public.page_visits (day, path, count)
select day, '/spell-drill/', count
from merged
on conflict (day, path) do update
set count = excluded.count;

delete from public.page_visits
where path in (
  '/spell-drill',
  '/korean-spell-drill-parcyun/',
  '/korean-spell-drill-parcyun'
);
