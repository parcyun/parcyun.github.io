-- Preserve sibling component properties when an administrator saves a partial design update.
create or replace function public.admin_save_component_design(p_pw text, p_component_key text, p_values jsonb)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  allowed text[] := array['color','backgroundColor','fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','padding','margin','borderRadius','borderColor','borderWidth','opacity','display'];
  item record;
  value_text text;
begin
  if not public.admin_check(p_pw) then raise exception '관리자 인증이 필요합니다.'; end if;
  if p_component_key is null or p_component_key !~ '^[a-z0-9_-]{1,40}$' then raise exception '잘못된 컴포넌트 키입니다.'; end if;
  if jsonb_typeof(p_values) <> 'object' then raise exception '디자인 값은 객체여야 합니다.'; end if;
  for item in select key, value from jsonb_each(p_values) loop
    if not (item.key = any(allowed)) then raise exception '허용되지 않은 디자인 속성입니다: %', item.key; end if;
    if jsonb_typeof(item.value) <> 'string' or char_length(item.value #>> '{}') > 160 then raise exception '디자인 값이 올바르지 않습니다.'; end if;
    value_text := item.value #>> '{}';
    if item.key in ('color', 'backgroundColor', 'borderColor') and value_text !~* '^(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{4}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8}|rgba?\([0-9.,% ]+\)|hsla?\([0-9.,% deg]+\)|transparent|currentColor|inherit)$' then
      raise exception '잘못된 CSS 값입니다: %', item.key;
    elsif item.key = 'fontSize' and value_text !~* '^([0-9]+(\.[0-9]+)?(px|rem|em|%|vh|vw)|0)$' then
      raise exception '잘못된 CSS 값입니다: %', item.key;
    elsif item.key in ('padding', 'borderRadius', 'borderWidth') and value_text !~* '^([0-9]+(\.[0-9]+)?(px|rem|em|%|vh|vw)|0)( +([0-9]+(\.[0-9]+)?(px|rem|em|%|vh|vw)|0)){0,3}$' then
      raise exception '잘못된 CSS 값입니다: %', item.key;
    elsif item.key = 'margin' and value_text !~* '^(-?[0-9]+(\.[0-9]+)?(px|rem|em|%|vh|vw)|0)( +(-?[0-9]+(\.[0-9]+)?(px|rem|em|%|vh|vw)|0)){0,3}$' then
      raise exception '잘못된 CSS 값입니다: %', item.key;
    elsif item.key = 'letterSpacing' and value_text !~* '^(-?[0-9]+(\.[0-9]+)?(px|rem|em)|0)$' then
      raise exception '잘못된 CSS 값입니다: %', item.key;
    elsif item.key = 'lineHeight' and value_text !~* '^(normal|[0-9]+(\.[0-9]+)?|[0-9]+(\.[0-9]+)?(px|rem|em|%))$' then
      raise exception '잘못된 CSS 값입니다: %', item.key;
    elsif item.key = 'opacity' and value_text !~ '^(0(\.[0-9]+)?|1(\.0+)?)$' then
      raise exception '잘못된 CSS 값입니다: %', item.key;
    elsif item.key = 'fontWeight' and value_text !~ '^(normal|bold|bolder|lighter|[1-9]00)$' then
      raise exception '잘못된 CSS 값입니다: %', item.key;
    elsif item.key = 'display' and value_text !~ '^(none|block|inline|inline-block|flex|inline-flex|grid|inline-grid)$' then
      raise exception '잘못된 CSS 값입니다: %', item.key;
    elsif item.key = 'fontFamily' and value_text !~ '^[-A-Za-z0-9가-힣 _,''"]+$' then
      raise exception '잘못된 CSS 값입니다: %', item.key;
    end if;
  end loop;

  insert into public.component_design(component_key, property, value)
  select p_component_key, entry.key, to_jsonb(entry.value)
  from jsonb_each_text(coalesce(p_values, '{}'::jsonb)) as entry
  on conflict (component_key, property)
  do update set value = excluded.value, updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_delete_component_design_property(
  p_pw text,
  p_component_key text,
  p_property text
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  allowed text[] := array['color','backgroundColor','fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','padding','margin','borderRadius','borderColor','borderWidth','opacity','display'];
begin
  if not public.admin_check(p_pw) then raise exception 'unauthorized'; end if;
  if p_component_key is null or p_component_key !~ '^[a-z0-9_-]{1,40}$' then raise exception '잘못된 컴포넌트 키입니다.'; end if;
  if p_property is null or not (p_property = any(allowed)) then raise exception '허용되지 않은 디자인 속성입니다.'; end if;
  delete from public.component_design
  where component_key = p_component_key and property = p_property;
end;
$$;

revoke all on function public.admin_delete_component_design_property(text, text, text) from public;
grant execute on function public.admin_delete_component_design_property(text, text, text) to anon, authenticated;
