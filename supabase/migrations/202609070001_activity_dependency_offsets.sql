alter table public.activity_dependencies
  add column offset_days integer not null default 0 check (offset_days >= 0);

create or replace function public.validate_project_schedule(p_project_id uuid) returns void
language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_project public.projects%rowtype; v_activity public.activities%rowtype; v_edge record;
begin
  select * into v_project from public.projects where id = p_project_id;
  if not found or v_project.archived_at is not null then return; end if;
  for v_activity in select * from public.activities where project_id = p_project_id and archived_at is null loop
    if v_activity.start_date < v_project.start_date then raise exception 'Activity start date (%) is earlier than the project start date (%).', v_activity.start_date, v_project.start_date; end if;
    if (v_activity.due_date > v_project.end_date) is distinct from v_activity.allow_outside_project then raise exception 'Activity "%" has an inconsistent project-date exception.', v_activity.name; end if;
    if v_activity.project_timing_rule = 'advance_deadline' and v_activity.due_date > v_project.end_date - v_activity.project_timing_offset_days then raise exception 'Activity "%" finishes after its project timing deadline.', v_activity.name; end if;
    if v_activity.project_timing_rule = 'post_project_deadline' and (v_activity.due_date <= v_project.end_date or v_activity.due_date > v_project.end_date + v_activity.project_timing_offset_days) then raise exception 'Activity "%" finishes outside its post-project timing window.', v_activity.name; end if;
  end loop;
  for v_edge in select d.constraint_type,d.offset_days,dependent.name dependent_name,dependent.status dependent_status,dependent.start_date dependent_start,dependent.due_date dependent_due,prerequisite.name prerequisite_name,prerequisite.status prerequisite_status,prerequisite.due_date prerequisite_due
    from public.activity_dependencies d join public.activities dependent on dependent.id=d.activity_id and dependent.archived_at is null join public.activities prerequisite on prerequisite.id=d.depends_on_activity_id and prerequisite.archived_at is null
    where d.archived_at is null and (dependent.project_id=p_project_id or prerequisite.project_id=p_project_id)
  loop
    if v_edge.dependent_status='completed' and v_edge.prerequisite_status<>'completed' then raise exception 'Completed activity "%" has incomplete prerequisite "%".',v_edge.dependent_name,v_edge.prerequisite_name; end if;
    if v_edge.constraint_type='finish_to_start' and v_edge.dependent_start < v_edge.prerequisite_due + v_edge.offset_days then
      if v_edge.offset_days=0 then raise exception 'Activity "%" starts before prerequisite "%" finishes.',v_edge.dependent_name,v_edge.prerequisite_name;
      else raise exception 'Activity "%" starts before prerequisite "%" finishes plus its offset.',v_edge.dependent_name,v_edge.prerequisite_name;end if;
    end if;
    if v_edge.constraint_type='finish_to_finish' and v_edge.dependent_due < v_edge.prerequisite_due + v_edge.offset_days then
      if v_edge.offset_days=0 then raise exception 'Activity "%" finishes before prerequisite "%" finishes.',v_edge.dependent_name,v_edge.prerequisite_name;
      else raise exception 'Activity "%" finishes before prerequisite "%" finishes plus its offset.',v_edge.dependent_name,v_edge.prerequisite_name;end if;
    end if;
  end loop;
end; $$;

create or replace function public.save_activity(p_activity jsonb,p_owner_ids uuid[] default '{}',p_links jsonb default '[]',p_dependencies jsonb default '[]') returns uuid
language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_id uuid;v_project_id uuid;v_start_date date;v_project_start date;v_link jsonb;v_dependency jsonb;v_locked uuid[];
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if nullif(trim(p_activity->>'name'),'') is null then raise exception 'Activity name is required.'; end if;
  if (p_activity->>'due_date')::date < (p_activity->>'start_date')::date then raise exception 'Activity due date must be on or after its start date.'; end if;
  v_id:=coalesce(nullif(p_activity->>'id','')::uuid,gen_random_uuid());v_project_id:=(p_activity->>'project_id')::uuid;v_start_date:=(p_activity->>'start_date')::date;
  v_locked:=public.lock_activity_mutation_scope(v_id,v_project_id,p_dependencies);perform public.lock_project_schedule_rows(v_locked);
  select start_date into v_project_start from public.projects where id=v_project_id and archived_at is null;if not found then raise exception 'Project not found.';end if;
  if v_start_date<v_project_start then if not coalesce((p_activity->>'adjust_project_start')::boolean,false) then raise exception 'Activity start date (%) is earlier than the project start date (%).',v_start_date,v_project_start;end if;update public.projects set start_date=v_start_date where id=v_project_id;end if;
  if nullif(p_activity->>'id','') is null then
    insert into public.activities(id,project_id,activity_type_id,name,status,priority,start_date,due_date,notes,allow_outside_project,project_timing_rule,project_timing_boundary,project_timing_offset_days,created_by)
    values(v_id,v_project_id,nullif(p_activity->>'activity_type_id','')::uuid,trim(p_activity->>'name'),(p_activity->>'status')::public.activity_status,(p_activity->>'priority')::public.activity_priority,v_start_date,(p_activity->>'due_date')::date,coalesce(p_activity->>'notes',''),coalesce((p_activity->>'allow_outside_project')::boolean,false),nullif(p_activity->>'project_timing_rule',''),case when nullif(p_activity->>'project_timing_rule','') is null then null else nullif(p_activity->>'project_timing_boundary','') end,case when nullif(p_activity->>'project_timing_rule','') is null then null else nullif(p_activity->>'project_timing_offset_days','')::integer end,auth.uid());
  else
    update public.activities set project_id=v_project_id,activity_type_id=nullif(p_activity->>'activity_type_id','')::uuid,name=trim(p_activity->>'name'),status=(p_activity->>'status')::public.activity_status,priority=(p_activity->>'priority')::public.activity_priority,start_date=v_start_date,due_date=(p_activity->>'due_date')::date,notes=coalesce(p_activity->>'notes',''),allow_outside_project=coalesce((p_activity->>'allow_outside_project')::boolean,false),project_timing_rule=nullif(p_activity->>'project_timing_rule',''),project_timing_boundary=case when nullif(p_activity->>'project_timing_rule','') is null then null else nullif(p_activity->>'project_timing_boundary','') end,project_timing_offset_days=case when nullif(p_activity->>'project_timing_rule','') is null then null else nullif(p_activity->>'project_timing_offset_days','')::integer end where id=v_id and archived_at is null;
    if not found then raise exception 'Activity not found.';end if;
  end if;
  delete from public.activity_owners where activity_id=v_id;insert into public.activity_owners(activity_id,team_member_id) select v_id,owner_id from unnest(coalesce(p_owner_ids,'{}')) owner_id;
  update public.activity_links set archived_at=now() where activity_id=v_id and archived_at is null;
  for v_link in select value from jsonb_array_elements(coalesce(p_links,'[]')) loop
    if nullif(v_link->>'id','') is null then insert into public.activity_links(activity_id,label,url,sort_order) values(v_id,nullif(trim(v_link->>'label'),''),trim(v_link->>'url'),coalesce((v_link->>'sort_order')::integer,0));
    else update public.activity_links set label=nullif(trim(v_link->>'label'),''),url=trim(v_link->>'url'),sort_order=coalesce((v_link->>'sort_order')::integer,0),archived_at=null where id=(v_link->>'id')::uuid and activity_id=v_id;end if;
  end loop;
  update public.activity_dependencies set archived_at=now() where activity_id=v_id and archived_at is null;
  for v_dependency in select value from jsonb_array_elements(coalesce(p_dependencies,'[]')) loop
    if coalesce((v_dependency->>'offset_days')::integer,0)<0 then raise exception 'Activity dependency offsets cannot be negative.';end if;
    update public.activity_dependencies set constraint_type=(v_dependency->>'constraint_type')::public.dependency_type,offset_days=coalesce((v_dependency->>'offset_days')::integer,0),archived_at=null where activity_id=v_id and depends_on_activity_id=(v_dependency->>'depends_on_activity_id')::uuid;
    if not found then insert into public.activity_dependencies(activity_id,depends_on_activity_id,constraint_type,offset_days) values(v_id,(v_dependency->>'depends_on_activity_id')::uuid,(v_dependency->>'constraint_type')::public.dependency_type,coalesce((v_dependency->>'offset_days')::integer,0));end if;
  end loop;
  set constraints enforce_project_schedule_on_activity,enforce_project_schedule_on_project immediate;set constraints enforce_project_schedule_on_activity,enforce_project_schedule_on_project deferred;return v_id;
end; $$;

revoke execute on function public.validate_project_schedule(uuid) from public,anon,authenticated;
revoke execute on function public.save_activity(jsonb,uuid[],jsonb,jsonb) from public,anon;
grant execute on function public.save_activity(jsonb,uuid[],jsonb,jsonb) to authenticated;
