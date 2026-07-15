-- Atomically migrate stable page-design keys and clear stable/legacy pairs.
create or replace function public.admin_save_site_design_migrating(
  p_pw text,
  p_key text,
  p_legacy_key text,
  p_value jsonb
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.admin_check(p_pw) then raise exception '인증 실패'; end if;
  perform public.admin_save_site_design(p_pw, p_key, p_value);
  if p_legacy_key is not null and p_legacy_key <> p_key then
    delete from public.site_design where key = p_legacy_key;
  end if;
end;
$$;

create or replace function public.admin_delete_site_design_keys(
  p_pw text,
  p_keys text[]
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.admin_check(p_pw) then raise exception '인증 실패'; end if;
  if p_keys is null or cardinality(p_keys) < 1 or cardinality(p_keys) > 2 then raise exception '디자인 대상이 올바르지 않습니다.'; end if;
  if exists (select 1 from unnest(p_keys) key where key !~ '^/[A-Za-z0-9_./-]*::[A-Za-z0-9_-]{1,120}$') then
    raise exception '디자인 대상이 올바르지 않습니다.';
  end if;
  delete from public.site_design where key = any(p_keys);
end;
$$;

revoke all on function public.admin_save_site_design_migrating(text, text, text, jsonb) from public;
revoke all on function public.admin_delete_site_design_keys(text, text[]) from public;
grant execute on function public.admin_save_site_design_migrating(text, text, text, jsonb) to anon, authenticated;
grant execute on function public.admin_delete_site_design_keys(text, text[]) to anon, authenticated;
