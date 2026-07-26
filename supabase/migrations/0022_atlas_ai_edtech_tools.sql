-- ATLAS GEARS: separate AI and EdTech discovery from general teaching tools.

update public.resources
set
  type = 'AI, 에듀테크 도구 찾아보기',
  subject = 'AI · 에듀테크',
  sort = 90
where id = 'ai-edtech-tools';

insert into public.resources (
  id, category, type, subject, title, description, url, external,
  thumb, lid, poster_title, date, meta, tags, sort
) values (
  'edubeige',
  '교육 활동 자료',
  'AI, 에듀테크 도구 찾아보기',
  'AI · 에듀테크',
  '에듀베이지 · 교사용 에듀테크 큐레이션',
  '과목·학년·수업 상황에 맞는 에듀테크 도구와 실제 수업 사례를 찾아보고 저장할 수 있는 교사 전용 큐레이션 서비스.',
  'https://www.edubeige.com/',
  true,
  '🔎',
  'Explore · EdTech',
  '<strong>에듀베이지</strong><br>에듀테크 큐레이션',
  '2026.07.26',
  '["2026.07.26","EDUBEIGE ↗","FOR EDUCATORS"]'::jsonb,
  '["에듀테크","도구찾기","수업사례","교사용"]'::jsonb,
  91
)
on conflict (id) do update set
  category = excluded.category,
  type = excluded.type,
  subject = excluded.subject,
  title = excluded.title,
  description = excluded.description,
  url = excluded.url,
  external = excluded.external,
  thumb = excluded.thumb,
  lid = excluded.lid,
  poster_title = excluded.poster_title,
  date = excluded.date,
  meta = excluded.meta,
  tags = excluded.tags,
  sort = excluded.sort;
