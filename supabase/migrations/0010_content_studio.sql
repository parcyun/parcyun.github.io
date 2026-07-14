-- parcyun studio · Content Studio
-- 경력 타임라인과 컴포넌트별 디자인 토큰을 DB로 관리한다.
-- 공개 페이지는 읽기 RPC만 사용하며, 모든 쓰기는 admin_check를 통과한 RPC에서만 가능하다.

create table if not exists public.career_sections (
  id         text primary key check (char_length(id) between 1 and 80),
  title      text not null check (char_length(trim(title)) between 1 and 120),
  sort       integer not null default 999,
  updated_at timestamptz not null default now()
);

create table if not exists public.career_items (
  id         text primary key check (char_length(id) between 1 and 80),
  section_id text not null references public.career_sections(id) on delete cascade,
  year       text not null default '' check (char_length(year) <= 40),
  role       text not null check (char_length(trim(role)) between 1 and 300),
  org        text not null default '' check (char_length(org) <= 160),
  sort       integer not null default 999,
  updated_at timestamptz not null default now()
);
create index if not exists career_items_section_sort_idx on public.career_items (section_id, sort, id);

create table if not exists public.site_design (
  key        text primary key check (char_length(key) between 4 and 240),
  value      jsonb not null check (jsonb_typeof(value) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.career_sections enable row level security;
alter table public.career_items enable row level security;
alter table public.site_design enable row level security;

-- 테이블을 Data API에 직접 노출하지 않는다. 아래 읽기 RPC만 공개한다.
drop policy if exists career_sections_no_direct_access on public.career_sections;
drop policy if exists career_items_no_direct_access on public.career_items;
drop policy if exists site_design_no_direct_access on public.site_design;
create policy career_sections_no_direct_access on public.career_sections for select to anon, authenticated using (false);
create policy career_items_no_direct_access on public.career_items for select to anon, authenticated using (false);
create policy site_design_no_direct_access on public.site_design for select to anon, authenticated using (false);

-- 기존 홈페이지 경력을 최초 한 번만 이관한다. 이후 관리자 수정값은 덮어쓰지 않는다.
insert into public.career_sections (id, title, sort) values
  ('career-core', '주요 경력', 10),
  ('career-training', '강의 · 연수', 20),
  ('career-content', '제작 · 콘텐츠', 30),
  ('career-research', '위원 · 연구', 40),
  ('career-education', '학력 · 자격', 50)
on conflict (id) do nothing;

insert into public.career_items (id, section_id, year, role, org, sort) values
  ('career-core-1', 'career-core', '현재', '몽당분필 대외협력부장 · AI R&D 팀 리더', '(사)디미교연', 10),
  ('career-training-1', 'career-training', '현재', '찾아가는 학교 컨설팅 주강사', '', 10),
  ('career-training-2', 'career-training', '—', '관리자 연수 우수 사례 발표 (찾아가는 학교 컨설팅)', '', 20),
  ('career-training-3', 'career-training', '—', 'AI · 에듀테크 직무 연수 강사', '', 30),
  ('career-training-4', 'career-training', '—', '(사)디미교연 AI · 에듀테크 내부 역량 강화 연수 강사', '', 40),
  ('career-training-5', 'career-training', '—', '특성화고등학교 시각디자인과 생성형 AI 활용 특강', '', 50),
  ('career-content-1', 'career-content', '—', '티처빌 온라인 직무연수 제작 (이미지 · 영상 생성 AI)', '티처빌', 10),
  ('career-content-2', 'career-content', '—', '경기도교육청 미디어 리터러시 교육 영상 제작', '경기도교육청', 20),
  ('career-research-1', 'career-research', '2026', '경기도교육청 AI 교육연구회 회장', '경기도교육청', 10),
  ('career-research-2', 'career-research', '2025', '화성오산교육지원청 디지털토핑교육연구위원', '', 20),
  ('career-research-3', 'career-research', '2025', '경기도교육청 디지털시민역량교육연구위원', '경기도교육청', 30),
  ('career-research-4', 'career-research', '2023—', '교실혁명 선도교사', '교육부', 40),
  ('career-education-1', 'career-education', '2023', '프롬프트 엔지니어 자격', '뤼튼', 10),
  ('career-education-2', 'career-education', '2022', 'Google Certified Educator Level 2', 'Google', 20),
  ('career-education-3', 'career-education', '2017', '광주교육대학교 졸업', '광주교육대학교', 30)
on conflict (id) do nothing;

create or replace function public.list_career_timeline()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'title', s.title,
    'sort', s.sort,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'section_id', i.section_id, 'year', i.year,
        'role', i.role, 'org', i.org, 'sort', i.sort
      ) order by i.sort, i.id)
      from public.career_items i where i.section_id = s.id
    ), '[]'::jsonb)
  ) order by s.sort, s.id), '[]'::jsonb)
  from public.career_sections s;
$$;

create or replace function public.list_site_design(p_path text)
returns table (key text, value jsonb)
language sql
security definer
set search_path = public
as $$
  select d.key, d.value
  from public.site_design d
  where p_path ~ '^/[A-Za-z0-9_./-]*$'
    and d.key like p_path || '::%'
  order by d.key;
$$;

create or replace function public.admin_save_career_section(p_pw text, p_row jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare v_id text := trim(coalesce(p_row->>'id', ''));
begin
  if not public.admin_check(p_pw) then raise exception '인증 실패'; end if;
  if v_id !~ '^[A-Za-z0-9_-]{1,80}$' then raise exception '경력 분류 ID가 올바르지 않습니다.'; end if;
  if char_length(trim(coalesce(p_row->>'title', ''))) not between 1 and 120 then raise exception '분류 제목은 1~120자로 입력하세요.'; end if;
  insert into public.career_sections (id, title, sort, updated_at)
  values (v_id, trim(p_row->>'title'), coalesce((p_row->>'sort')::integer, 999), now())
  on conflict (id) do update set title = excluded.title, sort = excluded.sort, updated_at = now();
end; $$;

create or replace function public.admin_delete_career_section(p_pw text, p_id text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check(p_pw) then raise exception '인증 실패'; end if;
  delete from public.career_sections where id = p_id;
  if not found then raise exception '경력 분류를 찾을 수 없습니다.'; end if;
end; $$;

create or replace function public.admin_save_career_item(p_pw text, p_row jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare v_id text := trim(coalesce(p_row->>'id', ''));
declare v_section_id text := trim(coalesce(p_row->>'section_id', ''));
begin
  if not public.admin_check(p_pw) then raise exception '인증 실패'; end if;
  if v_id !~ '^[A-Za-z0-9_-]{1,80}$' then raise exception '경력 항목 ID가 올바르지 않습니다.'; end if;
  if v_section_id !~ '^[A-Za-z0-9_-]{1,80}$' or not exists (select 1 from public.career_sections where id = v_section_id) then raise exception '경력 분류를 선택하세요.'; end if;
  if char_length(trim(coalesce(p_row->>'role', ''))) not between 1 and 300 then raise exception '경력 내용은 1~300자로 입력하세요.'; end if;
  if char_length(coalesce(p_row->>'year', '')) > 40 or char_length(coalesce(p_row->>'org', '')) > 160 then raise exception '경력 항목의 길이가 너무 깁니다.'; end if;
  insert into public.career_items (id, section_id, year, role, org, sort, updated_at)
  values (v_id, v_section_id, coalesce(p_row->>'year', ''), trim(p_row->>'role'), coalesce(p_row->>'org', ''), coalesce((p_row->>'sort')::integer, 999), now())
  on conflict (id) do update set section_id = excluded.section_id, year = excluded.year,
    role = excluded.role, org = excluded.org, sort = excluded.sort, updated_at = now();
end; $$;

create or replace function public.admin_delete_career_item(p_pw text, p_id text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check(p_pw) then raise exception '인증 실패'; end if;
  delete from public.career_items where id = p_id;
  if not found then raise exception '경력 항목을 찾을 수 없습니다.'; end if;
end; $$;

create or replace function public.admin_save_site_design(p_pw text, p_key text, p_value jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare v_property text;
begin
  if not public.admin_check(p_pw) then raise exception '인증 실패'; end if;
  if p_key !~ '^/[A-Za-z0-9_./-]*::[A-Za-z0-9_-]{1,120}$' then raise exception '디자인 대상이 올바르지 않습니다.'; end if;
  if jsonb_typeof(p_value) <> 'object' then raise exception '디자인 값이 올바르지 않습니다.'; end if;
  for v_property in select jsonb_object_keys(p_value) loop
    if v_property not in ('color', 'backgroundColor', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'padding', 'margin', 'borderRadius', 'borderColor', 'borderWidth', 'opacity')
      or jsonb_typeof(p_value -> v_property) <> 'string'
      or char_length(p_value ->> v_property) > 80 then
      raise exception '허용되지 않는 디자인 속성입니다.';
    end if;
  end loop;
  insert into public.site_design (key, value, updated_at) values (p_key, p_value, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
end; $$;

create or replace function public.admin_delete_site_design(p_pw text, p_key text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check(p_pw) then raise exception '인증 실패'; end if;
  delete from public.site_design where key = p_key;
end; $$;

revoke all on function public.list_career_timeline() from public, anon, authenticated;
revoke all on function public.list_site_design(text) from public, anon, authenticated;
revoke all on function public.admin_save_career_section(text, jsonb) from public, anon, authenticated;
revoke all on function public.admin_delete_career_section(text, text) from public, anon, authenticated;
revoke all on function public.admin_save_career_item(text, jsonb) from public, anon, authenticated;
revoke all on function public.admin_delete_career_item(text, text) from public, anon, authenticated;
revoke all on function public.admin_save_site_design(text, text, jsonb) from public, anon, authenticated;
revoke all on function public.admin_delete_site_design(text, text) from public, anon, authenticated;

grant execute on function public.list_career_timeline(), public.list_site_design(text) to anon, authenticated;
grant execute on function public.admin_save_career_section(text, jsonb), public.admin_delete_career_section(text, text),
  public.admin_save_career_item(text, jsonb), public.admin_delete_career_item(text, text),
  public.admin_save_site_design(text, text, jsonb), public.admin_delete_site_design(text, text)
  to anon, authenticated;
