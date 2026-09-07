create or replace function public.project_schedule_fingerprint(p_project_id uuid) returns text
language sql security definer set search_path = pg_catalog, public as $$
  with target_activities as (select a.* from public.activities a where a.project_id=p_project_id and a.archived_at is null),
  relevant_edges as (select d.* from public.activity_dependencies d where d.archived_at is null and (d.activity_id in(select id from target_activities) or d.depends_on_activity_id in(select id from target_activities))),
  external_endpoints as (select distinct a.* from public.activities a where a.archived_at is null and a.project_id<>p_project_id and a.id in(select activity_id from relevant_edges union select depends_on_activity_id from relevant_edges))
  select encode(extensions.digest(jsonb_build_object(
    'project',(select jsonb_build_object('id',p.id,'name',p.name,'description',p.description,'project_type_id',p.project_type_id,'status',p.status,'start_date',p.start_date,'end_date',p.end_date,'archived_at',p.archived_at) from public.projects p where p.id=p_project_id),
    'owners',coalesce((select jsonb_agg(po.team_member_id order by po.team_member_id) from public.project_owners po where po.project_id=p_project_id),'[]'::jsonb),
    'activities',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'project_id',a.project_id,'name',a.name,'status',a.status,'start_date',a.start_date,'due_date',a.due_date,'project_timing_rule',a.project_timing_rule,'project_timing_boundary',a.project_timing_boundary,'project_timing_offset_days',a.project_timing_offset_days,'allow_outside_project',a.allow_outside_project,'archived_at',a.archived_at) order by a.id) from target_activities a),'[]'::jsonb),
    'dependencies',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'activity_id',d.activity_id,'depends_on_activity_id',d.depends_on_activity_id,'constraint_type',d.constraint_type,'offset_days',d.offset_days,'archived_at',d.archived_at) order by d.id) from relevant_edges d),'[]'::jsonb),
    'external_endpoints',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'project_id',a.project_id,'name',a.name,'status',a.status,'start_date',a.start_date,'due_date',a.due_date,'archived_at',a.archived_at) order by a.id) from external_endpoints a),'[]'::jsonb)
  )::text,'sha256'),'hex');
$$;
revoke execute on function public.project_schedule_fingerprint(uuid) from public,anon,authenticated;
