create or replace function public.validate_activity_project_timing() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_project public.projects%rowtype;
  v_deadline date;
begin
  select * into v_project from public.projects where id = new.project_id;
  if new.start_date < v_project.start_date then
    raise exception 'Activity start date (%) is earlier than the project start date (%).', new.start_date, v_project.start_date;
  end if;
  if new.project_timing_rule is null then return new; end if;
  if new.project_timing_rule = 'advance_deadline' then
    v_deadline := case new.project_timing_boundary when 'start' then v_project.start_date else v_project.end_date end
      - new.project_timing_offset_days;
  else
    v_deadline := v_project.end_date + new.project_timing_offset_days;
  end if;
  if new.due_date > v_deadline then
    raise exception 'Activity finish date (%) is later than its project timing deadline (%).', new.due_date, v_deadline;
  end if;
  return new;
end;
$$;

drop trigger if exists validate_activity_project_timing on public.activities;
create trigger validate_activity_project_timing
before insert or update of project_id, start_date, due_date, project_timing_rule, project_timing_boundary, project_timing_offset_days
on public.activities for each row execute function public.validate_activity_project_timing();

create or replace function public.validate_project_activity_timing() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_activity public.activities%rowtype;
  v_deadline date;
begin
  if new.start_date = old.start_date and new.end_date = old.end_date then return new; end if;
  for v_activity in select * from public.activities where project_id = new.id and archived_at is null loop
    if v_activity.start_date < new.start_date then
      raise exception 'Project start date (%) is later than activity "%" start date (%).', new.start_date, v_activity.name, v_activity.start_date;
    end if;
    if v_activity.project_timing_rule is not null then
      if v_activity.project_timing_rule = 'advance_deadline' then
        v_deadline := case v_activity.project_timing_boundary when 'start' then new.start_date else new.end_date end
          - v_activity.project_timing_offset_days;
      else
        v_deadline := new.end_date + v_activity.project_timing_offset_days;
      end if;
      if v_activity.due_date > v_deadline then
        raise exception 'Project date change places activity "%" after its project timing deadline (%).', v_activity.name, v_deadline;
      end if;
    end if;
  end loop;
  return new;
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
  v_project_id uuid;
  v_start_date date;
  v_project_start date;
  v_link jsonb;
  v_dependency jsonb;
begin
  if nullif(trim(p_activity->>'name'), '') is null then raise exception 'Activity name is required.'; end if;
  if (p_activity->>'due_date')::date < (p_activity->>'start_date')::date then raise exception 'Activity due date must be on or after its start date.'; end if;

  v_project_id := (p_activity->>'project_id')::uuid;
  v_start_date := (p_activity->>'start_date')::date;
  select start_date into v_project_start from public.projects where id = v_project_id and archived_at is null;
  if not found then raise exception 'Project not found.'; end if;
  if v_start_date < v_project_start then
    if not coalesce((p_activity->>'adjust_project_start')::boolean, false) then
      raise exception 'Activity start date (%) is earlier than the project start date (%).', v_start_date, v_project_start;
    end if;
    update public.projects set start_date = v_start_date where id = v_project_id;
  end if;

  if nullif(p_activity->>'id', '') is null then
    insert into public.activities (
      project_id, activity_type_id, name, status, priority, start_date, due_date, notes,
      allow_outside_project, project_timing_rule, project_timing_boundary, project_timing_offset_days, created_by
    ) values (
      v_project_id, nullif(p_activity->>'activity_type_id', '')::uuid, trim(p_activity->>'name'),
      (p_activity->>'status')::public.activity_status, (p_activity->>'priority')::public.activity_priority,
      v_start_date, (p_activity->>'due_date')::date, coalesce(p_activity->>'notes', ''),
      coalesce((p_activity->>'allow_outside_project')::boolean, false), nullif(p_activity->>'project_timing_rule', ''),
      case when nullif(p_activity->>'project_timing_rule', '') is null then null else nullif(p_activity->>'project_timing_boundary', '') end,
      case when nullif(p_activity->>'project_timing_rule', '') is null then null else nullif(p_activity->>'project_timing_offset_days', '')::integer end,
      auth.uid()
    ) returning id into v_id;
  else
    v_id := (p_activity->>'id')::uuid;
    update public.activities set
      project_id = v_project_id, activity_type_id = nullif(p_activity->>'activity_type_id', '')::uuid,
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
  insert into public.activity_owners (activity_id, team_member_id) select v_id, owner_id from unnest(coalesce(p_owner_ids, '{}')) owner_id;
  update public.activity_links set archived_at = now() where activity_id = v_id and archived_at is null;
  for v_link in select value from jsonb_array_elements(coalesce(p_links, '[]')) loop
    if nullif(v_link->>'id', '') is null then
      insert into public.activity_links (activity_id, label, url, sort_order) values (v_id, nullif(trim(v_link->>'label'), ''), trim(v_link->>'url'), coalesce((v_link->>'sort_order')::integer, 0));
    else
      update public.activity_links set label = nullif(trim(v_link->>'label'), ''), url = trim(v_link->>'url'), sort_order = coalesce((v_link->>'sort_order')::integer, 0), archived_at = null where id = (v_link->>'id')::uuid and activity_id = v_id;
    end if;
  end loop;
  update public.activity_dependencies set archived_at = now() where activity_id = v_id and archived_at is null;
  for v_dependency in select value from jsonb_array_elements(coalesce(p_dependencies, '[]')) loop
    update public.activity_dependencies set constraint_type = (v_dependency->>'constraint_type')::public.dependency_type, archived_at = null where activity_id = v_id and depends_on_activity_id = (v_dependency->>'depends_on_activity_id')::uuid;
    if not found then insert into public.activity_dependencies (activity_id, depends_on_activity_id, constraint_type) values (v_id, (v_dependency->>'depends_on_activity_id')::uuid, (v_dependency->>'constraint_type')::public.dependency_type); end if;
  end loop;
  return v_id;
end;
$$;

grant execute on function public.save_activity(jsonb, uuid[], jsonb, jsonb) to authenticated;
