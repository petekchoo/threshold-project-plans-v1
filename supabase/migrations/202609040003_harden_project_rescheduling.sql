-- Gate B hardening discovered by adversarial review after live verification.

create or replace function public.project_schedule_fingerprint(p_project_id uuid) returns text
language sql
security definer
set search_path = pg_catalog, public
as $$
  with target_activities as (
    select a.* from public.activities a
    where a.project_id = p_project_id and a.archived_at is null
  ), relevant_edges as (
    select d.* from public.activity_dependencies d
    where d.archived_at is null
      and (d.activity_id in (select id from target_activities)
        or d.depends_on_activity_id in (select id from target_activities))
  ), external_endpoints as (
    select distinct a.* from public.activities a
    where a.archived_at is null and a.project_id <> p_project_id
      and a.id in (
        select activity_id from relevant_edges
        union select depends_on_activity_id from relevant_edges
      )
  )
  select encode(extensions.digest(jsonb_build_object(
    'project', (select jsonb_build_object(
      'id', p.id, 'name', p.name, 'description', p.description,
      'project_type_id', p.project_type_id, 'status', p.status,
      'start_date', p.start_date, 'end_date', p.end_date, 'archived_at', p.archived_at
    ) from public.projects p where p.id = p_project_id),
    'owners', coalesce((select jsonb_agg(po.team_member_id order by po.team_member_id)
      from public.project_owners po where po.project_id = p_project_id), '[]'::jsonb),
    'activities', coalesce((select jsonb_agg(jsonb_build_object(
      'id', a.id, 'project_id', a.project_id, 'name', a.name, 'status', a.status,
      'start_date', a.start_date, 'due_date', a.due_date,
      'project_timing_rule', a.project_timing_rule,
      'project_timing_boundary', a.project_timing_boundary,
      'project_timing_offset_days', a.project_timing_offset_days,
      'allow_outside_project', a.allow_outside_project, 'archived_at', a.archived_at
    ) order by a.id) from target_activities a), '[]'::jsonb),
    'dependencies', coalesce((select jsonb_agg(jsonb_build_object(
      'id', d.id, 'activity_id', d.activity_id,
      'depends_on_activity_id', d.depends_on_activity_id,
      'constraint_type', d.constraint_type, 'archived_at', d.archived_at
    ) order by d.id) from relevant_edges d), '[]'::jsonb),
    'external_endpoints', coalesce((select jsonb_agg(jsonb_build_object(
      'id', a.id, 'project_id', a.project_id, 'name', a.name, 'status', a.status,
      'start_date', a.start_date, 'due_date', a.due_date, 'archived_at', a.archived_at
    ) order by a.id) from external_endpoints a), '[]'::jsonb)
  )::text, 'sha256'), 'hex');
$$;

create or replace function public.preview_project_reschedule(
  p_project_id uuid,
  p_new_start date,
  p_new_end date
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if p_new_start is null or p_new_end is null then raise exception 'Project start and end dates are required.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('threshold_schedule_graph', 0));
  return public.calculate_project_reschedule(p_project_id, p_new_start, p_new_end);
end;
$$;

create or replace function public.validate_project_schedule(p_project_id uuid) returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_project public.projects%rowtype;
  v_activity public.activities%rowtype;
  v_edge record;
begin
  select * into v_project from public.projects where id = p_project_id;
  if not found or v_project.archived_at is not null then return; end if;
  for v_activity in select * from public.activities where project_id = p_project_id and archived_at is null loop
    if v_activity.start_date < v_project.start_date then
      raise exception 'Activity start date (%) is earlier than the project start date (%).', v_activity.start_date, v_project.start_date;
    end if;
    if (v_activity.due_date > v_project.end_date) is distinct from v_activity.allow_outside_project then
      raise exception 'Activity "%" has an inconsistent project-date exception.', v_activity.name;
    end if;
    if v_activity.project_timing_rule = 'advance_deadline'
      and v_activity.due_date > v_project.end_date - v_activity.project_timing_offset_days then
      raise exception 'Activity "%" finishes after its project timing deadline.', v_activity.name;
    end if;
    if v_activity.project_timing_rule = 'post_project_deadline'
      and (v_activity.due_date <= v_project.end_date
        or v_activity.due_date > v_project.end_date + v_activity.project_timing_offset_days) then
      raise exception 'Activity "%" finishes outside its post-project timing window.', v_activity.name;
    end if;
  end loop;
  for v_edge in
    select d.constraint_type,
      dependent.name dependent_name, dependent.status dependent_status,
      dependent.start_date dependent_start, dependent.due_date dependent_due,
      prerequisite.name prerequisite_name, prerequisite.status prerequisite_status,
      prerequisite.due_date prerequisite_due
    from public.activity_dependencies d
    join public.activities dependent on dependent.id = d.activity_id and dependent.archived_at is null
    join public.activities prerequisite on prerequisite.id = d.depends_on_activity_id and prerequisite.archived_at is null
    where d.archived_at is null
      and (dependent.project_id = p_project_id or prerequisite.project_id = p_project_id)
  loop
    if v_edge.dependent_status = 'completed' and v_edge.prerequisite_status <> 'completed' then
      raise exception 'Completed activity "%" has incomplete prerequisite "%".', v_edge.dependent_name, v_edge.prerequisite_name;
    end if;
    if v_edge.constraint_type = 'finish_to_start' and v_edge.dependent_start < v_edge.prerequisite_due then
      raise exception 'Activity "%" starts before prerequisite "%" finishes.', v_edge.dependent_name, v_edge.prerequisite_name;
    end if;
    if v_edge.constraint_type = 'finish_to_finish' and v_edge.dependent_due < v_edge.prerequisite_due then
      raise exception 'Activity "%" finishes before prerequisite "%" finishes.', v_edge.dependent_name, v_edge.prerequisite_name;
    end if;
  end loop;
end;
$$;

create or replace function public.reschedule_project(
  p_project jsonb,
  p_owner_ids uuid[] default '{}',
  p_expected_schedule_fingerprint text default null
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_id uuid;
  v_plan jsonb;
  v_change jsonb;
  v_fingerprint text;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if nullif(p_project->>'id', '') is null then raise exception 'Project id is required.'; end if;
  if nullif(trim(p_project->>'name'), '') is null then raise exception 'Project name is required.'; end if;
  if p_expected_schedule_fingerprint is null then raise exception 'A schedule fingerprint is required.'; end if;
  if nullif(p_project->>'start_date', '') is null or nullif(p_project->>'end_date', '') is null then
    raise exception 'Project start and end dates are required.';
  end if;
  v_id := (p_project->>'id')::uuid;
  perform pg_advisory_xact_lock(hashtextextended('threshold_schedule_graph', 0));
  perform 1 from public.projects p where p.id in (
    select v_id union
    select distinct a.project_id from public.activities a where a.id in (
      select d.activity_id from public.activity_dependencies d join public.activities ta on ta.id = d.depends_on_activity_id
        where d.archived_at is null and ta.project_id = v_id and ta.archived_at is null
      union
      select d.depends_on_activity_id from public.activity_dependencies d join public.activities ta on ta.id = d.activity_id
        where d.archived_at is null and ta.project_id = v_id and ta.archived_at is null
    )
  ) order by p.id for update;
  perform 1 from public.activities a where a.project_id = v_id or a.id in (
    select d.activity_id from public.activity_dependencies d join public.activities ta on ta.id = d.depends_on_activity_id
      where d.archived_at is null and ta.project_id = v_id and ta.archived_at is null
    union
    select d.depends_on_activity_id from public.activity_dependencies d join public.activities ta on ta.id = d.activity_id
      where d.archived_at is null and ta.project_id = v_id and ta.archived_at is null
  ) order by a.id for update;
  perform 1 from public.activity_dependencies d where d.archived_at is null and (
    d.activity_id in (select id from public.activities where project_id = v_id and archived_at is null)
    or d.depends_on_activity_id in (select id from public.activities where project_id = v_id and archived_at is null)
  ) order by d.id for update;
  if not exists(select 1 from public.projects where id = v_id and archived_at is null) then raise exception 'Project not found.'; end if;
  v_fingerprint := public.project_schedule_fingerprint(v_id);
  if v_fingerprint is distinct from p_expected_schedule_fingerprint then
    raise exception 'The project schedule changed after preview. Refresh and review the updated preview.';
  end if;
  v_plan := public.calculate_project_reschedule(v_id, (p_project->>'start_date')::date, (p_project->>'end_date')::date);
  if not coalesce((v_plan->>'can_confirm')::boolean, false) then
    raise exception 'The proposed project schedule has blocking conflicts.';
  end if;
  update public.projects set name = trim(p_project->>'name'), description = coalesce(p_project->>'description', ''),
    project_type_id = nullif(p_project->>'project_type_id', '')::uuid,
    status = (p_project->>'status')::public.project_status,
    start_date = (v_plan->>'proposed_project_start_date')::date,
    end_date = (v_plan->>'proposed_project_end_date')::date
  where id = v_id;
  delete from public.project_owners where project_id = v_id;
  insert into public.project_owners(project_id, team_member_id)
    select v_id, owner_id from unnest(coalesce(p_owner_ids, '{}')) owner_id;
  for v_change in select value from jsonb_array_elements(v_plan->'activity_changes') loop
    if v_change->>'disposition' = 'moved' then
      update public.activities set start_date = (v_change->>'proposed_start_date')::date,
        due_date = (v_change->>'proposed_due_date')::date
      where id = (v_change->>'activity_id')::uuid and archived_at is null;
    end if;
  end loop;
  set constraints enforce_project_schedule_on_activity, enforce_project_schedule_on_project immediate;
  set constraints enforce_project_schedule_on_activity, enforce_project_schedule_on_project deferred;
  return jsonb_build_object(
    'project_id', v_id, 'mode', v_plan->>'mode', 'end_delta_days', (v_plan->>'end_delta_days')::integer,
    'moved_activity_count', (select count(*) from jsonb_array_elements(v_plan->'activity_changes') where value->>'disposition' = 'moved'),
    'schedule_fingerprint', public.project_schedule_fingerprint(v_id)
  );
end;
$$;

revoke execute on function public.project_schedule_fingerprint(uuid) from public, anon, authenticated;
revoke execute on function public.validate_project_schedule(uuid) from public, anon, authenticated;
revoke execute on function public.preview_project_reschedule(uuid, date, date) from public, anon;
revoke execute on function public.reschedule_project(jsonb, uuid[], text) from public, anon;
grant execute on function public.preview_project_reschedule(uuid, date, date) to authenticated;
grant execute on function public.reschedule_project(jsonb, uuid[], text) to authenticated;
