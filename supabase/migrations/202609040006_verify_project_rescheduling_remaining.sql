-- Final transactional Gate B verification for PRJ-06 persistence branches.
-- Fixed fixtures are deleted before this migration commits.

do $$
declare
  v_user constant uuid := 'fb000000-0000-0000-0000-000000000001';
  v_owner constant uuid := 'fb010000-0000-0000-0000-000000000001';
  v_valid constant uuid := 'fb100000-0000-0000-0000-000000000001';
  v_conflict constant uuid := 'fb100000-0000-0000-0000-000000000002';
  v_external constant uuid := 'fb100000-0000-0000-0000-000000000003';
  v_plan jsonb;
  v_before jsonb;
  v_after jsonb;
  v_failed boolean;
begin
  if exists(select 1 from public.projects where id in (v_valid, v_conflict, v_external))
    or exists(select 1 from public.team_members where id = v_owner) then
    raise exception 'PRJ-06 final verification identifiers already exist.';
  end if;

  insert into public.team_members(id, full_name, initials)
  values (v_owner, 'PRJ-06 final verification owner', 'PF');
  insert into public.projects(id, name, description, status, start_date, end_date) values
    (v_valid, 'Gate B valid schedule', '', 'on_track', '2026-04-01', '2026-04-10'),
    (v_conflict, 'Gate B blocked schedule', '', 'on_track', '2026-04-01', '2026-04-10'),
    (v_external, 'Gate B external schedule', '', 'on_track', '2026-04-01', '2026-04-30');
  insert into public.project_owners(project_id, team_member_id) values
    (v_valid, v_owner), (v_conflict, v_owner);

  insert into public.activities(
    id, project_id, name, status, priority, start_date, due_date,
    allow_outside_project, project_timing_rule, project_timing_boundary,
    project_timing_offset_days, archived_at
  ) values
    ('fb200000-0000-0000-0000-000000000001', v_valid, 'Anchor', 'not_started', 'normal', '2026-04-02', '2026-04-04', false, null, null, null, null),
    ('fb200000-0000-0000-0000-000000000002', v_valid, 'Advance deadline', 'not_started', 'normal', '2026-04-04', '2026-04-07', false, 'advance_deadline', 'end', 3, null),
    ('fb200000-0000-0000-0000-000000000003', v_valid, 'Post deadline', 'not_started', 'normal', '2026-04-09', '2026-04-12', true, 'post_project_deadline', 'end', 4, null),
    ('fb200000-0000-0000-0000-000000000004', v_valid, 'Approved exception', 'not_started', 'normal', '2026-04-09', '2026-04-12', true, null, null, null, null),
    ('fb200000-0000-0000-0000-000000000005', v_valid, 'Archived activity', 'completed', 'normal', '2026-03-01', '2026-05-01', true, null, null, null, now()),
    ('fb200000-0000-0000-0000-000000000006', v_external, 'External valid dependent', 'not_started', 'normal', '2026-04-09', '2026-04-11', false, null, null, null, null),
    ('fb200000-0000-0000-0000-000000000007', v_external, 'External archived-edge prerequisite', 'not_started', 'normal', '2026-04-01', '2026-04-30', false, null, null, null, null),
    ('fb200000-0000-0000-0000-000000000008', v_conflict, 'Outgoing conflict source', 'not_started', 'normal', '2026-04-06', '2026-04-09', false, null, null, null, null),
    ('fb200000-0000-0000-0000-000000000009', v_external, 'External blocked dependent', 'not_started', 'normal', '2026-04-12', '2026-04-13', false, null, null, null, null);

  insert into public.activity_dependencies(
    id, activity_id, depends_on_activity_id, constraint_type, archived_at
  ) values
    ('fb300000-0000-0000-0000-000000000001', 'fb200000-0000-0000-0000-000000000006', 'fb200000-0000-0000-0000-000000000001', 'finish_to_start', null),
    ('fb300000-0000-0000-0000-000000000002', 'fb200000-0000-0000-0000-000000000001', 'fb200000-0000-0000-0000-000000000007', 'finish_to_start', now()),
    ('fb300000-0000-0000-0000-000000000003', 'fb200000-0000-0000-0000-000000000009', 'fb200000-0000-0000-0000-000000000008', 'finish_to_start', null);

  perform set_config('request.jwt.claim.sub', v_user::text, true);
  v_plan := public.preview_project_reschedule(v_valid, '2026-04-06', '2026-04-15');
  if not (v_plan->>'can_confirm')::boolean or v_plan->'conflicts' <> '[]'::jsonb then
    raise exception 'PRJ-06 valid timing/cross-project preview failed: %', v_plan;
  end if;
  if not exists(
    select 1 from jsonb_array_elements(v_plan->'activity_changes') c
    where c->>'activity_id' = 'fb200000-0000-0000-0000-000000000005'
      and c->>'disposition' = 'unchanged_archived'
      and c->>'proposed_start_date' = '2026-03-01'
      and c->>'proposed_due_date' = '2026-05-01'
  ) then raise exception 'PRJ-06 archived activity preview failed: %', v_plan; end if;

  select jsonb_build_object(
    'archived', (select to_jsonb(a) from public.activities a where id = 'fb200000-0000-0000-0000-000000000005'),
    'external', (select to_jsonb(a) from public.activities a where id = 'fb200000-0000-0000-0000-000000000006'),
    'active_edge', (select to_jsonb(d) from public.activity_dependencies d where id = 'fb300000-0000-0000-0000-000000000001'),
    'archived_edge', (select to_jsonb(d) from public.activity_dependencies d where id = 'fb300000-0000-0000-0000-000000000002')
  ) into v_before;

  perform public.reschedule_project(
    jsonb_build_object('id', v_valid, 'name', 'Gate B valid schedule', 'description', '',
      'status', 'on_track', 'start_date', '2026-04-06', 'end_date', '2026-04-15'),
    array[v_owner], v_plan->>'schedule_fingerprint'
  );
  if not exists(select 1 from public.activities where id = 'fb200000-0000-0000-0000-000000000002'
      and start_date = '2026-04-09' and due_date = '2026-04-12'
      and project_timing_rule = 'advance_deadline' and project_timing_offset_days = 3 and not allow_outside_project)
    or not exists(select 1 from public.activities where id = 'fb200000-0000-0000-0000-000000000003'
      and start_date = '2026-04-14' and due_date = '2026-04-17'
      and project_timing_rule = 'post_project_deadline' and project_timing_offset_days = 4 and allow_outside_project)
    or not exists(select 1 from public.activities where id = 'fb200000-0000-0000-0000-000000000004'
      and start_date = '2026-04-14' and due_date = '2026-04-17' and allow_outside_project) then
    raise exception 'PRJ-06 timing/exception preservation commit failed.';
  end if;
  select jsonb_build_object(
    'archived', (select to_jsonb(a) from public.activities a where id = 'fb200000-0000-0000-0000-000000000005'),
    'external', (select to_jsonb(a) from public.activities a where id = 'fb200000-0000-0000-0000-000000000006'),
    'active_edge', (select to_jsonb(d) from public.activity_dependencies d where id = 'fb300000-0000-0000-0000-000000000001'),
    'archived_edge', (select to_jsonb(d) from public.activity_dependencies d where id = 'fb300000-0000-0000-0000-000000000002')
  ) into v_after;
  if v_after is distinct from v_before then
    raise exception 'PRJ-06 archived/external/relationship rows changed. Before %, after %', v_before, v_after;
  end if;

  v_plan := public.preview_project_reschedule(v_conflict, '2026-04-06', '2026-04-15');
  if (v_plan->>'can_confirm')::boolean
    or not (v_plan->'conflicts' @> '[{"code":"FINISH_TO_START_VIOLATION","dependency_scope":"outgoing"}]'::jsonb) then
    raise exception 'PRJ-06 outgoing conflict preview failed: %', v_plan;
  end if;
  select jsonb_build_object(
    'project', (select to_jsonb(p) from public.projects p where id = v_conflict),
    'owners', (select coalesce(jsonb_agg(to_jsonb(o) order by team_member_id), '[]'::jsonb) from public.project_owners o where project_id = v_conflict),
    'activities', (select coalesce(jsonb_agg(to_jsonb(a) order by id), '[]'::jsonb) from public.activities a where project_id = v_conflict),
    'external', (select to_jsonb(a) from public.activities a where id = 'fb200000-0000-0000-0000-000000000009'),
    'edge', (select to_jsonb(d) from public.activity_dependencies d where id = 'fb300000-0000-0000-0000-000000000003')
  ) into v_before;
  v_failed := false;
  begin
    perform public.reschedule_project(
      jsonb_build_object('id', v_conflict, 'name', 'Must not save', 'description', 'Must not save',
        'status', 'on_track', 'start_date', '2026-04-06', 'end_date', '2026-04-15'),
      '{}'::uuid[], v_plan->>'schedule_fingerprint'
    );
  exception when raise_exception then
    if sqlerrm = 'The proposed project schedule has blocking conflicts.' then v_failed := true; else raise; end if;
  end;
  if not v_failed then raise exception 'PRJ-06 conflict-bearing commit was not rejected.'; end if;
  select jsonb_build_object(
    'project', (select to_jsonb(p) from public.projects p where id = v_conflict),
    'owners', (select coalesce(jsonb_agg(to_jsonb(o) order by team_member_id), '[]'::jsonb) from public.project_owners o where project_id = v_conflict),
    'activities', (select coalesce(jsonb_agg(to_jsonb(a) order by id), '[]'::jsonb) from public.activities a where project_id = v_conflict),
    'external', (select to_jsonb(a) from public.activities a where id = 'fb200000-0000-0000-0000-000000000009'),
    'edge', (select to_jsonb(d) from public.activity_dependencies d where id = 'fb300000-0000-0000-0000-000000000003')
  ) into v_after;
  if v_after is distinct from v_before then
    raise exception 'PRJ-06 blocked commit wrote data. Before %, after %', v_before, v_after;
  end if;

  delete from public.projects where id in (v_valid, v_conflict, v_external);
  delete from public.team_members where id = v_owner;
end;
$$;
