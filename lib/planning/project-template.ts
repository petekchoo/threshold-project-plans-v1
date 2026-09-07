import { addDays } from './dates';
import type { ProjectTemplateActivityRule, TemplateScheduleRule } from './types';

export type TemplateScheduleActivity = {
  id: string;
  name: string;
  duration_days: number;
  rules: Pick<ProjectTemplateActivityRule, 'schedule_rule' | 'offset_days' | 'relative_activity_id'>[];
};

export type ResolvedTemplateActivity = TemplateScheduleActivity & { start_date: string; due_date: string };
export type TemplateSchedule = { project_start_date: string; project_end_date: string; activities: ResolvedTemplateActivity[] };

const activityRule = (rule: TemplateScheduleRule) =>
  rule === 'start_after_activity_finish' || rule === 'finish_after_activity_finish';

export function resolveTemplateSchedule(activities: TemplateScheduleActivity[], projectEndDate: string): TemplateSchedule {
  if (!activities.length) throw new Error('Add at least one activity before using this template.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(projectEndDate)) throw new Error('Enter a valid project end date.');
  const byId = new Map(activities.map((activity) => [activity.id, activity]));
  const latestFinish = new Map<string, number>();

  for (const activity of activities) {
    if (!Number.isInteger(activity.duration_days) || activity.duration_days < 1)
      throw new Error(`“${activity.name}” needs a duration of at least one day.`);
    for (const rule of activity.rules) {
      if (!Number.isInteger(rule.offset_days) || rule.offset_days < 0)
        throw new Error(`“${activity.name}” needs a non-negative whole-day offset.`);
      if (rule.schedule_rule === 'finish_after_project_end' && rule.offset_days < 1)
        throw new Error(`“${activity.name}” must finish at least one day after project end.`);
      if (activityRule(rule.schedule_rule)) {
        if (!rule.relative_activity_id || !byId.has(rule.relative_activity_id))
          throw new Error(`“${activity.name}” needs a referenced template activity.`);
        if (rule.relative_activity_id === activity.id) throw new Error(`“${activity.name}” cannot reference itself.`);
      } else if (rule.relative_activity_id) {
        throw new Error(`“${activity.name}” cannot reference another activity with its project-end rule.`);
      }
      if (rule.schedule_rule === 'finish_before_project_end')
        latestFinish.set(activity.id, Math.min(latestFinish.get(activity.id) ?? Infinity, -rule.offset_days));
      if (rule.schedule_rule === 'finish_after_project_end')
        latestFinish.set(activity.id, Math.min(latestFinish.get(activity.id) ?? Infinity, rule.offset_days));
    }
  }

  const edges = activities.flatMap((activity) => activity.rules
    .filter((rule) => activityRule(rule.schedule_rule))
    .map((rule) => ({ activity, rule, reference: byId.get(rule.relative_activity_id!)! })));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) throw new Error('The schedule contains a cycle.');
    if (visited.has(id)) return;
    visiting.add(id);
    for (const edge of edges) if (edge.activity.id === id) visit(edge.reference.id);
    visiting.delete(id);
    visited.add(id);
  };
  for (const activity of activities) visit(activity.id);
  for (let pass = 0; pass < activities.length; pass += 1) {
    let changed = false;
    for (const { activity, rule, reference } of edges) {
      const dependentLatest = latestFinish.get(activity.id);
      if (dependentLatest === undefined) continue;
      const bound = rule.schedule_rule === 'start_after_activity_finish'
        ? dependentLatest - (activity.duration_days - 1) - rule.offset_days
        : dependentLatest - rule.offset_days;
      if (bound < (latestFinish.get(reference.id) ?? Infinity)) {
        latestFinish.set(reference.id, bound);
        changed = true;
      }
    }
    if (!changed) break;
    if (pass === activities.length - 1) throw new Error('The schedule contains a cycle.');
  }

  // A branch may point at a prerequisite that was resolved backward from an
  // anchored chain without itself being an ancestor of that anchor. Place
  // those dependents at their earliest valid finish, then repeat so branches
  // of any depth resolve deterministically.
  for (let pass = 0; pass < activities.length; pass += 1) {
    let changed = false;
    for (const activity of activities) {
      if (Number.isFinite(latestFinish.get(activity.id))) continue;
      const relationshipRules = activity.rules.filter((rule) => activityRule(rule.schedule_rule));
      if (!relationshipRules.length) continue;
      const requiredFinishes = relationshipRules.map((rule) => {
        const referenceDue = latestFinish.get(rule.relative_activity_id!);
        if (!Number.isFinite(referenceDue)) return undefined;
        return rule.schedule_rule === 'start_after_activity_finish'
          ? referenceDue! + rule.offset_days + (activity.duration_days - 1)
          : referenceDue! + rule.offset_days;
      });
      if (requiredFinishes.some((bound) => bound === undefined)) continue;
      latestFinish.set(activity.id, Math.max(...requiredFinishes as number[]));
      changed = true;
    }
    if (!changed) break;
  }
  const unbounded = activities.find((activity) => !Number.isFinite(latestFinish.get(activity.id)));
  if (unbounded) throw new Error(`“${unbounded.name}” does not trace to a project-end rule.`);

  for (const { activity, rule, reference } of edges) {
    const due = latestFinish.get(activity.id)!;
    const start = due - (activity.duration_days - 1);
    const referenceDue = latestFinish.get(reference.id)!;
    const valid = rule.schedule_rule === 'start_after_activity_finish'
      ? start >= referenceDue + rule.offset_days
      : due >= referenceDue + rule.offset_days;
    if (!valid) throw new Error(`“${activity.name}” has schedule rules that cannot coexist.`);
  }
  for (const activity of activities) for (const rule of activity.rules) {
    if (rule.schedule_rule === 'finish_after_project_end' && latestFinish.get(activity.id)! <= 0)
      throw new Error(`“${activity.name}” has schedule rules that cannot coexist.`);
  }

  const resolvedActivities = activities.map((activity) => {
    const due_date = addDays(projectEndDate, latestFinish.get(activity.id)!);
    return { ...activity, due_date, start_date: addDays(due_date, -(activity.duration_days - 1)) };
  });
  const earliestStart = resolvedActivities.reduce(
    (earliest, activity) => activity.start_date < earliest ? activity.start_date : earliest,
    projectEndDate,
  );
  return { project_start_date: earliestStart, project_end_date: projectEndDate, activities: resolvedActivities };
}
