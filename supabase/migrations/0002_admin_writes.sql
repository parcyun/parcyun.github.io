-- parcyun studio · 관리자 쓰기 권한 + 방명록 제거
-- Supabase 대시보드 > SQL Editor 에서 실행 (idempotent — 재실행 안전)
-- 전제: 0001_backend.sql 이 먼저 적용돼 있어야 함.
--
-- 관리자 로그인은 Supabase Auth 매직링크(OTP)로 pen.layered@gmail.com 에게만 발급됨.
-- RLS는 로그인 여부가 아니라 JWT의 email 클레임이 정확히 그 주소인지로 쓰기를 제한한다 —
-- 즉 다른 이메일로 매직링크를 받아 로그인해도(가능은 함) 그 세션으로는 아무것도 쓸 수 없다.

-- ========== 자료(resources) · works 쓰기 정책 ==========
drop policy if exists resources_admin_write on public.resources;
create policy resources_admin_write on public.resources for all
  using ((auth.jwt() ->> 'email') = 'pen.layered@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'pen.layered@gmail.com');

drop policy if exists works_admin_write on public.works;
create policy works_admin_write on public.works for all
  using ((auth.jwt() ->> 'email') = 'pen.layered@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'pen.layered@gmail.com');

grant insert, update, delete on public.resources to authenticated;
grant insert, update, delete on public.works to authenticated;

-- ========== 방명록 기능 제거 ==========
-- 방명록 UI/기능은 삭제됐다. 기존 방명록 글이 있다면 보존하고 싶을 수 있어 테이블 자체는
-- 남겨두고 insert 정책만 제거한다(더 이상 새 글이 쌓이지 않음). 완전히 지우려면 아래 주석 해제:
drop policy if exists guestbook_insert on public.guestbook;
-- drop table if exists public.guestbook;
