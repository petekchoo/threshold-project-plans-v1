-- PRJ-06 Slice 2.1: replace the global schedule mutex with bounded,
-- project-scoped locks shared by every authoritative graph mutation.

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'projects', 'project_owners', 'activities', 'activity_owners',
    'activity_links', 'activity_dependencies'
  ] loop
    execute format('drop trigger if exists lock_schedule_graph on public.%I', v_table);
  end loop;
end;
$$;

drop function if exists public.lock_schedule_graph();

create or replace function public.project_schedule_lock_key(p_project_id uuid) returns bigint
language sql
immutable
set search_path = pg_catalog, public
as $$
  select hashtextextended('threshold_project_schedule:' || p_project_id::text, 607);
$$;

create or replace function public.discover_project_schedule_scope(p_project_ids uuid[]) returns uuid[]
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with seeds as (
    select distinct id from unnest(coalesce(p_project_ids, '{}'::uuid[])) id where id is not null
  ), incident_projects as (
    select case
      when dependent.project_id in (select id from seeds) then prerequisite.project_id
      else dependent.project_id
    end id
    from public.activity_dependencies d
    join public.activities dependent
      on dependent.id = d.activity_id and dependent.archived_at is null
    join public.activities prerequisite
      on prerequisite.id = d.depends_on_activity_id and prerequisite.archived_at is null
    where d.archived_at is null
      and (dependent.project_id in (select id from seeds)
        or prerequisite.project_id in (select id from seeds))
  )
  select coalesce(array_agg(id order by id::text), '{}'::uuid[])
  from (select id from seeds union select id from incident_projects) scoped;
$$;

create or replace function public.discover_activity_mutation_scope(
  p_activity_id uuid,
  p_new_project_id uuid,
  p_dependencies jsonb default '[]'
) returns uuid[]
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with target as (
    select a.id, a.project_id from public.activities a where a.id = p_activity_id
  ), incident_projects as (
    select unnest(array[dependent.project_id, prerequisite.project_id]) id
    from public.activity_dependencies d
    join public.activities dependent on dependent.id = d.activity_id and dependent.archived_at is null
    join public.activities prerequisite on prerequisite.id = d.depends_on_activity_id and prerequisite.archived_at is null
    where d.archived_at is null and (dependent.id = p_activity_id or prerequisite.id = p_activity_id)
  ), requested_projects as (
    select a.project_id id
    from jsonb_array_elements(coalesce(p_dependencies, '[]'::jsonb)) requested
    join public.activities a on a.id = (requested->>'depends_on_activity_id')::uuid
    where a.archived_at is null
  ), scoped as (
    select project_id id from target
    union select p_new_project_id where p_new_project_id is not null
    union select id from incident_projects
    union select id from requested_projects
  )
  select coalesce(array_agg(id order by id::text), '{}'::uuid[])
  from (select distinct id from scoped where id is not null) deduplicated;
$$;

create or replace function public.lock_project_schedule_set(
  p_project_ids uuid[],
  p_timeout_ms integer default 3000
) returns uuid[]
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_ids uuid[];
  v_id uuid;
  v_previous_lock_timeout text;
begin
  select coalesce(array_agg(id order by id::text), '{}'::uuid[])
  into v_ids
  from (select distinct id from unnest(coalesce(p_project_ids, '{}'::uuid[])) id where id is not null) values_to_lock;
  v_previous_lock_timeout := current_setting('lock_timeout');
  perform set_config('lock_timeout', greatest(coalesce(p_timeout_ms, 3000), 1)::text || 'ms', true);
  begin
    foreach v_id in array v_ids loop
      perform pg_advisory_xact_lock(public.project_schedule_lock_key(v_id));
    end loop;
  exception when lock_not_available then
    perform set_config('lock_timeout', v_previous_lock_timeout, true);
    raise exception using errcode = '55P03',
      message = 'PROJECT_SCHEDULE_BUSY: Another schedule change is still being saved. Try again.';
  end;
  perform set_config('lock_timeout', v_previous_lock_timeout, true);
  return v_ids;
end;
$$;

create or replace function public.lock_activity_mutation_scope(
  p_activity_id uuid,
  p_new_project_id uuid,
  p_dependencies jsonb default '[]',
  p_timeout_ms integer default 3000
) returns uuid[]
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_held uuid[];
  v_rechecked uuid[];
begin
  v_held := public.lock_project_schedule_set(
    public.discover_activity_mutation_scope(p_activity_id, p_new_project_id, p_dependencies),
    p_timeout_ms
  );
  v_rechecked := public.discover_activity_mutation_scope(
    p_activity_id, p_new_project_id, p_dependencies
  );
  if exists(select 1 from unnest(v_rechecked) id where not (id = any(v_held))) then
    raise exception using errcode = '40001',
      message = 'PROJECT_SCHEDULE_LOCK_SET_CHANGED: Refresh and retry the schedule change.';
  end if;
  return v_held;
end;
$$;

create or replace function public.lock_project_schedule_scope(
  p_project_ids uuid[],
  p_timeout_ms integer default 3000
) returns uuid[]
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_held uuid[];
  v_rechecked uuid[];
begin
  v_held := public.lock_project_schedule_set(public.discover_project_schedule_scope(p_project_ids), p_timeout_ms);
  v_rechecked := public.discover_project_schedule_scope(p_project_ids);
  if exists(select 1 from unnest(v_rechecked) id where not (id = any(v_held))) then
    raise exception using errcode = '40001', message = 'PROJECT_SCHEDULE_LOCK_SET_CHANGED: Refresh and retry the schedule change.';
  end if;
  return v_held;
end;
$$;

create or replace function public.lock_project_schedule_rows(p_project_ids uuid[]) returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform 1 from public.projects p where p.id = any(coalesce(p_project_ids, '{}'::uuid[])) order by p.id for update;
  perform 1 from public.activities a
  where a.project_id = any(coalesce(p_project_ids, '{}'::uuid[])) and a.archived_at is null
  order by a.id for update;
  perform 1 from public.activity_dependencies d
  where d.archived_at is null and (
    d.activity_id in (select id from public.activities where project_id = any(coalesce(p_project_ids, '{}'::uuid[])) and archived_at is null)
    or d.depends_on_activity_id in (select id from public.activities where project_id = any(coalesce(p_project_ids, '{}'::uuid[])) and archived_at is null)
  )
  order by d.id for update;
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
  perform public.lock_project_schedule_rows(public.lock_project_schedule_scope(array[p_project_id]));
  return public.complete_project_reschedule_plan(
    public.calculate_project_reschedule(p_project_id, p_new_start, p_new_end)
  );
end;
$$;

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
  v_locked uuid[];
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if nullif(trim(p_project->>'name'), '') is null then raise exception 'Project name is required.'; end if;
  if (p_project->>'end_date')::date < (p_project->>'start_date')::date then raise exception 'Project end date must be on or after its start date.'; end if;
  v_id := coalesce(nullif(p_project->>'id', '')::uuid, gen_random_uuid());
  v_locked := public.lock_project_schedule_set(array[v_id]);
  perform 1 from public.projects p where p.id = v_id for update;
  if nullif(p_project->>'id', '') is null then
    insert into public.projects(id, name, description, project_type_id, status, start_date, end_date, created_by)
    values(v_id, trim(p_project->>'name'), coalesce(p_project->>'description', ''), nullif(p_project->>'project_type_id', '')::uuid,
      (p_project->>'status')::public.project_status, (p_project->>'start_date')::date,
      (p_project->>'end_date')::date, auth.uid());
  else
    select * into v_existing from public.projects where id = v_id and archived_at is null;
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
  v_locked uuid[];
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if nullif(p_project->>'id', '') is null then raise exception 'Project id is required.'; end if;
  if nullif(trim(p_project->>'name'), '') is null then raise exception 'Project name is required.'; end if;
  if p_expected_schedule_fingerprint is null then raise exception 'A schedule fingerprint is required.'; end if;
  if nullif(p_project->>'start_date', '') is null or nullif(p_project->>'end_date', '') is null then raise exception 'Project start and end dates are required.'; end if;
  v_id := (p_project->>'id')::uuid;
  v_locked := public.lock_project_schedule_scope(array[v_id]);
  perform public.lock_project_schedule_rows(v_locked);
  if not exists(select 1 from public.projects where id = v_id and archived_at is null) then raise exception 'Project not found.'; end if;
  v_plan := public.complete_project_reschedule_plan(public.calculate_project_reschedule(
    v_id, (p_project->>'start_date')::date, (p_project->>'end_date')::date));
  if v_plan->>'schedule_fingerprint' is distinct from p_expected_schedule_fingerprint then
    raise exception 'The project schedule changed after preview. Refresh and review the updated preview.';
  end if;
  if not coalesce((v_plan->>'can_confirm')::boolean, false) then raise exception 'The proposed project schedule has blocking conflicts.'; end if;
  update public.projects set name = trim(p_project->>'name'), description = coalesce(p_project->>'description', ''),
    project_type_id = nullif(p_project->>'project_type_id', '')::uuid,
    status = (p_project->>'status')::public.project_status,
    start_date = (v_plan->>'proposed_project_start_date')::date,
    end_date = (v_plan->>'proposed_project_end_date')::date where id = v_id;
  delete from public.project_owners where project_id = v_id;
  insert into public.project_owners(project_id, team_member_id) select v_id, owner_id from unnest(coalesce(p_owner_ids, '{}')) owner_id;
  for v_change in select value from jsonb_array_elements(v_plan->'activity_changes') loop
    if v_change->>'disposition' = 'moved' then
      update public.activities set start_date = (v_change->>'proposed_start_date')::date,
        due_date = (v_change->>'proposed_due_date')::date
      where id = (v_change->>'activity_id')::uuid and archived_at is null;
    end if;
  end loop;
  set constraints enforce_project_schedule_on_activity, enforce_project_schedule_on_project immediate;
  set constraints enforce_project_schedule_on_activity, enforce_project_schedule_on_project deferred;
  return jsonb_build_object('project_id', v_id, 'mode', v_plan->>'mode',
    'end_delta_days', (v_plan->>'end_delta_days')::integer,
    'moved_activity_count', (select count(*) from jsonb_array_elements(v_plan->'activity_changes') where value->>'disposition' = 'moved'),
    'schedule_fingerprint', public.project_schedule_fingerprint(v_id));
end;
$$;

create or replace function public.save_activity(
  p_activity jsonb,
  p_owner_ids uuid[] default '{}',
  p_links jsonb default '[]',
  p_dependencies jsonb default '[]'
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_id uuid;
  v_project_id uuid;
  v_start_date date;
  v_project_start date;
  v_link jsonb;
  v_dependency jsonb;
  v_locked uuid[];
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if nullif(trim(p_activity->>'name'), '') is null then raise exception 'Activity name is required.'; end if;
  if (p_activity->>'due_date')::date < (p_activity->>'start_date')::date then raise exception 'Activity due date must be on or after its start date.'; end if;
  v_id := coalesce(nullif(p_activity->>'id', '')::uuid, gen_random_uuid());
  v_project_id := (p_activity->>'project_id')::uuid;
  v_start_date := (p_activity->>'start_date')::date;
  v_locked := public.lock_activity_mutation_scope(v_id, v_project_id, p_dependencies);
  perform public.lock_project_schedule_rows(v_locked);
  select start_date into v_project_start from public.projects where id = v_project_id and archived_at is null;
  if not found then raise exception 'Project not found.'; end if;
  if v_start_date < v_project_start then
    if not coalesce((p_activity->>'adjust_project_start')::boolean, false) then
      raise exception 'Activity start date (%) is earlier than the project start date (%).', v_start_date, v_project_start;
    end if;
    update public.projects set start_date = v_start_date where id = v_project_id;
  end if;
  if nullif(p_activity->>'id', '') is null then
    insert into public.activities(id, project_id, activity_type_id, name, status, priority, start_date, due_date, notes,
      allow_outside_project, project_timing_rule, project_timing_boundary, project_timing_offset_days, created_by)
    values(v_id, v_project_id, nullif(p_activity->>'activity_type_id', '')::uuid, trim(p_activity->>'name'),
      (p_activity->>'status')::public.activity_status, (p_activity->>'priority')::public.activity_priority,
      v_start_date, (p_activity->>'due_date')::date, coalesce(p_activity->>'notes', ''),
      coalesce((p_activity->>'allow_outside_project')::boolean, false), nullif(p_activity->>'project_timing_rule', ''),
      case when nullif(p_activity->>'project_timing_rule', '') is null then null else nullif(p_activity->>'project_timing_boundary', '') end,
      case when nullif(p_activity->>'project_timing_rule', '') is null then null else nullif(p_activity->>'project_timing_offset_days', '')::integer end,
      auth.uid());
  else
    update public.activities set project_id = v_project_id,
      activity_type_id = nullif(p_activity->>'activity_type_id', '')::uuid,
      name = trim(p_activity->>'name'), status = (p_activity->>'status')::public.activity_status,
      priority = (p_activity->>'priority')::public.activity_priority, start_date = v_start_date,
      due_date = (p_activity->>'due_date')::date, notes = coalesce(p_activity->>'notes', ''),
      allow_outside_project = coalesce((p_activity->>'allow_outside_project')::boolean, false),
      project_timing_rule = nullif(p_activity->>'project_timing_rule', ''),
      project_timing_boundary = case when nullif(p_activity->>'project_timing_rule', '') is null then null else nullif(p_activity->>'project_timing_boundary', '') end,
      project_timing_offset_days = case when nullif(p_activity->>'project_timing_rule', '') is null then null else nullif(p_activity->>'project_timing_offset_days', '')::integer end
    where id = v_id and archived_at is null;
    if not found then raise exception 'Activity not found.'; end if;
  end if;
  delete from public.activity_owners where activity_id = v_id;
  insert into public.activity_owners(activity_id, team_member_id) select v_id, owner_id from unnest(coalesce(p_owner_ids, '{}')) owner_id;
  update public.activity_links set archived_at = now() where activity_id = v_id and archived_at is null;
  for v_link in select value from jsonb_array_elements(coalesce(p_links, '[]')) loop
    if nullif(v_link->>'id', '') is null then
      insert into public.activity_links(activity_id, label, url, sort_order)
      values(v_id, nullif(trim(v_link->>'label'), ''), trim(v_link->>'url'), coalesce((v_link->>'sort_order')::integer, 0));
    else
      update public.activity_links set label = nullif(trim(v_link->>'label'), ''), url = trim(v_link->>'url'),
        sort_order = coalesce((v_link->>'sort_order')::integer, 0), archived_at = null
      where id = (v_link->>'id')::uuid and activity_id = v_id;
    end if;
  end loop;
  update public.activity_dependencies set archived_at = now() where activity_id = v_id and archived_at is null;
  for v_dependency in select value from jsonb_array_elements(coalesce(p_dependencies, '[]')) loop
    update public.activity_dependencies set constraint_type = (v_dependency->>'constraint_type')::public.dependency_type, archived_at = null
    where activity_id = v_id and depends_on_activity_id = (v_dependency->>'depends_on_activity_id')::uuid;
    if not found then
      insert into public.activity_dependencies(activity_id, depends_on_activity_id, constraint_type)
      values(v_id, (v_dependency->>'depends_on_activity_id')::uuid, (v_dependency->>'constraint_type')::public.dependency_type);
    end if;
  end loop;
  set constraints enforce_project_schedule_on_activity, enforce_project_schedule_on_project immediate;
  set constraints enforce_project_schedule_on_activity, enforce_project_schedule_on_project deferred;
  return v_id;
end;
$$;

create or replace function public.archive_activity(p_activity_id uuid) returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_locked uuid[];
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  v_locked := public.lock_activity_mutation_scope(p_activity_id, null, '[]');
  perform public.lock_project_schedule_rows(v_locked);
  update public.activity_dependencies set archived_at = now()
  where archived_at is null and (activity_id = p_activity_id or depends_on_activity_id = p_activity_id);
  update public.activity_links set archived_at = now() where activity_id = p_activity_id and archived_at is null;
  update public.activities set archived_at = now() where id = p_activity_id and archived_at is null;
end;
$$;

create or replace function public.archive_project(p_project_id uuid) returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_locked uuid[];
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  v_locked := public.lock_project_schedule_scope(array[p_project_id]);
  perform public.lock_project_schedule_rows(v_locked);
  update public.activity_dependencies set archived_at = now()
  where archived_at is null and (activity_id in (select id from public.activities where project_id = p_project_id)
    or depends_on_activity_id in (select id from public.activities where project_id = p_project_id));
  update public.activity_links set archived_at = now()
  where activity_id in (select id from public.activities where project_id = p_project_id) and archived_at is null;
  update public.activities set archived_at = now() where project_id = p_project_id and archived_at is null;
  update public.projects set archived_at = now() where id = p_project_id and archived_at is null;
end;
$$;

revoke execute on function public.project_schedule_lock_key(uuid) from public, anon, authenticated;
revoke execute on function public.discover_project_schedule_scope(uuid[]) from public, anon, authenticated;
revoke execute on function public.discover_activity_mutation_scope(uuid, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.lock_project_schedule_set(uuid[], integer) from public, anon, authenticated;
revoke execute on function public.lock_project_schedule_scope(uuid[], integer) from public, anon, authenticated;
revoke execute on function public.lock_activity_mutation_scope(uuid, uuid, jsonb, integer) from public, anon, authenticated;
revoke execute on function public.lock_project_schedule_rows(uuid[]) from public, anon, authenticated;

revoke execute on function public.preview_project_reschedule(uuid, date, date) from public, anon;
revoke execute on function public.reschedule_project(jsonb, uuid[], text) from public, anon;
revoke execute on function public.save_project(jsonb, uuid[]) from public, anon;
revoke execute on function public.save_activity(jsonb, uuid[], jsonb, jsonb) from public, anon;
revoke execute on function public.archive_activity(uuid) from public, anon;
revoke execute on function public.archive_project(uuid) from public, anon;
grant execute on function public.preview_project_reschedule(uuid, date, date) to authenticated;
grant execute on function public.reschedule_project(jsonb, uuid[], text) to authenticated;
grant execute on function public.save_project(jsonb, uuid[]) to authenticated;
grant execute on function public.save_activity(jsonb, uuid[], jsonb, jsonb) to authenticated;
grant execute on function public.archive_activity(uuid) to authenticated;
grant execute on function public.archive_project(uuid) to authenticated;

revoke insert, update, delete on table public.projects from authenticated;
revoke insert, update, delete on table public.project_owners from authenticated;
revoke insert, update, delete on table public.activities from authenticated;
revoke insert, update, delete on table public.activity_owners from authenticated;
revoke insert, update, delete on table public.activity_links from authenticated;
revoke insert, update, delete on table public.activity_dependencies from authenticated;
