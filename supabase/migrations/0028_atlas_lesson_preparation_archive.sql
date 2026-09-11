-- ATLAS GEARS의 AI·에듀테크 탐색 도구를 더 넓은 수업준비 범주로 정리하고,
-- 한 해 살이 기록 아카이브를 같은 범주에 추가한다.

update public.resources
set type = '수업준비', subject = 'AI · 에듀테크'
where type = 'AI, 에듀테크 도구 찾아보기';

insert into public.resources (
  id, category, type, subject, title, description, url, external,
  thumb, lid, poster_title, date, meta, tags, sort
) values (
  'yearly-life-archive',
  '교육 활동 자료',
  '수업준비',
  '학급 운영 · 기록',
  '한 해 살이 아카이브',
  '한 해 동안의 수업과 학교생활을 기록하고 되돌아볼 수 있도록 모아둔 Notion 아카이브.',
  'https://app.notion.com/p/parcyun/3133f99a82238159a0b3e9eba02d462c?source=copy_link',
  true,
  '📚',
  'Archive · School Year',
  '<strong>한 해 살이</strong><br>아카이브',
  '2026.09.11',
  '["NOTION ↗","학급 운영","교사용"]'::jsonb,
  '["학급운영","기록","수업준비","아카이브"]'::jsonb,
  92
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
