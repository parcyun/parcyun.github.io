-- 몽당 일정표 실명을 공개 HTML에서 제거하고 Supabase(관리자 전용)로 이전 (접근 방식 A).
-- 정적 HTML에는 이름이 토큰(<span class="pn" data-p="N">)만 남고, 실명은 이 테이블에서
-- 관리자 세션일 때만 클라이언트가 채운다 → HTML 원문을 fetch해도 실명이 없음.
-- 실행: Supabase 대시보드 > SQL Editor. (재실행 안전)

create table if not exists public.mongdang_people (
  id   int primary key,
  name text not null
);

alter table public.mongdang_people enable row level security;

-- 관리자 이메일 세션만 읽기 가능 (anon·타 사용자는 0행)
drop policy if exists mongdang_people_admin on public.mongdang_people;
create policy mongdang_people_admin on public.mongdang_people for select
  using ((auth.jwt() ->> 'email') = 'pen.layered@gmail.com');

grant select on public.mongdang_people to authenticated;

insert into public.mongdang_people (id, name) values
  (1,'이선학'),(2,'김희경'),(3,'유지연'),(4,'박주현'),(5,'나효정'),
  (6,'박창현'),(7,'주민환'),(8,'안요한'),(9,'정두린')
on conflict (id) do update set name = excluded.name;
