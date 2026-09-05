-- Transactional verification for project-scoped schedule lock discovery.
-- Fixed fixtures are removed before this migration commits.

do $$
declare
  v_left constant uuid := 'fc100000-0000-0000-0000-000000000001';
  v_right constant uuid := 'fc100000-0000-0000-0000-000000000002';
  v_isolated constant uuid := 'fc100000-0000-0000-0000-000000000003';
  v_left_activity constant uuid := 'fc200000-0000-0000-0000-000000000001';
  v_right_activity constant uuid := 'fc200000-0000-0000-0000-000000000002';
  v_isolated_activity constant uuid := 'fc200000-0000-0000-0000-000000000003';
  v_scope uuid[];
  v_previous_lock_timeout text;
begin
  if exists(select 1 from public.projects where id in (v_left, v_right, v_isolated)) then
    raise exception 'PRJ-06 scoped-lock verification identifiers already exist.';
  end if;
  if public.project_schedule_lock_key(v_left) = public.project_schedule_lock_key(v_isolated) then
    raise exception 'PRJ-06 scoped-lock verification unexpectedly produced a key collision.';
  end if;
  if exists(
    select 1 from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and t.tgname = 'lock_schedule_graph' and not t.tgisinternal
  ) then
    raise exception 'PRJ-06 global schedule trigger still exists.';
  end if;

  insert into public.projects(id, name, description, status, start_date, end_date) values
    (v_left, 'Scoped lock left', '', 'on_track', '2026-07-01', '2026-07-10'),
    (v_right, 'Scoped lock right', '', 'on_track', '2026-07-01', '2026-07-10'),
    (v_isolated, 'Scoped lock isolated', '', 'on_track', '2026-07-01', '2026-07-10');
  insert into public.activities(id, project_id, name, status, priority, start_date, due_date, allow_outside_project) values
    (v_left_activity, v_left, 'Scoped lock left activity', 'not_started', 'normal', '2026-07-02', '2026-07-04', false),
    (v_right_activity, v_right, 'Scoped lock right activity', 'not_started', 'normal', '2026-07-04', '2026-07-06', false),
    (v_isolated_activity, v_isolated, 'Scoped lock isolated activity', 'not_started', 'normal', '2026-07-02', '2026-07-04', false);
  insert into public.activity_dependencies(id, activity_id, depends_on_activity_id, constraint_type)
  values ('fc300000-0000-0000-0000-000000000001', v_right_activity, v_left_activity, 'finish_to_start');

  v_scope := public.discover_project_schedule_scope(array[v_left]);
  if cardinality(v_scope) <> 2 or not (v_scope @> array[v_left, v_right]) then
    raise exception 'PRJ-06 one-hop project scope is incomplete: %', v_scope;
  end if;
  if v_scope @> array[v_isolated] then
    raise exception 'PRJ-06 one-hop project scope included an unrelated project: %', v_scope;
  end if;

  v_scope := public.discover_activity_mutation_scope(
    v_isolated_activity,
    v_isolated,
    jsonb_build_array(jsonb_build_object(
      'depends_on_activity_id', v_left_activity,
      'constraint_type', 'finish_to_start'
    ))
  );
  if cardinality(v_scope) <> 2 or not (v_scope @> array[v_isolated, v_left]) or v_scope @> array[v_right] then
    raise exception 'PRJ-06 desired dependency scope is not exact: %', v_scope;
  end if;

  v_scope := public.discover_activity_mutation_scope(v_left_activity, v_left, '[]'::jsonb);
  if cardinality(v_scope) <> 2 or not (v_scope @> array[v_left, v_right]) then
    raise exception 'PRJ-06 incident dependency scope is incomplete: %', v_scope;
  end if;

  v_scope := public.discover_activity_mutation_scope(
    v_left_activity, v_isolated, '[]'::jsonb
  );
  if cardinality(v_scope) <> 3
    or not (v_scope @> array[v_left, v_right, v_isolated]) then
    raise exception 'PRJ-06 activity-move scope omitted an old, new, or connected project: %', v_scope;
  end if;

  update public.activity_dependencies
  set archived_at = now()
  where id = 'fc300000-0000-0000-0000-000000000001';
  v_scope := public.discover_project_schedule_scope(array[v_left]);
  if v_scope <> array[v_left] then
    raise exception 'PRJ-06 archived relationship expanded project scope: %', v_scope;
  end if;
  update public.activity_dependencies
  set archived_at = null
  where id = 'fc300000-0000-0000-0000-000000000001';

  v_scope := public.lock_project_schedule_scope(array[v_left]);
  if cardinality(v_scope) <> 2 or v_scope <> (
    select array_agg(id order by id::text) from unnest(array[v_left, v_right]) id
  ) then
    raise exception 'PRJ-06 scoped lock order is not deterministic: %', v_scope;
  end if;

  v_previous_lock_timeout := current_setting('lock_timeout');
  perform public.lock_project_schedule_set(array[v_isolated], 25);
  if current_setting('lock_timeout') <> v_previous_lock_timeout then
    raise exception 'PRJ-06 bounded lock acquisition leaked lock_timeout outside its helper.';
  end if;

  delete from public.projects where id in (v_left, v_right, v_isolated);
end;
$$;
