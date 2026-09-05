-- PRJ-06: authoritative project-reschedule preview and atomic commit.

create or replace function public.lock_schedule_graph() returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('threshold_schedule_graph', 0));
  return null;
end;
$$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'projects', 'project_owners', 'activities', 'activity_owners',
    'activity_links', 'activity_dependencies'
  ] loop
    execute format('drop trigger if exists lock_schedule_graph on public.%I', v_table);
    execute format(
      'create trigger lock_schedule_graph before insert or update or delete on public.%I for each statement execute function public.lock_schedule_graph()',
      v_table
    );
  end loop;
end;
$$;

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

create or replace function public.calculate_project_reschedule(
  p_project_id uuid,
  p_new_start date,
  p_new_end date
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_project public.projects%rowtype;
  v_activity public.activities%rowtype;
  v_edge record;
  v_has_completed boolean;
  v_mode text;
  v_delta integer;
  v_effective_start date;
  v_old_span integer;
  v_new_span integer;
  v_window_change text;
  v_disposition text;
  v_start date;
  v_due date;
  v_prerequisite_due date;
  v_dependent_start date;
  v_dependent_due date;
  v_earliest date;
  v_changes jsonb := '[]'::jsonb;
  v_conflicts jsonb := '[]'::jsonb;
  v_dates jsonb := '{}'::jsonb;
begin
  if p_new_start is null or p_new_end is null then
    raise exception 'Project start and end dates are required.';
  end if;
  select * into v_project from public.projects where id = p_project_id and archived_at is null;
  if not found then raise exception 'Project not found.'; end if;

  select exists(select 1 from public.activities a
    where a.project_id = p_project_id and a.archived_at is null and a.status = 'completed')
  into v_has_completed;
  v_mode := case when v_has_completed then 'reschedule_remaining_work' else 'move_entire_schedule' end;
  v_delta := p_new_end - v_project.end_date;
  v_effective_start := case when v_has_completed then v_project.start_date else p_new_start end;
  v_old_span := v_project.end_date - v_project.start_date;
  v_new_span := p_new_end - p_new_start;
  v_window_change := case
    when p_new_start = v_project.start_date and p_new_end = v_project.end_date then 'unchanged'
    when v_new_span > v_old_span then 'expand'
    when v_new_span < v_old_span then 'compress'
    else 'shift'
  end;

  if v_project.status = 'completed' then
    v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
      'code', 'PROJECT_COMPLETED', 'project_id', p_project_id,
      'message', v_project.name || ' must be reopened before it can be rescheduled.'
    ));
  end if;
  if p_new_end < p_new_start then
    v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
      'code', 'PROJECT_DATE_ORDER', 'project_id', p_project_id,
      'message', 'The proposed project end date is before its start date.',
      'dates', jsonb_build_object('project_start', p_new_start, 'project_end', p_new_end)
    ));
  end if;
  if v_effective_start <> p_new_start and p_new_end < v_effective_start then
    v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
      'code', 'PROJECT_DATE_ORDER', 'project_id', p_project_id,
      'message', 'The effective project end date is before the preserved project start date.',
      'dates', jsonb_build_object('project_start', v_effective_start, 'project_end', p_new_end)
    ));
  end if;
  if v_has_completed and p_new_start <> v_project.start_date then
    v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
      'code', 'PROJECT_START_CHANGE_WITH_COMPLETED_WORK', 'project_id', p_project_id,
      'message', 'The project start cannot change while completed activities remain fixed.',
      'dates', jsonb_build_object('current_start', v_project.start_date, 'requested_start', p_new_start),
      'difference_days', p_new_start - v_project.start_date
    ));
  end if;

  for v_activity in select * from public.activities where project_id = p_project_id order by id loop
    if v_activity.archived_at is not null then
      v_disposition := 'unchanged_archived'; v_start := v_activity.start_date; v_due := v_activity.due_date;
    elsif v_has_completed and v_activity.status = 'completed' then
      v_disposition := 'preserved_completed'; v_start := v_activity.start_date; v_due := v_activity.due_date;
    elsif v_delta = 0 then
      v_disposition := 'unchanged_active'; v_start := v_activity.start_date; v_due := v_activity.due_date;
    else
      v_disposition := 'moved'; v_start := v_activity.start_date + v_delta; v_due := v_activity.due_date + v_delta;
    end if;
    v_changes := v_changes || jsonb_build_array(jsonb_build_object(
      'activity_id', v_activity.id, 'project_id', v_activity.project_id, 'name', v_activity.name,
      'disposition', v_disposition, 'original_start_date', v_activity.start_date,
      'original_due_date', v_activity.due_date, 'proposed_start_date', v_start,
      'proposed_due_date', v_due
    ));
    if v_activity.archived_at is null then
      v_dates := v_dates || jsonb_build_object(v_activity.id::text,
        jsonb_build_object('start_date', v_start, 'due_date', v_due));
      if v_start < v_effective_start then
        v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
          'code', 'ACTIVITY_BEFORE_PROJECT_START', 'activity_id', v_activity.id,
          'project_id', p_project_id, 'message', v_activity.name || ' starts before the proposed project start.',
          'dates', jsonb_build_object('activity_start', v_start, 'project_start', v_effective_start),
          'difference_days', v_effective_start - v_start
        ));
      end if;
      if v_due < v_start then
        v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
          'code', 'ACTIVITY_DATE_ORDER', 'activity_id', v_activity.id, 'project_id', p_project_id,
          'message', v_activity.name || ' ends before it starts.',
          'dates', jsonb_build_object('activity_start', v_start, 'activity_due', v_due)
        ));
      end if;
      if v_activity.project_timing_rule = 'advance_deadline'
        and v_due > p_new_end - v_activity.project_timing_offset_days then
        v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
          'code', 'ADVANCE_DEADLINE_VIOLATION', 'activity_id', v_activity.id, 'project_id', p_project_id,
          'message', v_activity.name || ' finishes after its required advance deadline.',
          'dates', jsonb_build_object('activity_due', v_due, 'deadline', p_new_end - v_activity.project_timing_offset_days, 'project_end', p_new_end),
          'difference_days', v_due - (p_new_end - v_activity.project_timing_offset_days)
        ));
      elsif v_activity.project_timing_rule = 'post_project_deadline'
        and (v_due <= p_new_end or v_due > p_new_end + v_activity.project_timing_offset_days) then
        v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
          'code', 'POST_PROJECT_WINDOW_VIOLATION', 'activity_id', v_activity.id, 'project_id', p_project_id,
          'message', v_activity.name || ' does not finish within its required post-project window.',
          'dates', jsonb_build_object('activity_due', v_due, 'project_end', p_new_end, 'deadline', p_new_end + v_activity.project_timing_offset_days)
          , 'difference_days', case when v_due <= p_new_end then p_new_end - v_due else v_due - (p_new_end + v_activity.project_timing_offset_days) end
        ));
      end if;
      if v_due > p_new_end and not v_activity.allow_outside_project then
        v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
          'code', 'OUTSIDE_PROJECT_UNAPPROVED', 'activity_id', v_activity.id, 'project_id', p_project_id,
          'message', v_activity.name || ' finishes after the project end without a recorded exception.',
          'dates', jsonb_build_object('activity_due', v_due, 'project_end', p_new_end),
          'difference_days', v_due - p_new_end
        ));
      elsif v_due <= p_new_end and v_activity.allow_outside_project then
        v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
          'code', 'OUTSIDE_PROJECT_EXCEPTION_STALE', 'activity_id', v_activity.id, 'project_id', p_project_id,
          'message', v_activity.name || ' retains a project-date exception but no longer finishes after the project end.',
          'dates', jsonb_build_object('activity_due', v_due, 'project_end', p_new_end)
        ));
      end if;
    end if;
  end loop;

  for v_edge in
    select d.id, d.constraint_type,
      dependent.id dependent_id, dependent.name dependent_name, dependent.project_id dependent_project_id,
      dependent.status dependent_status, dependent.start_date dependent_start, dependent.due_date dependent_due,
      prerequisite.id prerequisite_id, prerequisite.name prerequisite_name,
      prerequisite.project_id prerequisite_project_id, prerequisite.status prerequisite_status,
      prerequisite.start_date prerequisite_start, prerequisite.due_date prerequisite_due
    from public.activity_dependencies d
    join public.activities dependent on dependent.id = d.activity_id and dependent.archived_at is null
    join public.activities prerequisite on prerequisite.id = d.depends_on_activity_id and prerequisite.archived_at is null
    where d.archived_at is null
      and (dependent.project_id = p_project_id or prerequisite.project_id = p_project_id)
    order by d.id
  loop
    v_dependent_start := coalesce((v_dates->v_edge.dependent_id::text->>'start_date')::date, v_edge.dependent_start);
    v_dependent_due := coalesce((v_dates->v_edge.dependent_id::text->>'due_date')::date, v_edge.dependent_due);
    v_prerequisite_due := coalesce((v_dates->v_edge.prerequisite_id::text->>'due_date')::date, v_edge.prerequisite_due);
    if v_edge.dependent_status = 'completed' and v_edge.prerequisite_status <> 'completed' then
      v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
        'code', 'COMPLETED_DEPENDENT_INCOMPLETE_PREREQUISITE', 'dependency_id', v_edge.id,
        'dependent_activity_id', v_edge.dependent_id, 'dependent_activity_name', v_edge.dependent_name,
        'dependent_project_id', v_edge.dependent_project_id,
        'prerequisite_activity_id', v_edge.prerequisite_id, 'prerequisite_activity_name', v_edge.prerequisite_name,
        'prerequisite_project_id', v_edge.prerequisite_project_id,
        'dependency_scope', case when v_edge.dependent_project_id = p_project_id and v_edge.prerequisite_project_id = p_project_id then 'internal' when v_edge.dependent_project_id = p_project_id then 'incoming' else 'outgoing' end,
        'project_id', p_project_id,
        'message', v_edge.dependent_name || ' is completed while its prerequisite ' || v_edge.prerequisite_name || ' remains incomplete.'
      ));
    end if;
    if v_edge.constraint_type = 'finish_to_start' and v_dependent_start < v_prerequisite_due then
      v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
        'code', 'FINISH_TO_START_VIOLATION', 'dependency_id', v_edge.id,
        'dependent_activity_id', v_edge.dependent_id, 'dependent_activity_name', v_edge.dependent_name,
        'dependent_project_id', v_edge.dependent_project_id,
        'prerequisite_activity_id', v_edge.prerequisite_id, 'prerequisite_activity_name', v_edge.prerequisite_name,
        'prerequisite_project_id', v_edge.prerequisite_project_id,
        'dependency_scope', case when v_edge.dependent_project_id = p_project_id and v_edge.prerequisite_project_id = p_project_id then 'internal' when v_edge.dependent_project_id = p_project_id then 'incoming' else 'outgoing' end,
        'project_id', p_project_id, 'message', v_edge.dependent_name || ' starts before prerequisite ' || v_edge.prerequisite_name || ' finishes.',
        'dates', jsonb_build_object('dependent_start', v_dependent_start, 'prerequisite_due', v_prerequisite_due),
        'difference_days', v_prerequisite_due - v_dependent_start
      ));
    elsif v_edge.constraint_type = 'finish_to_finish' and v_dependent_due < v_prerequisite_due then
      v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
        'code', 'FINISH_TO_FINISH_VIOLATION', 'dependency_id', v_edge.id,
        'dependent_activity_id', v_edge.dependent_id, 'dependent_activity_name', v_edge.dependent_name,
        'dependent_project_id', v_edge.dependent_project_id,
        'prerequisite_activity_id', v_edge.prerequisite_id, 'prerequisite_activity_name', v_edge.prerequisite_name,
        'prerequisite_project_id', v_edge.prerequisite_project_id,
        'dependency_scope', case when v_edge.dependent_project_id = p_project_id and v_edge.prerequisite_project_id = p_project_id then 'internal' when v_edge.dependent_project_id = p_project_id then 'incoming' else 'outgoing' end,
        'project_id', p_project_id, 'message', v_edge.dependent_name || ' finishes before prerequisite ' || v_edge.prerequisite_name || ' finishes.',
        'dates', jsonb_build_object('dependent_due', v_dependent_due, 'prerequisite_due', v_prerequisite_due),
        'difference_days', v_prerequisite_due - v_dependent_due
      ));
    end if;
  end loop;

  select min((value->>'proposed_start_date')::date) into v_earliest
  from jsonb_array_elements(v_changes)
  where value->>'disposition' <> 'unchanged_archived';

  return jsonb_build_object(
    'mode', v_mode, 'end_delta_days', v_delta, 'window_change', v_window_change,
    'original_project_start_date', v_project.start_date,
    'original_project_end_date', v_project.end_date,
    'requested_project_start_date', p_new_start,
    'requested_project_end_date', p_new_end,
    'proposed_project_start_date', v_effective_start,
    'proposed_project_end_date', p_new_end,
    'available_lead_in_days', case when v_earliest is null then null else v_earliest - v_effective_start end,
    'earliest_containing_start_date', case when v_mode = 'move_entire_schedule' and v_earliest < v_effective_start then v_earliest else null end,
    'activity_changes', v_changes, 'conflicts', v_conflicts,
    'can_confirm', jsonb_array_length(v_conflicts) = 0,
    'schedule_fingerprint', public.project_schedule_fingerprint(p_project_id)
  );
end;
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

create or replace function public.enforce_project_schedule() returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_new jsonb := to_jsonb(new);
  v_old jsonb := to_jsonb(old);
  v_project_id uuid;
  v_old_project_id uuid;
begin
  if tg_table_name = 'projects' then
    v_project_id := coalesce((v_new->>'id')::uuid, (v_old->>'id')::uuid);
  else
    v_project_id := coalesce((v_new->>'project_id')::uuid, (v_old->>'project_id')::uuid);
    v_old_project_id := (v_old->>'project_id')::uuid;
  end if;
  perform public.validate_project_schedule(v_project_id);
  if tg_table_name = 'activities' and v_old_project_id is distinct from (v_new->>'project_id')::uuid then
    perform public.validate_project_schedule(v_old_project_id);
  end if;
  return null;
end;
$$;

drop trigger if exists validate_activity_project_timing on public.activities;
drop trigger if exists validate_project_activity_timing on public.projects;
drop trigger if exists enforce_project_schedule_on_activity on public.activities;
create constraint trigger enforce_project_schedule_on_activity
after insert or update or delete on public.activities
deferrable initially deferred for each row execute function public.enforce_project_schedule();
drop trigger if exists enforce_project_schedule_on_project on public.projects;
create constraint trigger enforce_project_schedule_on_project
after insert or update on public.projects
deferrable initially deferred for each row execute function public.enforce_project_schedule();

create or replace function public.save_project(
  p_project jsonb,
  p_owner_ids uuid[] default '{}'
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_id uuid;
  v_existing public.projects%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('threshold_schedule_graph', 0));
  if nullif(trim(p_project->>'name'), '') is null then raise exception 'Project name is required.'; end if;
  if (p_project->>'end_date')::date < (p_project->>'start_date')::date then raise exception 'Project end date must be on or after its start date.'; end if;
  if nullif(p_project->>'id', '') is null then
    insert into public.projects(name, description, project_type_id, status, start_date, end_date, created_by)
    values(trim(p_project->>'name'), coalesce(p_project->>'description', ''), nullif(p_project->>'project_type_id', '')::uuid,
      (p_project->>'status')::public.project_status, (p_project->>'start_date')::date,
      (p_project->>'end_date')::date, auth.uid()) returning id into v_id;
  else
    v_id := (p_project->>'id')::uuid;
    select * into v_existing from public.projects where id = v_id and archived_at is null for update;
    if not found then raise exception 'Project not found.'; end if;
    if (p_project->>'start_date')::date <> v_existing.start_date or (p_project->>'end_date')::date <> v_existing.end_date then
      raise exception 'Project date changes require a reschedule preview.';
    end if;
    update public.projects set name = trim(p_project->>'name'), description = coalesce(p_project->>'description', ''),
      project_type_id = nullif(p_project->>'project_type_id', '')::uuid,
      status = (p_project->>'status')::public.project_status where id = v_id;
  end if;
  delete from public.project_owners where project_id = v_id;
  insert into public.project_owners(project_id, team_member_id)
    select v_id, owner_id from unnest(coalesce(p_owner_ids, '{}')) owner_id;
  set constraints enforce_project_schedule_on_activity, enforce_project_schedule_on_project immediate;
  set constraints enforce_project_schedule_on_activity, enforce_project_schedule_on_project deferred;
  return v_id;
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

revoke insert, update, delete on table public.projects from authenticated;
revoke insert, update, delete on table public.project_owners from authenticated;
revoke insert, update, delete on table public.activities from authenticated;
revoke insert, update, delete on table public.activity_owners from authenticated;
revoke insert, update, delete on table public.activity_links from authenticated;
revoke insert, update, delete on table public.activity_dependencies from authenticated;

revoke execute on function public.project_schedule_fingerprint(uuid) from public, anon, authenticated;
revoke execute on function public.calculate_project_reschedule(uuid, date, date) from public, anon, authenticated;
revoke execute on function public.validate_project_schedule(uuid) from public, anon, authenticated;
revoke execute on function public.preview_project_reschedule(uuid, date, date) from public, anon;
revoke execute on function public.reschedule_project(jsonb, uuid[], text) from public, anon;
revoke execute on function public.save_project(jsonb, uuid[]) from public, anon;
grant execute on function public.preview_project_reschedule(uuid, date, date) to authenticated;
grant execute on function public.reschedule_project(jsonb, uuid[], text) to authenticated;
grant execute on function public.save_project(jsonb, uuid[]) to authenticated;
