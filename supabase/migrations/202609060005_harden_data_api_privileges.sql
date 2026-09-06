revoke all privileges on table
  public.profiles,
  public.team_members,
  public.project_types,
  public.activity_types,
  public.projects,
  public.project_owners,
  public.activities,
  public.activity_owners,
  public.activity_links,
  public.activity_dependencies,
  public.project_templates,
  public.project_template_activities,
  public.project_template_activity_rules
from anon;

revoke insert, update, delete on table
  public.projects,
  public.project_owners,
  public.activities,
  public.activity_owners,
  public.activity_links,
  public.activity_dependencies,
  public.project_templates,
  public.project_template_activities,
  public.project_template_activity_rules
from authenticated;

revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.save_project(jsonb, uuid[]) to authenticated;
grant execute on function public.save_activity(jsonb, uuid[], jsonb, jsonb) to authenticated;
grant execute on function public.archive_activity(uuid) to authenticated;
grant execute on function public.archive_project(uuid) to authenticated;
grant execute on function public.preview_project_reschedule(uuid, date, date) to authenticated;
grant execute on function public.reschedule_project(jsonb, uuid[], text) to authenticated;
grant execute on function public.save_project_template(jsonb) to authenticated;
grant execute on function public.save_project_template_activity(jsonb) to authenticated;
grant execute on function public.preview_project_template(uuid, date) to authenticated;
grant execute on function public.create_project_from_template(uuid, text, date) to authenticated;
grant execute on function public.archive_project_template(uuid) to authenticated;
grant execute on function public.archive_project_template_activity(uuid) to authenticated;

grant execute on all functions in schema public to service_role;

alter default privileges for role postgres in schema public
  revoke all privileges on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all privileges on sequences from anon, authenticated, service_role;
