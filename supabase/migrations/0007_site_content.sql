-- parcyun studio · 정적 텍스트 인라인 편집 (관리자)
-- 페이지에 박힌 문구를 key→value 로 오버라이드. 기본값은 HTML(SSR)에 그대로 있고,
-- 여기 저장된 값이 있으면 런타임에 그 문구만 교체됨. 저장/삭제는 비번 검증 RPC로만.
-- 실행: Supabase > SQL Editor. (0006 이 먼저 적용돼 admin_check 가 있어야 함. 재실행 안전)

create table if not exists public.site_content (
  key        text primary key,
  value      text not null,
  updated_at timestamptz default now()
);
alter table public.site_content enable row level security;

-- 오버라이드된 문구는 모든 방문자에게 보여야 하므로 읽기는 공개
drop policy if exists site_content_read on public.site_content;
create policy site_content_read on public.site_content for select using (true);

create or replace function public.admin_save_content(p_pw text, p_key text, p_value text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check(p_pw) then raise exception '인증 실패'; end if;
  insert into public.site_content (key, value, updated_at) values (p_key, p_value, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
end; $$;

-- 편집 취소(기본 문구로 되돌리기)
create or replace function public.admin_delete_content(p_pw text, p_key text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check(p_pw) then raise exception '인증 실패'; end if;
  delete from public.site_content where key = p_key;
end; $$;

grant execute on function
  public.admin_save_content(text, text, text),
  public.admin_delete_content(text, text)
  to anon, authenticated;
