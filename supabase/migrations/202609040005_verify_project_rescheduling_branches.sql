-- Transactional Gate B verification for SQL branches that differ most from the pure planner.

do $$
declare
  v_user_id constant uuid := 'fa000000-0000-0000-0000-000000000001';
  v_compress_project constant uuid := 'fa100000-0000-0000-0000-000000000001';
  v_timing_project constant uuid := 'fa100000-0000-0000-0000-000000000002';
  v_external_project constant uuid := 'fa100000-0000-0000-0000-000000000003';
  v_plan jsonb;
  v_first_fingerprint text;
  v_failed boolean;
begin
  if exists(select 1 from public.projects where id in (v_compress_project, v_timing_project, v_external_project)) then
    raise exception 'PRJ-06 Gate B verification identifiers already exist.';
  end if;

  insert into public.projects(id, name, description, status, start_date, end_date) values
    (v_compress_project, 'Gate B compression', '', 'on_track', '2026-04-01', '2026-04-10'),
    (v_timing_project, 'Gate B timing', '', 'on_track', '2026-04-01', '2026-04-10'),
    (v_external_project, 'Gate B external', '', 'on_track', '2026-04-01', '2026-04-30');

  insert into public.activities(
    id, project_id, name, status, priority, start_date, due_date,
    allow_outside_project, project_timing_rule, project_timing_boundary, project_timing_offset_days
  ) values
    ('fa200000-0000-0000-0000-000000000001', v_compress_project, 'Gate B earliest', 'not_started', 'normal', '2026-04-02', '2026-04-04', false, null, null, null),
    ('fa200000-0000-0000-0000-000000000002', v_timing_project, 'Gate B completed post work', 'completed', 'normal', '2026-04-09', '2026-04-12', true, 'post_project_deadline', 'end', 4),
    ('fa200000-0000-0000-0000-000000000003', v_timing_project, 'Gate B completed prerequisite', 'completed', 'normal', '2026-04-02', '2026-04-08', false, null, null, null),
    ('fa200000-0000-0000-0000-000000000004', v_timing_project, 'Gate B FTS dependent', 'not_started', 'normal', '2026-04-06', '2026-04-09', false, null, null, null),
    ('fa200000-0000-0000-0000-000000000005', v_timing_project, 'Gate B FTF dependent', 'not_started', 'normal', '2026-04-06', '2026-04-07', false, null, null, null),
    ('fa200000-0000-0000-0000-000000000006', v_timing_project, 'Gate B completed dependent', 'completed', 'normal', '2026-04-08', '2026-04-09', false, null, null, null),
    ('fa200000-0000-0000-0000-000000000007', v_timing_project, 'Gate B incomplete prerequisite', 'not_started', 'normal', '2026-04-01', '2026-04-08', false, null, null, null),
    ('fa200000-0000-0000-0000-000000000008', v_external_project, 'Gate B external prerequisite', 'not_started', 'normal', '2026-04-01', '2026-04-20', false, null, null, null);

  insert into public.activity_dependencies(id, activity_id, depends_on_activity_id, constraint_type) values
    ('fa300000-0000-0000-0000-000000000001', 'fa200000-0000-0000-0000-000000000004', 'fa200000-0000-0000-0000-000000000003', 'finish_to_start'),
    ('fa300000-0000-0000-0000-000000000002', 'fa200000-0000-0000-0000-000000000005', 'fa200000-0000-0000-0000-000000000003', 'finish_to_finish'),
    ('fa300000-0000-0000-0000-000000000003', 'fa200000-0000-0000-0000-000000000006', 'fa200000-0000-0000-0000-000000000007', 'finish_to_start'),
    ('fa300000-0000-0000-0000-000000000004', 'fa200000-0000-0000-0000-000000000004', 'fa200000-0000-0000-0000-000000000008', 'finish_to_start'),
    ('fa300000-0000-0000-0000-000000000005', 'fa200000-0000-0000-0000-000000000004', 'fa200000-0000-0000-0000-000000000007', 'finish_to_start'),
    ('fa300000-0000-0000-0000-000000000006', 'fa200000-0000-0000-0000-000000000005', 'fa200000-0000-0000-0000-000000000007', 'finish_to_finish');

  perform set_config('request.jwt.claim.sub', v_user_id::text, true);

  v_plan := public.preview_project_reschedule(v_compress_project, '2026-04-08', '2026-04-15');
  if (v_plan->>'can_confirm')::boolean
    or v_plan->>'earliest_containing_start_date' <> '2026-04-07'
    or not (v_plan->'conflicts' @> '[{"code":"ACTIVITY_BEFORE_PROJECT_START"}]'::jsonb) then
    raise exception 'PRJ-06 compression verification failed: %', v_plan;
  end if;

  v_plan := public.preview_project_reschedule(v_timing_project, '2026-04-01', '2026-04-15');
  if not (v_plan->'conflicts' @> '[{"code":"POST_PROJECT_WINDOW_VIOLATION","difference_days":3}]'::jsonb)
    or not (v_plan->'conflicts' @> '[{"code":"OUTSIDE_PROJECT_EXCEPTION_STALE"}]'::jsonb)
    or not (v_plan->'conflicts' @> '[{"code":"FINISH_TO_START_VIOLATION","dependency_scope":"internal"}]'::jsonb)
    or not (v_plan->'conflicts' @> '[{"code":"FINISH_TO_FINISH_VIOLATION","dependency_scope":"internal"}]'::jsonb)
    or not (v_plan->'conflicts' @> '[{"code":"COMPLETED_DEPENDENT_INCOMPLETE_PREREQUISITE"}]'::jsonb)
    or not (v_plan->'conflicts' @> '[{"code":"FINISH_TO_START_VIOLATION","dependency_scope":"incoming"}]'::jsonb) then
    raise exception 'PRJ-06 timing/dependency verification failed: %', v_plan;
  end if;

  if v_plan->'conflicts' @> '[{"dependency_id":"fa300000-0000-0000-0000-000000000001"}]'::jsonb
    or v_plan->'conflicts' @> '[{"dependency_id":"fa300000-0000-0000-0000-000000000002"}]'::jsonb then
    raise exception 'Completed prerequisites must satisfy dependency timing everywhere: %', v_plan;
  end if;

  v_first_fingerprint := v_plan->>'schedule_fingerprint';
  update public.activities set name = 'Gate B renamed prerequisite'
  where id = 'fa200000-0000-0000-0000-000000000008';
  v_plan := public.preview_project_reschedule(v_timing_project, '2026-04-01', '2026-04-15');
  if v_plan->>'schedule_fingerprint' = v_first_fingerprint then
    raise exception 'PRJ-06 fingerprint did not include an external activity name.';
  end if;

  v_failed := false;
  begin
    perform public.preview_project_reschedule(v_compress_project, null, '2026-04-15');
  exception when raise_exception then
    if sqlerrm = 'Project start and end dates are required.' then v_failed := true; else raise; end if;
  end;
  if not v_failed then raise exception 'PRJ-06 null-date verification failed.'; end if;

  delete from public.projects where id in (v_compress_project, v_timing_project, v_external_project);
end;
$$;
