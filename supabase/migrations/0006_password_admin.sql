-- parcyun studio · 이메일 없는 비밀번호-시크릿 관리자 모델 + KOCOMATE(수업 보조 도구) 추가
-- 이메일/계정 없이: 비밀번호를 bcrypt 해시로 DB 저장하고, 저장/삭제는 비번을 검증하는
-- SECURITY DEFINER RPC로만 수행(RLS 대신). Supabase Auth 불필요.
-- 실행: Supabase 대시보드 > SQL Editor. (idempotent — 재실행 안전)

create extension if not exists pgcrypto;

-- ===== 관리자 비밀번호(단일 행) =====
create table if not exists public.admin_auth (
  id      int primary key default 1,
  pw_hash text,
  constraint admin_auth_single check (id = 1)
);
insert into public.admin_auth (id, pw_hash) values (1, null) on conflict (id) do nothing;
alter table public.admin_auth enable row level security;  -- 정책 없음 = 직접 접근 전면 차단(오직 RPC)

-- 비밀번호가 설정돼 있는지(최초 설정 플로우용, 인증 불필요)
create or replace function public.admin_password_exists()
returns boolean language sql security definer set search_path = public as $$
  select coalesce((select pw_hash is not null from public.admin_auth where id = 1), false);
$$;

-- 비밀번호 검증
create or replace function public.admin_check(p_pw text)
returns boolean language plpgsql security definer set search_path = public as $$
declare h text;
begin
  select pw_hash into h from public.admin_auth where id = 1;
  if h is null or coalesce(p_pw,'') = '' then return false; end if;
  return h = crypt(p_pw, h);
end; $$;

-- 비밀번호 설정/변경 (최초엔 현재 비번 불필요)
create or replace function public.admin_set_password(p_current text, p_new text)
returns boolean language plpgsql security definer set search_path = public as $$
declare h text;
begin
  if length(coalesce(p_new,'')) < 6 then raise exception '비밀번호는 6자 이상이어야 합니다'; end if;
  select pw_hash into h from public.admin_auth where id = 1;
  if h is not null and h <> crypt(coalesce(p_current,''), h) then
    raise exception '현재 비밀번호가 올바르지 않습니다';
  end if;
  update public.admin_auth set pw_hash = crypt(p_new, gen_salt('bf')) where id = 1;
  return true;
end; $$;

-- ===== 비번 검증 후 자료 저장/삭제 =====
create or replace function public.admin_save_resource(p_pw text, p_row jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check(p_pw) then raise exception '인증 실패'; end if;
  insert into public.resources
    (id, category, type, subject, title, description, url, external, thumb, lid, poster_title, date, meta, tags, sort)
  values (
    p_row->>'id', p_row->>'category', p_row->>'type', coalesce(p_row->>'subject',''), p_row->>'title',
    coalesce(p_row->>'description',''), p_row->>'url', coalesce((p_row->>'external')::boolean, false),
    coalesce(p_row->>'thumb',''), coalesce(p_row->>'lid',''), coalesce(p_row->>'poster_title',''),
    coalesce(p_row->>'date',''), coalesce(p_row->'meta','[]'::jsonb), coalesce(p_row->'tags','[]'::jsonb),
    coalesce((p_row->>'sort')::int, 999)
  )
  on conflict (id) do update set
    category=excluded.category, type=excluded.type, subject=excluded.subject, title=excluded.title,
    description=excluded.description, url=excluded.url, external=excluded.external, thumb=excluded.thumb,
    lid=excluded.lid, poster_title=excluded.poster_title, date=excluded.date, meta=excluded.meta,
    tags=excluded.tags, sort=excluded.sort;
end; $$;

create or replace function public.admin_delete_resource(p_pw text, p_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check(p_pw) then raise exception '인증 실패'; end if;
  delete from public.resources where id = p_id;
end; $$;

create or replace function public.admin_save_work(p_pw text, p_row jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check(p_pw) then raise exception '인증 실패'; end if;
  insert into public.works (num, title, title_html, description, week, url, status, tags, sort)
  values (
    p_row->>'num', p_row->>'title', coalesce(p_row->>'title_html', p_row->>'title'),
    coalesce(p_row->>'description',''), coalesce(p_row->>'week',''), coalesce(p_row->>'url',''),
    coalesce(p_row->>'status','live'), coalesce(p_row->'tags','[]'::jsonb), coalesce((p_row->>'sort')::int, 999)
  )
  on conflict (num) do update set
    title=excluded.title, title_html=excluded.title_html, description=excluded.description,
    week=excluded.week, url=excluded.url, status=excluded.status, tags=excluded.tags, sort=excluded.sort;
end; $$;

create or replace function public.admin_delete_work(p_pw text, p_num text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check(p_pw) then raise exception '인증 실패'; end if;
  delete from public.works where num = p_num;
end; $$;

-- ===== 몽당 실명 (비번 검증 후 반환) — 이메일 RLS 대신 비번 RPC =====
create table if not exists public.mongdang_people (id int primary key, name text not null);
insert into public.mongdang_people (id, name) values
  (1,'이선학'),(2,'김희경'),(3,'유지연'),(4,'박주현'),(5,'나효정'),
  (6,'박창현'),(7,'주민환'),(8,'안요한'),(9,'정두린')
on conflict (id) do update set name = excluded.name;
alter table public.mongdang_people enable row level security;  -- 직접 접근 차단, RPC로만

create or replace function public.admin_get_people(p_pw text)
returns setof public.mongdang_people language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check(p_pw) then return; end if;
  return query select * from public.mongdang_people order by id;
end; $$;

grant execute on function
  public.admin_password_exists(), public.admin_check(text), public.admin_set_password(text, text),
  public.admin_save_resource(text, jsonb), public.admin_delete_resource(text, text),
  public.admin_save_work(text, jsonb), public.admin_delete_work(text, text),
  public.admin_get_people(text)
  to anon, authenticated;

-- ===== KOCOMATE 추가 (수업 보조 도구 카테고리) =====
insert into public.resources
  (id, category, type, subject, title, description, url, external, thumb, lid, poster_title, date, meta, tags, sort)
values
  ('kocomate','교육 활동 자료','수업 보조 도구','수업 도구',
   'KOCOMATE · 수업 보조 도구',
   '네패스(kocoafab)가 만든 교사용 수업 보조 도구. 교실 수업을 돕는 기능을 웹에서 바로 활용할 수 있어요.',
   'https://kocoafab.cc/edu/kocomate', true, '🧰', 'Tool · Teaching',
   '<strong>KOCOMATE</strong><br>수업 보조 도구', '2026.07.10',
   '["2026.07.10","KOCOAFAB ↗","교사용"]', '["수업도구","보조도구","kocoafab"]', 90)
on conflict (id) do update set
  category=excluded.category, type=excluded.type, subject=excluded.subject, title=excluded.title,
  description=excluded.description, url=excluded.url, external=excluded.external, thumb=excluded.thumb,
  lid=excluded.lid, poster_title=excluded.poster_title, date=excluded.date, meta=excluded.meta,
  tags=excluded.tags, sort=excluded.sort;
