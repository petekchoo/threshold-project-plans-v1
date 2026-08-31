export type Kind = 'overview' | 'projects' | 'activities' | 'administration' | 'project' | 'activity';

export type Member = {
  id: string;
  full_name: string;
  initials: string;
  email?: string;
  active: boolean;
  archived_at?: string | null;
};

export type TypeRow = {
  id: string;
  name: string;
  color: string;
  archived_at?: string | null;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  status: string;
  start_date: string;
  end_date: string;
  project_type_id?: string;
  archived_at?: string | null;
  project_types?: TypeRow;
  project_owners?: { team_members: Member }[];
  activities?: Activity[];
};

export type Dependency = {
  id?: string;
  activity_id?: string;
  depends_on_activity_id: string;
  constraint_type: 'finish_to_start' | 'finish_to_finish';
  archived_at?: string | null;
};

export type ActivityLink = {
  id?: string;
  label: string;
  url: string;
  sort_order?: number;
};

export type ProjectTimingRule = 'advance_deadline' | 'post_project_deadline';
export type ProjectBoundary = 'start' | 'end';

export type Activity = {
  id: string;
  name: string;
  status: string;
  priority: string;
  start_date: string;
  due_date: string;
  notes: string;
  project_id: string;
  activity_type_id?: string;
  project_timing_rule?: ProjectTimingRule | null;
  project_timing_boundary?: ProjectBoundary | null;
  project_timing_offset_days?: number | null;
  archived_at?: string | null;
  projects?: { id: string; name: string; start_date: string; end_date: string };
  activity_types?: TypeRow;
  activity_owners?: { team_members: Member }[];
  activity_links?: ActivityLink[];
  activity_dependencies?: Dependency[];
};

export type AppData = {
  projects: Project[];
  activities: Activity[];
  archivedProjects?: Project[];
  archivedActivities?: Activity[];
  members: Member[];
  projectTypes: TypeRow[];
  activityTypes: TypeRow[];
};
