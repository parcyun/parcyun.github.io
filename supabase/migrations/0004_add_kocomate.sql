-- ATLAS GEARS(교육 활동 자료)에 KOCOMATE 추가 (네패스/kocoafab 교사용 수업 보조 도구)
-- 라이브 사이트는 Supabase resources 테이블을 읽으므로, resources.ts 뿐 아니라 이 INSERT도 실행해야 노출됨.
-- 실행: Supabase 대시보드 > SQL Editor. (재실행 안전 — id 충돌 시 갱신)
-- ※ 관리자로 로그인 후 ATLAS GEARS의 "+ 자료 추가"로 넣어도 동일합니다.

insert into public.resources
  (id, category, type, subject, title, description, url, external, thumb, lid, poster_title, date, meta, tags, sort)
values
  ('kocomate', '교육 활동 자료', '인터랙티브', '수업 도구',
   'KOCOMATE · 수업 보조 도구',
   '네패스(kocoafab)가 만든 교사용 수업 보조 도구. 교실 수업을 돕는 기능을 웹에서 바로 활용할 수 있어요.',
   'https://kocoafab.cc/edu/kocomate', true, '🧰', 'Tool · Teaching',
   '<strong>KOCOMATE</strong><br>수업 보조 도구', '2026.07.10',
   '["2026.07.10","KOCOAFAB ↗","교사용"]', '["수업도구","보조도구","kocoafab"]', 75)
on conflict (id) do update set
  category=excluded.category, type=excluded.type, subject=excluded.subject, title=excluded.title,
  description=excluded.description, url=excluded.url, external=excluded.external, thumb=excluded.thumb,
  lid=excluded.lid, poster_title=excluded.poster_title, date=excluded.date, meta=excluded.meta,
  tags=excluded.tags, sort=excluded.sort;
