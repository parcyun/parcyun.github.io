-- Some production function bodies were compacted by an earlier deployment.
-- Extend those equivalent allow-lists to Works as well.
do $$
declare
  v_definition text;
  v_function record;
begin
  for v_function in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'submit_review', 'list_reviews', 'submit_feedback', 'list_feedback',
        'admin_set_review_service', 'admin_set_feedback_service'
      )
  loop
    v_definition := pg_get_functiondef(v_function.oid);
    v_definition := replace(
      v_definition,
      '(''home'',''spell-drill'',''atlas-gears'',''geoweb'',''other'',''unclassified'')',
      '(''home'',''spell-drill'',''atlas-gears'',''geoweb'',''works'',''other'',''unclassified'')'
    );
    v_definition := replace(
      v_definition,
      '(''home'',''spell-drill'',''atlas-gears'',''geoweb'',''other'')',
      '(''home'',''spell-drill'',''atlas-gears'',''geoweb'',''works'',''other'')'
    );
    execute v_definition;
  end loop;
end;
$$;
