-- Transactional deployment verification for PRJ-06.
-- Fixed test identifiers are removed before this migration commits.

-- Correct the table-neutral deferred trigger on databases where 202609040001
-- was applied before deployment verification exercised both trigger tables.
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

do $$
declare
  v_project_id constant uuid := 'f1000000-0000-0000-0000-000000000001';
  v_activity_id constant uuid := 'f2000000-0000-0000-0000-000000000001';
  v_owner_id constant uuid := 'f3000000-0000-0000-0000-000000000001';
  v_user_id constant uuid := 'f4000000-0000-0000-0000-000000000001';
  v_preview jsonb;
  v_fingerprint text;
  v_before jsonb;
  v_after jsonb;
  v_failed boolean;
begin
  if exists(select 1 from public.projects where id = v_project_id)
    or exists(select 1 from public.activities where id = v_activity_id)
    or exists(select 1 from public.team_members where id = v_owner_id) then
    raise exception 'PRJ-06 verification identifiers already exist.';
  end if;

  insert into public.team_members(id, full_name, initials)
  values (v_owner_id, 'PRJ-06 verification owner', 'PV');
  insert into public.projects(id, name, description, status, start_date, end_date)
  values (v_project_id, 'PRJ-06 verification project', '', 'on_track', '2026-04-01', '2026-04-10');
  insert into public.activities(
    id, project_id, name, status, priority, start_date, due_date, allow_outside_project
  ) values (
    v_activity_id, v_project_id, 'PRJ-06 verification activity', 'not_started',
    'normal', '2026-04-02', '2026-04-04', false
  );

  perform set_config('request.jwt.claim.sub', v_user_id::text, true);
  v_preview := public.preview_project_reschedule(v_project_id, '2026-04-06', '2026-04-15');
  if v_preview->>'mode' <> 'move_entire_schedule'
    or (v_preview->>'end_delta_days')::integer <> 5
    or not (v_preview->>'can_confirm')::boolean
    or v_preview#>>'{activity_changes,0,proposed_start_date}' <> '2026-04-07' then
    raise exception 'PRJ-06 authoritative preview verification failed: %', v_preview;
  end if;
  v_fingerprint := v_preview->>'schedule_fingerprint';

  select jsonb_build_object(
    'project_start', p.start_date, 'project_end', p.end_date,
    'activity_start', a.start_date, 'activity_due', a.due_date
  ) into v_before
  from public.projects p join public.activities a on a.project_id = p.id
  where p.id = v_project_id and a.id = v_activity_id;

  v_failed := false;
  begin
    perform public.reschedule_project(
      jsonb_build_object(
        'id', v_project_id, 'name', 'PRJ-06 verification project',
        'description', 'must roll back', 'status', 'on_track',
        'start_date', '2026-04-06', 'end_date', '2026-04-15'
      ), array['f3000000-0000-0000-0000-000000000099'::uuid], v_fingerprint
    );
  exception when foreign_key_violation then
    v_failed := true;
  end;
  if not v_failed then raise exception 'PRJ-06 rollback verification did not fail as expected.'; end if;

  select jsonb_build_object(
    'project_start', p.start_date, 'project_end', p.end_date,
    'activity_start', a.start_date, 'activity_due', a.due_date
  ) into v_after
  from public.projects p join public.activities a on a.project_id = p.id
  where p.id = v_project_id and a.id = v_activity_id;
  if v_after is distinct from v_before then
    raise exception 'PRJ-06 failed commit did not roll back atomically. Before %, after %', v_before, v_after;
  end if;

  perform public.reschedule_project(
    jsonb_build_object(
      'id', v_project_id, 'name', 'PRJ-06 verification project',
      'description', 'committed', 'status', 'on_track',
      'start_date', '2026-04-06', 'end_date', '2026-04-15'
    ), array[v_owner_id], v_fingerprint
  );
  if not exists(select 1 from public.projects where id = v_project_id
      and start_date = '2026-04-06' and end_date = '2026-04-15' and description = 'committed')
    or not exists(select 1 from public.activities where id = v_activity_id
      and start_date = '2026-04-07' and due_date = '2026-04-09')
    or not exists(select 1 from public.project_owners where project_id = v_project_id and team_member_id = v_owner_id) then
    raise exception 'PRJ-06 atomic commit verification failed.';
  end if;

  v_preview := public.preview_project_reschedule(v_project_id, '2026-04-07', '2026-04-16');
  update public.activities set status = 'blocked' where id = v_activity_id;
  v_failed := false;
  begin
    perform public.reschedule_project(
      jsonb_build_object(
        'id', v_project_id, 'name', 'PRJ-06 verification project',
        'description', 'stale commit', 'status', 'on_track',
        'start_date', '2026-04-07', 'end_date', '2026-04-16'
      ), array[v_owner_id], v_preview->>'schedule_fingerprint'
    );
  exception when raise_exception then
    if sqlerrm = 'The project schedule changed after preview. Refresh and review the updated preview.' then
      v_failed := true;
    else
      raise;
    end if;
  end;
  if not v_failed then raise exception 'PRJ-06 stale preview verification failed.'; end if;
  if not exists(select 1 from public.projects where id = v_project_id
      and start_date = '2026-04-06' and end_date = '2026-04-15' and description = 'committed') then
    raise exception 'PRJ-06 stale rejection changed the project.';
  end if;

  if has_table_privilege('authenticated', 'public.projects', 'UPDATE')
    or has_table_privilege('authenticated', 'public.project_owners', 'INSERT')
    or has_table_privilege('authenticated', 'public.activity_dependencies', 'INSERT') then
    raise exception 'PRJ-06 direct authenticated write protection verification failed.';
  end if;

  perform set_config('request.jwt.claim.sub', '', true);
  v_failed := false;
  begin
    perform public.preview_project_reschedule(v_project_id, '2026-04-06', '2026-04-15');
  exception when raise_exception then
    if sqlerrm = 'Authentication is required.' then v_failed := true; else raise; end if;
  end;
  if not v_failed then raise exception 'PRJ-06 unauthenticated preview verification failed.'; end if;

  delete from public.projects where id = v_project_id;
  delete from public.team_members where id = v_owner_id;
end;
$$;
