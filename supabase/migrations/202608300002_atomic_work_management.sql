alter table public.activity_dependencies
  drop constraint if exists activity_dependencies_activity_id_depends_on_activity_id_key;

create unique index if not exists activity_dependencies_active_pair_unique
  on public.activity_dependencies (activity_id, depends_on_activity_id)
  where archived_at is null;

create or replace function public.save_project(
  p_project jsonb,
  p_owner_ids uuid[] default '{}'
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  if nullif(trim(p_project->>'name'), '') is null then
    raise exception 'Project name is required.';
  end if;

  if (p_project->>'end_date')::date < (p_project->>'start_date')::date then
    raise exception 'Project end date must be on or after its start date.';
  end if;

  if nullif(p_project->>'id', '') is null then
    insert into public.projects (
      name, description, project_type_id, status, start_date, end_date, created_by
    ) values (
      trim(p_project->>'name'), coalesce(p_project->>'description', ''),
      nullif(p_project->>'project_type_id', '')::uuid,
      (p_project->>'status')::public.project_status,
      (p_project->>'start_date')::date, (p_project->>'end_date')::date,
      auth.uid()
    ) returning id into v_id;
  else
    v_id := (p_project->>'id')::uuid;
    update public.projects set
      name = trim(p_project->>'name'),
      description = coalesce(p_project->>'description', ''),
      project_type_id = nullif(p_project->>'project_type_id', '')::uuid,
      status = (p_project->>'status')::public.project_status,
      start_date = (p_project->>'start_date')::date,
      end_date = (p_project->>'end_date')::date
    where id = v_id and archived_at is null;
    if not found then raise exception 'Project not found.'; end if;
  end if;

  delete from public.project_owners where project_id = v_id;
  insert into public.project_owners (project_id, team_member_id)
  select v_id, owner_id from unnest(coalesce(p_owner_ids, '{}')) owner_id;

  return v_id;
end;
$$;

create or replace function public.save_activity(
  p_activity jsonb,
  p_owner_ids uuid[] default '{}',
  p_links jsonb default '[]',
  p_dependencies jsonb default '[]'
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_link jsonb;
  v_dependency jsonb;
begin
  if nullif(trim(p_activity->>'name'), '') is null then
    raise exception 'Activity name is required.';
  end if;

  if (p_activity->>'due_date')::date < (p_activity->>'start_date')::date then
    raise exception 'Activity due date must be on or after its start date.';
  end if;

  if nullif(p_activity->>'id', '') is null then
    insert into public.activities (
      project_id, activity_type_id, name, status, priority, start_date,
      due_date, notes, allow_outside_project, created_by
    ) values (
      (p_activity->>'project_id')::uuid,
      nullif(p_activity->>'activity_type_id', '')::uuid,
      trim(p_activity->>'name'),
      (p_activity->>'status')::public.activity_status,
      (p_activity->>'priority')::public.activity_priority,
      (p_activity->>'start_date')::date,
      (p_activity->>'due_date')::date,
      coalesce(p_activity->>'notes', ''),
      coalesce((p_activity->>'allow_outside_project')::boolean, false),
      auth.uid()
    ) returning id into v_id;
  else
    v_id := (p_activity->>'id')::uuid;
    update public.activities set
      project_id = (p_activity->>'project_id')::uuid,
      activity_type_id = nullif(p_activity->>'activity_type_id', '')::uuid,
      name = trim(p_activity->>'name'),
      status = (p_activity->>'status')::public.activity_status,
      priority = (p_activity->>'priority')::public.activity_priority,
      start_date = (p_activity->>'start_date')::date,
      due_date = (p_activity->>'due_date')::date,
      notes = coalesce(p_activity->>'notes', ''),
      allow_outside_project = coalesce((p_activity->>'allow_outside_project')::boolean, false)
    where id = v_id and archived_at is null;
    if not found then raise exception 'Activity not found.'; end if;
  end if;

  delete from public.activity_owners where activity_id = v_id;
  insert into public.activity_owners (activity_id, team_member_id)
  select v_id, owner_id from unnest(coalesce(p_owner_ids, '{}')) owner_id;

  update public.activity_links set archived_at = now()
  where activity_id = v_id and archived_at is null;
  for v_link in select value from jsonb_array_elements(coalesce(p_links, '[]')) loop
    if nullif(v_link->>'id', '') is null then
      insert into public.activity_links (activity_id, label, url, sort_order)
      values (v_id, nullif(trim(v_link->>'label'), ''), trim(v_link->>'url'), coalesce((v_link->>'sort_order')::integer, 0));
    else
      update public.activity_links set
        label = nullif(trim(v_link->>'label'), ''),
        url = trim(v_link->>'url'),
        sort_order = coalesce((v_link->>'sort_order')::integer, 0),
        archived_at = null
      where id = (v_link->>'id')::uuid and activity_id = v_id;
    end if;
  end loop;

  update public.activity_dependencies set archived_at = now()
  where activity_id = v_id and archived_at is null;
  for v_dependency in select value from jsonb_array_elements(coalesce(p_dependencies, '[]')) loop
    update public.activity_dependencies set
      constraint_type = (v_dependency->>'constraint_type')::public.dependency_type,
      archived_at = null
    where activity_id = v_id
      and depends_on_activity_id = (v_dependency->>'depends_on_activity_id')::uuid;
    if not found then
      insert into public.activity_dependencies (activity_id, depends_on_activity_id, constraint_type)
      values (v_id, (v_dependency->>'depends_on_activity_id')::uuid,
        (v_dependency->>'constraint_type')::public.dependency_type);
    end if;
  end loop;

  return v_id;
end;
$$;

create or replace function public.archive_activity(p_activity_id uuid) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.activity_dependencies set archived_at = now()
  where archived_at is null
    and (activity_id = p_activity_id or depends_on_activity_id = p_activity_id);
  update public.activity_links set archived_at = now()
  where activity_id = p_activity_id and archived_at is null;
  update public.activities set archived_at = now()
  where id = p_activity_id and archived_at is null;
end;
$$;

create or replace function public.archive_project(p_project_id uuid) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.activity_dependencies set archived_at = now()
  where archived_at is null and (
    activity_id in (select id from public.activities where project_id = p_project_id)
    or depends_on_activity_id in (select id from public.activities where project_id = p_project_id)
  );
  update public.activity_links set archived_at = now()
  where activity_id in (select id from public.activities where project_id = p_project_id)
    and archived_at is null;
  update public.activities set archived_at = now()
  where project_id = p_project_id and archived_at is null;
  update public.projects set archived_at = now()
  where id = p_project_id and archived_at is null;
end;
$$;

grant execute on function public.save_project(jsonb, uuid[]) to authenticated;
grant execute on function public.save_activity(jsonb, uuid[], jsonb, jsonb) to authenticated;
grant execute on function public.archive_activity(uuid) to authenticated;
grant execute on function public.archive_project(uuid) to authenticated;
