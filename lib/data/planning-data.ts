import { supabase } from '../supabase';
import type { Activity, AppData, Dependency, Project, ProjectTemplate, ProjectTemplateActivity, ProjectTemplateActivityRule } from '../planning/types';

export async function loadData(): Promise<AppData> {
  const [p, a, m, pt, at, d, templates, templateActivities, templateRules] = await Promise.all([
    supabase.from('projects').select('*,project_types(*),project_owners(team_members(*))').order('start_date'),
    supabase
      .from('activities')
      .select('*,projects(id,name,start_date,end_date),activity_types(*),activity_owners(team_members(*)),activity_links(*)')
      .order('due_date'),
    supabase.from('team_members').select('*').is('archived_at', null).order('full_name'),
    supabase.from('project_types').select('*').is('archived_at', null).order('name'),
    supabase.from('activity_types').select('*').is('archived_at', null).order('name'),
    supabase.from('activity_dependencies').select('*').is('archived_at', null),
    supabase.from('project_templates').select('*,project_types(*)').order('name'),
    supabase.from('project_template_activities').select('*,activity_types(*)').order('sort_order'),
    supabase.from('project_template_activity_rules').select('*').order('sort_order'),
  ]);

  if (p.error || a.error || m.error || pt.error || at.error || d.error || templates.error || templateActivities.error || templateRules.error) {
    throw p.error || a.error || m.error || pt.error || at.error || d.error || templates.error || templateActivities.error || templateRules.error;
  }

  const dependencies = (d.data || []) as Dependency[];
  const allActivities = ((a.data || []) as Activity[]).map((activity) => ({
    ...activity,
    activity_links: (activity.activity_links || []).filter((link) => !link.archived_at),
    activity_dependencies: dependencies.filter((dependency) => dependency.activity_id === activity.id),
  }));
  const allProjects = (p.data || []) as Project[];
  const allTemplateRules = (templateRules.data || []) as ProjectTemplateActivityRule[];
  const allTemplateActivities = ((templateActivities.data || []) as Omit<ProjectTemplateActivity, 'rules'>[]).map((activity) => ({
    ...activity,
    rules: allTemplateRules.filter((rule) => rule.template_activity_id === activity.id),
  }));
  const allTemplates = ((templates.data || []) as Omit<ProjectTemplate, 'activities'>[]).map((template) => ({
    ...template,
    activities: allTemplateActivities.filter((activity) => activity.template_id === template.id && !activity.archived_at),
  }));

  return {
    projects: allProjects.filter((project) => !project.archived_at),
    archivedProjects: allProjects.filter((project) => project.archived_at),
    activities: allActivities.filter((activity) => !activity.archived_at),
    archivedActivities: allActivities.filter((activity) => activity.archived_at),
    members: (m.data || []) as AppData['members'],
    projectTypes: (pt.data || []) as AppData['projectTypes'],
    activityTypes: (at.data || []) as AppData['activityTypes'],
    templates: allTemplates.filter((template) => !template.archived_at),
    archivedTemplates: allTemplates.filter((template) => template.archived_at),
  };
}
