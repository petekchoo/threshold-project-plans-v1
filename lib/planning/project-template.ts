import { addDays } from './dates';

export type TemplateScheduleRule =
  | 'finish_before_project_end'
  | 'finish_after_project_end'
  | 'start_after_activity_finish'
  | 'finish_after_activity_finish';

export type TemplateScheduleActivity = {
  id: string;
  name: string;
  schedule_rule: TemplateScheduleRule;
  offset_days: number;
  duration_days: number;
  relative_activity_id?: string | null;
};

export type ResolvedTemplateActivity = TemplateScheduleActivity & {
  start_date: string;
  due_date: string;
};

export type TemplateSchedule = {
  project_start_date: string;
  project_end_date: string;
  activities: ResolvedTemplateActivity[];
};

const activityRule = (rule: TemplateScheduleRule) =>
  rule === 'start_after_activity_finish' || rule === 'finish_after_activity_finish';

export function resolveTemplateSchedule(
  activities: TemplateScheduleActivity[],
  projectEndDate: string,
): TemplateSchedule {
  if (!activities.length) throw new Error('Add at least one activity before using this template.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(projectEndDate)) throw new Error('Enter a valid project end date.');

  const byId = new Map(activities.map((activity) => [activity.id, activity]));
  const resolved = new Map<string, ResolvedTemplateActivity>();
  const visiting = new Set<string>();

  const visit = (id: string): ResolvedTemplateActivity => {
    const existing = resolved.get(id);
    if (existing) return existing;
    const activity = byId.get(id);
    if (!activity) throw new Error('A template activity reference is missing.');
    if (visiting.has(id)) throw new Error(`The schedule contains a cycle involving “${activity.name}”.`);
    if (!Number.isInteger(activity.offset_days) || activity.offset_days < 0)
      throw new Error(`“${activity.name}” needs a non-negative whole-day offset.`);
    if (!Number.isInteger(activity.duration_days) || activity.duration_days < 0)
      throw new Error(`“${activity.name}” needs a non-negative whole-day duration.`);
    if (activity.schedule_rule === 'finish_after_project_end' && activity.offset_days < 1)
      throw new Error(`“${activity.name}” must finish at least one day after project end.`);

    visiting.add(id);
    let startDate: string;
    let dueDate: string;

    if (activityRule(activity.schedule_rule)) {
      if (!activity.relative_activity_id)
        throw new Error(`“${activity.name}” needs a referenced template activity.`);
      if (activity.relative_activity_id === id)
        throw new Error(`“${activity.name}” cannot reference itself.`);
      const reference = visit(activity.relative_activity_id);
      if (activity.schedule_rule === 'start_after_activity_finish') {
        startDate = addDays(reference.due_date, activity.offset_days);
        dueDate = addDays(startDate, activity.duration_days);
      } else {
        dueDate = addDays(reference.due_date, activity.offset_days);
        startDate = addDays(dueDate, -activity.duration_days);
      }
    } else {
      if (activity.relative_activity_id)
        throw new Error(`“${activity.name}” cannot reference another activity with its project-end rule.`);
      dueDate = addDays(
        projectEndDate,
        activity.schedule_rule === 'finish_before_project_end'
          ? -activity.offset_days
          : activity.offset_days,
      );
      startDate = addDays(dueDate, -activity.duration_days);
    }

    visiting.delete(id);
    const result = { ...activity, start_date: startDate, due_date: dueDate };
    resolved.set(id, result);
    return result;
  };

  const resolvedActivities = activities.map((activity) => visit(activity.id));
  const earliestStart = resolvedActivities.reduce(
    (earliest, activity) => (activity.start_date < earliest ? activity.start_date : earliest),
    projectEndDate,
  );

  return {
    project_start_date: earliestStart,
    project_end_date: projectEndDate,
    activities: resolvedActivities,
  };
}

