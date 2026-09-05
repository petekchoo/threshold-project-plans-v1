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
  archived_at?: string | null;
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
  allow_outside_project?: boolean;
  archived_at?: string | null;
  projects?: { id: string; name: string; start_date: string; end_date: string };
  activity_types?: TypeRow;
  activity_owners?: { team_members: Member }[];
  activity_links?: ActivityLink[];
  activity_dependencies?: Dependency[];
};

export type ProjectRescheduleMode = 'move_entire_schedule' | 'reschedule_remaining_work';
export type ProjectWindowChange = 'unchanged' | 'shift' | 'expand' | 'compress';
export type ProjectRescheduleActivityDisposition =
  | 'moved'
  | 'unchanged_active'
  | 'preserved_completed'
  | 'unchanged_archived';

export type ProjectRescheduleConflictCode =
  | 'DATE_INVALID'
  | 'PROJECT_COMPLETED'
  | 'PROJECT_DATE_ORDER'
  | 'PROJECT_START_CHANGE_WITH_COMPLETED_WORK'
  | 'ACTIVITY_DATE_ORDER'
  | 'ACTIVITY_BEFORE_PROJECT_START'
  | 'ADVANCE_DEADLINE_VIOLATION'
  | 'POST_PROJECT_WINDOW_VIOLATION'
  | 'OUTSIDE_PROJECT_UNAPPROVED'
  | 'OUTSIDE_PROJECT_EXCEPTION_STALE'
  | 'TIMING_RULE_INVALID'
  | 'DEPENDENCY_ENDPOINT_MISSING'
  | 'COMPLETED_DEPENDENT_INCOMPLETE_PREREQUISITE'
  | 'FINISH_TO_START_VIOLATION'
  | 'FINISH_TO_FINISH_VIOLATION';

export type ProjectRescheduleConflict = {
  code: ProjectRescheduleConflictCode;
  message: string;
  activity_id?: string;
  prerequisite_activity_id?: string;
  dependent_activity_id?: string;
  dependency_id?: string;
  project_id?: string;
  dependency_scope?: 'internal' | 'incoming' | 'outgoing';
  dependent_activity_name?: string;
  dependent_project_id?: string;
  prerequisite_activity_name?: string;
  prerequisite_project_id?: string;
  dates?: Record<string, string>;
  difference_days?: number;
};

export type ProjectRescheduleActivityChange = {
  activity_id: string;
  project_id: string;
  name: string;
  disposition: ProjectRescheduleActivityDisposition;
  original_start_date: string;
  original_due_date: string;
  proposed_start_date: string;
  proposed_due_date: string;
};

export type ProjectRescheduleActivity = Activity & { allow_outside_project: boolean };
export type ProjectRescheduleDependency = Dependency & { id: string; activity_id: string };

export type ProjectRescheduleInput = {
  project: Project;
  new_start_date: string;
  new_end_date: string;
  activities: ProjectRescheduleActivity[];
  dependencies: ProjectRescheduleDependency[];
};

export type ProjectReschedulePlan = {
  mode: ProjectRescheduleMode;
  end_delta_days: number;
  window_change: ProjectWindowChange;
  original_project_start_date: string;
  original_project_end_date: string;
  requested_project_start_date: string;
  requested_project_end_date: string;
  proposed_project_start_date: string;
  proposed_project_end_date: string;
  available_lead_in_days: number | null;
  earliest_containing_start_date: string | null;
  activity_changes: ProjectRescheduleActivityChange[];
  conflicts: ProjectRescheduleConflict[];
  can_confirm: boolean;
};

export type AuthoritativeProjectReschedulePlan = ProjectReschedulePlan & { schedule_fingerprint: string };

export type AppData = {
  projects: Project[];
  activities: Activity[];
  archivedProjects?: Project[];
  archivedActivities?: Activity[];
  members: Member[];
  projectTypes: TypeRow[];
  activityTypes: TypeRow[];
};
