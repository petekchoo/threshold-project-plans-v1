create table public.project_template_activity_rules (
  id uuid primary key default gen_random_uuid(),
  template_activity_id uuid not null references public.project_template_activities(id) on delete cascade,
  schedule_rule public.template_schedule_rule not null,
  offset_days integer not null check (offset_days >= 0),
  relative_activity_id uuid references public.project_template_activities(id),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint template_activity_rule_not_self check (template_activity_id <> relative_activity_id),
  constraint template_activity_rule_shape check (
    (schedule_rule in ('finish_before_project_end', 'finish_after_project_end') and relative_activity_id is null)
    or (schedule_rule in ('start_after_activity_finish', 'finish_after_activity_finish') and relative_activity_id is not null)
  ),
  constraint template_activity_rule_after_project_offset check (schedule_rule <> 'finish_after_project_end' or offset_days >= 1)
);

create index project_template_activity_rules_activity_idx on public.project_template_activity_rules(template_activity_id, sort_order);
create unique index project_template_activity_rules_reference_unique
  on public.project_template_activity_rules(template_activity_id, relative_activity_id)
  where relative_activity_id is not null;

insert into public.project_template_activity_rules(template_activity_id, schedule_rule, offset_days, relative_activity_id)
select id, schedule_rule, offset_days, relative_activity_id from public.project_template_activities;

alter table public.project_template_activities drop constraint project_template_activities_duration_days_check;
update public.project_template_activities set duration_days = duration_days + 1;
alter table public.project_template_activities alter column duration_days set default 1;
alter table public.project_template_activities add constraint project_template_activities_duration_days_check check (duration_days >= 1);
drop trigger validate_template_activity_reference on public.project_template_activities;
drop function public.validate_template_activity_reference();
alter table public.project_template_activities drop constraint template_activity_not_self;
alter table public.project_template_activities drop constraint template_activity_rule_shape;
alter table public.project_template_activities drop constraint template_activity_after_project_offset;
alter table public.project_template_activities drop column schedule_rule, drop column offset_days, drop column relative_activity_id;

create trigger project_template_activity_rules_updated before update on public.project_template_activity_rules
for each row execute function public.set_updated_at();

create or replace function public.validate_template_activity_rule_reference() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
declare v_template_id uuid; v_reference_template_id uuid;
begin
  select template_id into v_template_id from public.project_template_activities where id = new.template_activity_id and archived_at is null;
  if v_template_id is null then raise exception 'Template activity not found.'; end if;
  if new.relative_activity_id is not null then
    select template_id into v_reference_template_id from public.project_template_activities where id = new.relative_activity_id and archived_at is null;
    if v_reference_template_id is null or v_reference_template_id <> v_template_id then
      raise exception 'The referenced activity must be an active activity in this template.';
    end if;
  end if;
  return new;
end;
$$;
create trigger validate_template_activity_rule_reference before insert or update on public.project_template_activity_rules
for each row execute function public.validate_template_activity_rule_reference();

alter table public.project_template_activity_rules enable row level security;
create policy "authenticated shared access" on public.project_template_activity_rules for select to authenticated using (true);

create or replace function public.save_project_template_activity(p_activity jsonb) returns uuid
language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_id uuid; v_template_id uuid; v_type_id uuid; v_rule jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if nullif(trim(p_activity->>'name'), '') is null then raise exception 'Activity name is required.'; end if;
  if coalesce((p_activity->>'duration_days')::integer, 0) < 1 then raise exception 'Duration must be at least one day.'; end if;
  v_template_id := (p_activity->>'template_id')::uuid;
  v_type_id := (p_activity->>'activity_type_id')::uuid;
  if not exists(select 1 from public.project_templates where id=v_template_id and archived_at is null) then raise exception 'Template not found.'; end if;
  if not exists(select 1 from public.activity_types where id=v_type_id and archived_at is null) then raise exception 'Choose an active activity type.'; end if;
  v_id := coalesce(nullif(p_activity->>'id','')::uuid, gen_random_uuid());
  insert into public.project_template_activities(id,template_id,activity_type_id,name,duration_days,sort_order)
  values(v_id,v_template_id,v_type_id,trim(p_activity->>'name'),(p_activity->>'duration_days')::integer,coalesce((p_activity->>'sort_order')::integer,0))
  on conflict(id) do update set activity_type_id=excluded.activity_type_id,name=excluded.name,duration_days=excluded.duration_days,sort_order=excluded.sort_order
  where project_template_activities.template_id=excluded.template_id and project_template_activities.archived_at is null;
  if not found then raise exception 'Template activity not found.'; end if;
  delete from public.project_template_activity_rules where template_activity_id=v_id;
  for v_rule in select value from jsonb_array_elements(coalesce(p_activity->'rules','[]'::jsonb)) loop
    insert into public.project_template_activity_rules(id,template_activity_id,schedule_rule,offset_days,relative_activity_id,sort_order)
    values(coalesce(nullif(v_rule->>'id','')::uuid,gen_random_uuid()),v_id,(v_rule->>'schedule_rule')::public.template_schedule_rule,
      (v_rule->>'offset_days')::integer,nullif(v_rule->>'relative_activity_id','')::uuid,coalesce((v_rule->>'sort_order')::integer,0));
  end loop;
  return v_id;
end;
$$;

create or replace function public.preview_project_template(p_template_id uuid, p_project_end date) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare v_template public.project_templates%rowtype; v_total integer; v_changed integer; v_pass integer:=0; v_bad text; v_resolved jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if p_project_end is null then raise exception 'Project end date is required.'; end if;
  select * into v_template from public.project_templates where id=p_template_id and archived_at is null;
  if not found then raise exception 'Template not found.'; end if;
  if not exists(select 1 from public.project_types where id=v_template.project_type_id and archived_at is null) then raise exception 'The template project type is unavailable.'; end if;
  drop table if exists pg_temp.tpl_resolution;
  create temporary table tpl_resolution(id uuid primary key,name text,activity_type_id uuid,duration_days integer,sort_order integer,latest_due integer) on commit drop;
  insert into tpl_resolution(id,name,activity_type_id,duration_days,sort_order)
  select a.id,a.name,a.activity_type_id,a.duration_days,a.sort_order from public.project_template_activities a
  join public.activity_types t on t.id=a.activity_type_id and t.archived_at is null where a.template_id=p_template_id and a.archived_at is null;
  get diagnostics v_total=row_count;
  if v_total=0 then raise exception 'Add at least one activity before using this template.'; end if;
  if v_total<>(select count(*) from public.project_template_activities where template_id=p_template_id and archived_at is null) then raise exception 'One or more template activities use an unavailable activity type.'; end if;
  if exists(select 1 from public.project_template_activity_rules r join tpl_resolution dep on dep.id=r.template_activity_id left join tpl_resolution ref on ref.id=r.relative_activity_id where r.relative_activity_id is not null and ref.id is null) then raise exception 'A schedule rule references an unavailable template activity.'; end if;
  select name into v_bad from tpl_resolution a where duration_days<1 or not exists(select 1 from public.project_template_activity_rules r where r.template_activity_id=a.id) limit 1;
  if v_bad is not null then raise exception '“%” needs a positive duration and at least one schedule rule.',v_bad; end if;
  if exists(with recursive walk(origin,id,path,cycle) as (
    select a.id,a.id,array[a.id],false from tpl_resolution a union all
    select w.origin,r.relative_activity_id,w.path||r.relative_activity_id,r.relative_activity_id=any(w.path)
    from walk w join public.project_template_activity_rules r on r.template_activity_id=w.id and r.relative_activity_id is not null where not w.cycle
  ) select 1 from walk where cycle) then raise exception 'The schedule contains a cycle.'; end if;
  update tpl_resolution a set latest_due=q.bound from (
    select template_activity_id,min(case when schedule_rule='finish_before_project_end' then -offset_days else offset_days end) bound
    from public.project_template_activity_rules where relative_activity_id is null group by template_activity_id
  ) q where q.template_activity_id=a.id;
  loop
    with bounds as (
      select ref.id,min(case when r.schedule_rule='start_after_activity_finish' then dep.latest_due-(dep.duration_days-1)-r.offset_days else dep.latest_due-r.offset_days end) bound
      from public.project_template_activity_rules r join tpl_resolution dep on dep.id=r.template_activity_id join tpl_resolution ref on ref.id=r.relative_activity_id
      where dep.latest_due is not null group by ref.id
    ) update tpl_resolution ref set latest_due=least(coalesce(ref.latest_due,b.bound),b.bound) from bounds b where ref.id=b.id and (ref.latest_due is null or b.bound<ref.latest_due);
    get diagnostics v_changed=row_count; v_pass:=v_pass+1; exit when v_changed=0;
    if v_pass>v_total then raise exception 'The schedule contains a cycle.'; end if;
  end loop;
  select name into v_bad from tpl_resolution where latest_due is null limit 1;
  if v_bad is not null then raise exception '“%” does not trace to a project-end rule.',v_bad; end if;
  select dep.name into v_bad from public.project_template_activity_rules r join tpl_resolution dep on dep.id=r.template_activity_id join tpl_resolution ref on ref.id=r.relative_activity_id
  where (r.schedule_rule='start_after_activity_finish' and dep.latest_due-(dep.duration_days-1)<ref.latest_due+r.offset_days)
     or (r.schedule_rule='finish_after_activity_finish' and dep.latest_due<ref.latest_due+r.offset_days) limit 1;
  if v_bad is not null then raise exception '“%” has schedule rules that cannot coexist.',v_bad; end if;
  select a.name into v_bad from tpl_resolution a join public.project_template_activity_rules r on r.template_activity_id=a.id
  where r.schedule_rule='finish_after_project_end' and a.latest_due<=0 limit 1;
  if v_bad is not null then raise exception '“%” has schedule rules that cannot coexist.',v_bad; end if;
  select jsonb_agg(jsonb_build_object('template_activity_id',a.id,'name',a.name,'activity_type_id',a.activity_type_id,'duration_days',a.duration_days,
    'start_date',p_project_end+a.latest_due-(a.duration_days-1),'due_date',p_project_end+a.latest_due,'sort_order',a.sort_order,
    'rules',(select jsonb_agg(to_jsonb(r) order by r.sort_order) from public.project_template_activity_rules r where r.template_activity_id=a.id)) order by a.sort_order,a.id)
  into v_resolved from tpl_resolution a;
  return jsonb_build_object('template_id',v_template.id,'template_name',v_template.name,'project_type_id',v_template.project_type_id,
    'project_start_date',least(p_project_end,(select min(p_project_end+latest_due-(duration_days-1)) from tpl_resolution)),'project_end_date',p_project_end,'activities',v_resolved);
end;
$$;

create or replace function public.create_project_from_template(p_template_id uuid,p_project_name text,p_project_end date) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_plan jsonb;v_project_id uuid:=gen_random_uuid();v_item jsonb;v_rule jsonb;v_activity_id uuid;v_ids jsonb:='{}'::jsonb;v_project_rule jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication is required.'; end if;
  if nullif(trim(p_project_name),'') is null then raise exception 'Project name is required.'; end if;
  v_plan:=public.preview_project_template(p_template_id,p_project_end);
  insert into public.projects(id,name,description,project_type_id,status,start_date,end_date,created_by)
  values(v_project_id,trim(p_project_name),'',(v_plan->>'project_type_id')::uuid,'draft',(v_plan->>'project_start_date')::date,p_project_end,auth.uid());
  for v_item in select value from jsonb_array_elements(v_plan->'activities') order by (value->>'sort_order')::integer loop
    v_activity_id:=gen_random_uuid();v_ids:=v_ids||jsonb_build_object(v_item->>'template_activity_id',v_activity_id);
    select value into v_project_rule from jsonb_array_elements(v_item->'rules') where value->>'relative_activity_id' is null
    order by case when value->>'schedule_rule'='finish_before_project_end' then -(value->>'offset_days')::integer else (value->>'offset_days')::integer end limit 1;
    insert into public.activities(id,project_id,activity_type_id,name,status,priority,start_date,due_date,notes,allow_outside_project,project_timing_rule,project_timing_boundary,project_timing_offset_days,created_by)
    values(v_activity_id,v_project_id,(v_item->>'activity_type_id')::uuid,v_item->>'name','not_started','normal',(v_item->>'start_date')::date,(v_item->>'due_date')::date,'',
      (v_item->>'due_date')::date>p_project_end,case when v_project_rule->>'schedule_rule'='finish_before_project_end' then 'advance_deadline' when v_project_rule->>'schedule_rule'='finish_after_project_end' then 'post_project_deadline' end,
      case when v_project_rule is not null then 'end' end,case when v_project_rule is not null then (v_project_rule->>'offset_days')::integer end,auth.uid());
  end loop;
  for v_item in select value from jsonb_array_elements(v_plan->'activities') loop
    for v_rule in select value from jsonb_array_elements(v_item->'rules') where value->>'relative_activity_id' is not null loop
      insert into public.activity_dependencies(activity_id,depends_on_activity_id,constraint_type) values((v_ids->>(v_item->>'template_activity_id'))::uuid,(v_ids->>(v_rule->>'relative_activity_id'))::uuid,
        case when v_rule->>'schedule_rule'='start_after_activity_finish' then 'finish_to_start'::public.dependency_type else 'finish_to_finish'::public.dependency_type end);
    end loop;
  end loop;
  set constraints enforce_project_schedule_on_activity,enforce_project_schedule_on_project immediate;
  set constraints enforce_project_schedule_on_activity,enforce_project_schedule_on_project deferred;
  return v_project_id;
end;
$$;

revoke all on table public.project_template_activity_rules from anon;
revoke insert,update,delete on table public.project_template_activity_rules from authenticated;
grant select on table public.project_template_activity_rules to authenticated;
