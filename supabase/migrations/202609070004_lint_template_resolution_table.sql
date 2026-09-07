create or replace function public.preview_project_template(p_template_id uuid, p_project_end date) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare v_template public.project_templates%rowtype; v_total integer; v_changed integer; v_pass integer:=0; v_bad text; v_resolved jsonb;
begin
  perform 'PRAGMA:TABLE: tpl_resolution (id uuid, name text, activity_type_id uuid, duration_days integer, sort_order integer, latest_due integer)';
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
  select name into v_bad from tpl_resolution where duration_days<1 limit 1;
  if v_bad is not null then raise exception '“%” needs a positive duration.',v_bad; end if;
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
  v_pass:=0;
  loop
    with bounds as (
      select dep.id,max(case when r.schedule_rule='start_after_activity_finish' then ref.latest_due+r.offset_days+(dep.duration_days-1) else ref.latest_due+r.offset_days end) bound
      from tpl_resolution dep join public.project_template_activity_rules r on r.template_activity_id=dep.id and r.relative_activity_id is not null
      join tpl_resolution ref on ref.id=r.relative_activity_id where dep.latest_due is null
      group by dep.id having count(*)=count(ref.latest_due)
    ) update tpl_resolution dep set latest_due=b.bound from bounds b where dep.id=b.id and dep.latest_due is null;
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
    'rules',coalesce((select jsonb_agg(to_jsonb(r) order by r.sort_order) from public.project_template_activity_rules r where r.template_activity_id=a.id),'[]'::jsonb)) order by a.sort_order,a.id)
  into v_resolved from tpl_resolution a;
  return jsonb_build_object('template_id',v_template.id,'template_name',v_template.name,'project_type_id',v_template.project_type_id,
    'project_start_date',least(p_project_end,(select min(p_project_end+latest_due-(duration_days-1)) from tpl_resolution)),'project_end_date',p_project_end,'activities',v_resolved);
end;
$$;

revoke execute on function public.preview_project_template(uuid,date) from public,anon;
grant execute on function public.preview_project_template(uuid,date) to authenticated;
