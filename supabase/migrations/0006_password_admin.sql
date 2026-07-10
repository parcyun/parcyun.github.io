-- parcyun studio · 관리자 (고정 비밀번호 1개). 이메일/계정 불필요.
-- 사용법: 아래 '바꿀비밀번호' 를 원하는 값으로만 고쳐서 Supabase > SQL Editor 에서 실행. (재실행 안전)
-- 원리: /admin 에서 이 비번을 입력 → admin_check 로 대조 → 통과하면 저장/삭제 RPC 로만 DB 를 씀
--       (anon 키 직접 쓰기는 RLS 로 막혀 있고, 아래 SECURITY DEFINER 함수만 비번 검증 후 우회).

-- ▼▼▼ 여기 한 곳만 바꾸면 됨 ▼▼▼
create or replace function public.admin_check(p_pw text)
returns boolean language sql security definer set search_path = public as $$
  select p_pw = '바꿀비밀번호';
$$;
-- ▲▲▲

-- ===== 비번 검증 후 자료(resources) 저장/삭제 =====
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

-- ===== 비번 검증 후 works 저장/삭제 =====
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

-- ===== 몽당 실명 (관리자만 조회) =====
create table if not exists public.mongdang_people (id int primary key, name text not null);
alter table public.mongdang_people enable row level security;  -- 직접 접근 차단, RPC로만
insert into public.mongdang_people (id, name) values
  (1,'이선학'),(2,'김희경'),(3,'유지연'),(4,'박주현'),(5,'나효정'),
  (6,'박창현'),(7,'주민환'),(8,'안요한'),(9,'정두린')
on conflict (id) do update set name = excluded.name;

create or replace function public.admin_get_people(p_pw text)
returns setof public.mongdang_people language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check(p_pw) then return; end if;
  return query select * from public.mongdang_people order by id;
end; $$;

grant execute on function
  public.admin_check(text),
  public.admin_save_resource(text, jsonb), public.admin_delete_resource(text, text),
  public.admin_save_work(text, jsonb), public.admin_delete_work(text, text),
  public.admin_get_people(text)
  to anon, authenticated;

-- KOCOMATE 는 정적 resources.ts(수업 보조 도구)에서만 관리 → DB엔 넣지 않음.
-- 과거 잘못 들어간 행이 있으면 제거(정적의 올바른 값이 병합돼 보이도록).
delete from public.resources where id = 'kocomate';
