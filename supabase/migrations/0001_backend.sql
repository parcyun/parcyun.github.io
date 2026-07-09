-- parcyun studio · 백엔드 스키마 (기존 Supabase 프로젝트 myeouecgpjxcddemexcg 재사용)
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 실행하세요. (idempotent — 재실행 안전)
-- 기능: ① 자료 DB화(resources/works) ② 방명록(guestbook) ③ 조회·다운로드 집계(resource_hits + bump_resource)

-- ========== ① 자료 (강의 + 활동) ==========
create table if not exists public.resources (
  id           text primary key,
  category     text not null,          -- '강의 자료' | '교육 활동 자료'
  type         text not null,          -- 게임/인터랙티브/활동지/커리큘럼/강의/실습/가이드/아카이브
  subject      text not null default '',
  title        text not null,
  description  text not null default '',
  url          text not null,
  external     boolean not null default false,
  thumb        text default '',
  lid          text default '',
  poster_title text default '',
  date         text default '',
  meta         jsonb not null default '[]'::jsonb,
  tags         jsonb not null default '[]'::jsonb,
  sort         int  not null default 0,
  published    boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists public.works (
  num          text primary key,
  title        text not null,
  title_html   text not null default '',
  description  text not null default '',
  week         text default '',
  url          text default '',
  status       text not null default 'live',   -- 'live' | 'soon'
  tags         jsonb not null default '[]'::jsonb,
  sort         int  not null default 0,
  published    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ========== ② 방명록 / 피드백 ==========
create table if not exists public.guestbook (
  id         bigint generated always as identity primary key,
  context    text default '',          -- 어느 페이지/자료에 남겼는지 (선택)
  name       text default '익명',
  message    text not null,
  created_at timestamptz not null default now(),
  approved   boolean not null default true
);
create index if not exists guestbook_created_idx on public.guestbook (created_at desc);

-- ========== ③ 자료 조회·다운로드 집계 ==========
create table if not exists public.resource_hits (
  resource_id text not null,
  kind        text not null,           -- 'click' | 'download' | 'view'
  day         date not null default current_date,
  count       int  not null default 0,
  primary key (resource_id, kind, day)
);

-- 집계 증가 RPC (visitor의 bump_visit 패턴) — security definer 로 익명 호출 허용
create or replace function public.bump_resource(p_resource_id text, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_kind not in ('click','download','view') then
    p_kind := 'click';
  end if;
  insert into public.resource_hits (resource_id, kind, day, count)
  values (p_resource_id, p_kind, current_date, 1)
  on conflict (resource_id, kind, day)
  do update set count = public.resource_hits.count + 1;
end;
$$;

-- 자료별 총 조회수 뷰 (인기순 정렬용)
create or replace view public.resource_hit_totals as
  select resource_id, kind, sum(count)::bigint as total
  from public.resource_hits
  group by resource_id, kind;

-- ========== RLS ==========
alter table public.resources     enable row level security;
alter table public.works         enable row level security;
alter table public.guestbook     enable row level security;
alter table public.resource_hits enable row level security;

-- 자료: 공개된 것만 읽기 (쓰기는 서비스롤/대시보드에서만)
drop policy if exists resources_read on public.resources;
create policy resources_read on public.resources for select using (published = true);
drop policy if exists works_read on public.works;
create policy works_read on public.works for select using (published = true);

-- 방명록: 승인된 글만 읽기, 누구나 작성(길이 제한)
drop policy if exists guestbook_read on public.guestbook;
create policy guestbook_read on public.guestbook for select using (approved = true);
drop policy if exists guestbook_insert on public.guestbook;
create policy guestbook_insert on public.guestbook for insert
  with check (
    char_length(message) between 1 and 500
    and char_length(coalesce(name,'')) <= 40
    and char_length(coalesce(context,'')) <= 120
  );

-- 집계: 읽기는 허용(인기순), 쓰기는 RPC(bump_resource) 로만
drop policy if exists hits_read on public.resource_hits;
create policy hits_read on public.resource_hits for select using (true);

grant execute on function public.bump_resource(text, text) to anon, authenticated;
grant select on public.resource_hit_totals to anon, authenticated;

-- ========== 시드 (현재 자료) — 재실행 시 갱신 ==========
insert into public.resources (id, category, type, subject, title, description, url, external, thumb, lid, poster_title, date, meta, tags, sort) values
('academica','강의 자료','아카이브','연수 아카이브','온라인 연수 녹화본 모아보기','parcyun studio 온라인 연수 녹화본을 한 곳에서 모아보는 아카이브 사이트.','/academica-parcyun-studio/',false,'🎬','Archive · Site','온라인 연수 <strong>녹화본 모아보기</strong>','','["ARCHIVE","FOR EDUCATORS"]','["연수","아카이브"]',10),
('llm-fundamentals','강의 자료','강의','LLM · Harness Agent','LLM 이해하기 · LLM Fundamentals','NLP · LLM · Tokenization부터 Markdown · Skills · API · MCP · Harness · Orchestration까지 ─ 자율형 AI 에이전트를 다루기 위해 반드시 알아야 할 개념을 17개 풀스크롤 섹션으로 정리.','/llm-fundamentals/',false,'🧠','Lecture · 001','하네스 에이전트를 위한<br><strong>생성형 AI</strong> 기본 이해','2026.05.10','["2026.05.10","44 slides","FOR EDUCATORS"]','["LLM","MCP","Agent"]',20),
('agentic-ai','강의 자료','실습','LLM · Harness Agent','Agentic AI with LLM','Claude Desktop을 자율형 에이전트로 직접 셋업하고 운영해보는 실습 가이드. LLM 강의에서 배운 Skills · MCP · Harness · Orchestration 개념을 실제 워크플로우로 구축합니다.','https://parcyun.notion.site/Agentic-AI-with-LLM-3593f99a82238070ab4be47cefd571d7',true,'⚙️','Lecture · 002 · Hands-On','<strong>Claude Desktop</strong><br>따라하기 실습','2026.05.10','["2026.05.10","NOTION ↗","HANDS-ON"]','["Claude Desktop","MCP","실습"]',30),
('notion-onboarding','강의 자료','가이드','Notion 활용','Notion 온보딩 가이드','처음 Notion을 시작하는 사용자를 위한 단계별 가이드 ─ 워크스페이스 셋업부터 페이지·데이터베이스 구조화까지 한 번에 익히기.','https://parcyun.notion.site/Notion-8280d9f2847044e6bf48b25a1f199d76',true,'📓','Guide · 001','<strong>Notion</strong><br>Onboarding','2026.06.02','["2026.06.02","NOTION ↗","BEGINNER"]','["Notion","온보딩","기초"]',40),
('spell-drill','교육 활동 자료','게임','국어','한글 맞춤법 연습 게임','헷갈리기 쉬운 한글 맞춤법을 게임으로 익히는 학생용 학습 도구. 짧은 자투리 시간에 교실에서 바로 활용 가능합니다.','/korean-spell-drill-parcyun/',true,'✏️','Activity · 001','<strong>맞춤법</strong><br>연습 게임','2026.05.15','["2026.05.15","GAME ↗","초등"]','["국어","맞춤법","게임"]',50),
('math-volume','교육 활동 자료','활동지','수학 · 도형과 기하','쌓기나무 공장 · 부피 검수 미션','세기 = 곱하기를 발견하고, 셀 수 없는 상자를 곱셈으로 검수하고, 역추리·불량 검수까지 ─ 3단계 공장 게임으로 직육면체의 부피(가로×세로×높이)를 익히는 인쇄용 활동지.','/math-solid-volume/',false,'📦','Activity · 부피','쌓기나무로 푸는<br><strong>입체도형의 부피</strong>','2026.06.23','["2026.06.23","활동지 + 정답","6학년"]','["부피","직육면체","인쇄용"]',60),
('world-map','교육 활동 자료','인터랙티브','사회','세계 지도 · 6대륙 5대양','메르카토르·렌즈·지구본 3가지 도법을 오가며 6대륙과 5대양을 탐색하는 인터랙티브 세계지도. 대륙·대양·국가를 클릭해 강조·설명을 보고, 격자·확대·회전으로 자유롭게 살펴봅니다.','/world-map/',false,'🌍','Interactive · 지도','6대륙 5대양<br><strong>인터랙티브 세계지도</strong>','2026.07.03','["2026.07.03","인터랙티브","초등 사회"]','["세계지리","6대륙5대양","지구본"]',70),
('ai-class','교육 활동 자료','커리큘럼','AI 활용 수업','AI 활용 수업','[12차시] 컴퓨터 언어의 이해부터 바이브 코딩 해커톤까지 ─ 초등 교실에서 AI를 다루는 한 학기 단위의 통합 커리큘럼.','https://parcyun.notion.site/6-12-3683f99a822380afb2b8ded430282603',true,'🤖','Class · 12차시','<strong>AI 활용</strong><br>수업 커리큘럼','2026.06.02','["2026.06.02","NOTION ↗","12 SESSIONS"]','["AI 교육","바이브 코딩","커리큘럼"]',80)
on conflict (id) do update set
  category=excluded.category, type=excluded.type, subject=excluded.subject, title=excluded.title,
  description=excluded.description, url=excluded.url, external=excluded.external, thumb=excluded.thumb,
  lid=excluded.lid, poster_title=excluded.poster_title, date=excluded.date, meta=excluded.meta,
  tags=excluded.tags, sort=excluded.sort;

insert into public.works (num, title, title_html, description, week, url, status, tags, sort) values
('001','parcyun studio 포트폴리오 허브','parcyun studio<br>포트폴리오 허브','웹서비스를 한 주에 하나씩 쌓아갈 정적 포트폴리오 허브. GitHub Pages 위에 시네마틱 브랜드로 구현한 첫 결과물.','Week 01 · 2026.06','/','live','["HTML","CSS","GitHub Pages","Static"]',10),
('002','I am Serif 스튜디오 포트폴리오','I am Serif<br>스튜디오 포트폴리오','세리프 전용 · 극한 미니멀리즘으로 구현한 상업 스튜디오 포트폴리오. 미색 바탕에 순수 블랙 포인트, 웜 그레이스케일 이미지의 단일 스크롤 사이트.','Week 02 · 2026.06','/works/002-i-am-serif/','live','["HTML","CSS","Editorial","Static"]',20),
('003','다음 주 공개 예정','다음 주<br>공개 예정','다음 웹서비스를 준비 중입니다. 매주 이 자리에 새 카드가 하나씩 추가됩니다.','Week 03 · 2026.06','','soon','["Coming soon"]',30)
on conflict (num) do update set
  title=excluded.title, title_html=excluded.title_html, description=excluded.description,
  week=excluded.week, url=excluded.url, status=excluded.status, tags=excluded.tags, sort=excluded.sort;
