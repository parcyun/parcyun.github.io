-- Page Design Studio controls: constrained visibility, alignment, and border styles.
create or replace function public.admin_save_site_design(p_pw text, p_key text, p_value jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_property text;
  v_value text;
begin
  if not public.admin_check(p_pw) then raise exception '인증 실패'; end if;
  if p_key !~ '^/[A-Za-z0-9_./-]*::[A-Za-z0-9_-]{1,120}$' then raise exception '디자인 대상이 올바르지 않습니다.'; end if;
  if jsonb_typeof(p_value) <> 'object' then raise exception '디자인 값이 올바르지 않습니다.'; end if;

  for v_property in select jsonb_object_keys(p_value) loop
    v_value := p_value ->> v_property;
    if v_property not in (
      'color', 'backgroundColor', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight',
      'letterSpacing', 'textAlign', 'padding', 'margin', 'borderRadius', 'borderColor',
      'borderWidth', 'borderStyle', 'opacity', 'visibility'
    ) or jsonb_typeof(p_value -> v_property) <> 'string'
      or char_length(v_value) > 80 then
      raise exception '허용되지 않는 디자인 속성입니다.';
    elsif v_property in ('color', 'backgroundColor', 'borderColor') and v_value !~* '^(#[0-9a-f]{3}|#[0-9a-f]{4}|#[0-9a-f]{6}|#[0-9a-f]{8}|rgba?\([0-9.,% ]+\)|hsla?\([0-9.,% deg]+\)|transparent|currentColor|inherit)$' then
      raise exception '색상 값이 올바르지 않습니다.';
    elsif v_property = 'fontFamily' and v_value !~ '^[-A-Za-z0-9가-힣 _,''"]+$' then
      raise exception 'fontFamily 값이 올바르지 않습니다.';
    elsif v_property = 'fontSize' and v_value !~* '^([0-9]+(\.[0-9]+)?(px|rem|em|%|vh|vw)|0)$' then
      raise exception 'fontSize 값이 올바르지 않습니다.';
    elsif v_property in ('padding', 'borderRadius', 'borderWidth') and v_value !~* '^([0-9]+(\.[0-9]+)?(px|rem|em|%|vh|vw)|0)( +([0-9]+(\.[0-9]+)?(px|rem|em|%|vh|vw)|0)){0,3}$' then
      raise exception '크기 값이 올바르지 않습니다.';
    elsif v_property = 'margin' and v_value !~* '^(-?[0-9]+(\.[0-9]+)?(px|rem|em|%|vh|vw)|0)( +(-?[0-9]+(\.[0-9]+)?(px|rem|em|%|vh|vw)|0)){0,3}$' then
      raise exception 'margin 값이 올바르지 않습니다.';
    elsif v_property = 'letterSpacing' and v_value !~* '^(-?[0-9]+(\.[0-9]+)?(px|rem|em)|0)$' then
      raise exception 'letterSpacing 값이 올바르지 않습니다.';
    elsif v_property = 'lineHeight' and v_value !~* '^(normal|[0-9]+(\.[0-9]+)?|[0-9]+(\.[0-9]+)?(px|rem|em|%))$' then
      raise exception 'lineHeight 값이 올바르지 않습니다.';
    elsif v_property = 'opacity' and v_value !~ '^(0(\.[0-9]+)?|\.[0-9]+|1(\.0+)?)$' then
      raise exception 'opacity 값이 올바르지 않습니다.';
    elsif v_property = 'fontWeight' and v_value !~ '^(normal|bold|[1-9]00)$' then
      raise exception 'fontWeight 값이 올바르지 않습니다.';
    elsif v_property = 'visibility' and v_value !~ '^(visible|hidden)$' then
      raise exception 'visibility 값이 올바르지 않습니다.';
    elsif v_property = 'textAlign' and v_value !~ '^(left|center|right)$' then
      raise exception 'textAlign 값이 올바르지 않습니다.';
    elsif v_property = 'borderStyle' and v_value !~ '^(solid|dashed|dotted|none)$' then
      raise exception 'borderStyle 값이 올바르지 않습니다.';
    end if;
  end loop;

  insert into public.site_design (key, value, updated_at) values (p_key, p_value, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
end; $$;

revoke all on function public.admin_save_site_design(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.admin_save_site_design(text, text, jsonb) to anon, authenticated;
