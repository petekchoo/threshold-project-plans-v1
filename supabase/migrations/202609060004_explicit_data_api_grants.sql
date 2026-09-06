grant select on table
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
to authenticated;

grant insert, update, delete on table
  public.profiles,
  public.team_members,
  public.project_types,
  public.activity_types
to authenticated;

grant select, insert, update, delete on table
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
to service_role;
