-- Apply component property resets and upserts in one PostgreSQL transaction.
create or replace function public.admin_apply_component_design(
  p_pw text,
  p_component_key text,
  p_reset_properties text[],
  p_values jsonb
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_property text;
  allowed constant text[] := array['color','backgroundColor','fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','padding','margin','borderRadius','borderColor','borderWidth','opacity','display'];
begin
  if not public.admin_check(p_pw) then raise exception 'unauthorized'; end if;
  if p_component_key is null or char_length(p_component_key) not between 1 and 80 then raise exception 'invalid component key'; end if;

  foreach v_property in array coalesce(p_reset_properties, array[]::text[]) loop
    if not (v_property = any(allowed)) then raise exception '허용되지 않은 디자인 속성입니다: %', v_property; end if;
  end loop;

  delete from public.component_design as cd
  where cd.component_key = p_component_key
    and cd.property = any(coalesce(p_reset_properties, array[]::text[]));

  -- Any validation error in the existing constrained upsert aborts and rolls back the delete above.
  perform public.admin_save_component_design(p_pw, p_component_key, coalesce(p_values, '{}'::jsonb));
end; $$;

revoke all on function public.admin_apply_component_design(text, text, text[], jsonb) from public;
grant execute on function public.admin_apply_component_design(text, text, text[], jsonb) to anon, authenticated;
