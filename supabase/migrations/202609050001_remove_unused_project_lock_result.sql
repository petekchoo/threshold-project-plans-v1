-- PRJ-06 Slice 2.1: keep the scoped lock side effect without retaining its
-- already-sorted result in metadata-only project saves.

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
  if nullif(trim(p_project->>'name'), '') is null then raise exception 'Project name is required.'; end if;
  if (p_project->>'end_date')::date < (p_project->>'start_date')::date then raise exception 'Project end date must be on or after its start date.'; end if;
  v_id := coalesce(nullif(p_project->>'id', '')::uuid, gen_random_uuid());
  perform public.lock_project_schedule_set(array[v_id]);
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

revoke execute on function public.save_project(jsonb, uuid[]) from public, anon;
grant execute on function public.save_project(jsonb, uuid[]) to authenticated;
