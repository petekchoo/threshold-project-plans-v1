import { addDays, date, dayDifference } from './dates';
import type { Activity, Dependency, Project, ProjectTimingRule } from './types';

export type ActivityScheduleBounds = {
  earliest_start_date?: string | null;
  earliest_due_date?: string | null;
  latest_due_date?: string | null;
};

export type ActivitySchedulePlacement = {
  start_date: string;
  due_date: string;
  shift_days: number;
};

export type ActivityScheduleConstraint = {
  kind: 'earliest_start' | 'earliest_due' | 'latest_due';
  date: string;
  label: string;
};

export type ActivityScheduleEvaluation =
  | { status: 'valid' | 'adjusted'; placement: ActivitySchedulePlacement; constraints: ActivityScheduleConstraint[] }
  | { status: 'conflict'; message: string; constraints: ActivityScheduleConstraint[] };

export type EvaluateActivityScheduleInput = {
  activityId?: string;
  activityName: string;
  startDate: string;
  dueDate: string;
  project: Project;
  timingRule: ProjectTimingRule | null;
  timingOffsetDays: number | null;
  dependencies: Dependency[];
  activities: Activity[];
};

/** Places a dated activity as close as possible to its current dates while preserving duration. */
export function placeDatedActivity(
  startDate: string,
  dueDate: string,
  bounds: ActivityScheduleBounds,
): ActivitySchedulePlacement {
  if (dueDate < startDate) throw new Error('The activity due date must be on or after its start date.');

  const minimumShift = Math.max(
    bounds.earliest_start_date ? dayDifference(startDate, bounds.earliest_start_date) : -Infinity,
    bounds.earliest_due_date ? dayDifference(dueDate, bounds.earliest_due_date) : -Infinity,
  );
  const maximumShift = bounds.latest_due_date
    ? dayDifference(dueDate, bounds.latest_due_date)
    : Infinity;

  if (minimumShift > maximumShift) throw new Error('The schedule rules do not have a valid shared placement.');

  const shiftDays = minimumShift > 0 ? minimumShift : maximumShift < 0 ? maximumShift : 0;
  return {
    start_date: addDays(startDate, shiftDays),
    due_date: addDays(dueDate, shiftDays),
    shift_days: shiftDays,
  };
}

const latest = (constraints: ActivityScheduleConstraint[], kind: ActivityScheduleConstraint['kind']) =>
  constraints.filter((constraint) => constraint.kind === kind).sort((left, right) => right.date.localeCompare(left.date))[0];
const earliest = (constraints: ActivityScheduleConstraint[], kind: ActivityScheduleConstraint['kind']) =>
  constraints.filter((constraint) => constraint.kind === kind).sort((left, right) => left.date.localeCompare(right.date))[0];

export function evaluateActivitySchedule(input: EvaluateActivityScheduleInput): ActivityScheduleEvaluation {
  const constraints: ActivityScheduleConstraint[] = [];
  const activeActivities = input.activities.filter((activity) => !activity.archived_at);

  if (input.activityId) {
    const byId = new Map(activeActivities.map((activity) => [activity.id, activity]));
    const reachesCurrent = (id: string, visited = new Set<string>()): boolean => {
      if (id === input.activityId) return true;
      if (visited.has(id)) return false;
      visited.add(id);
      return (byId.get(id)?.activity_dependencies || []).some(
        (dependency) => !dependency.archived_at && reachesCurrent(dependency.depends_on_activity_id, visited),
      );
    };
    const circular = input.dependencies.find((dependency) => reachesCurrent(dependency.depends_on_activity_id));
    if (circular) {
      const prerequisite = byId.get(circular.depends_on_activity_id);
      return { status: 'conflict', constraints, message: `“${prerequisite?.name || 'This activity'}” already depends on “${input.activityName}”. Adding this rule would create a circular schedule.` };
    }
  }

  for (const dependency of input.dependencies.filter((item) => !item.archived_at)) {
    const offset = dependency.offset_days ?? 0;
    if (!Number.isInteger(offset) || offset < 0) return { status: 'conflict', constraints, message: 'Enter a valid whole-day activity offset.' };
    const prerequisite = activeActivities.find((activity) => activity.id === dependency.depends_on_activity_id);
    if (!prerequisite) return { status: 'conflict', constraints, message: 'The selected prerequisite is no longer available.' };
    constraints.push({
      kind: dependency.constraint_type === 'finish_to_start' ? 'earliest_start' : 'earliest_due',
      date: addDays(prerequisite.due_date, offset),
      label: `${prerequisite.name} finishes on ${date(prerequisite.due_date)} with a ${offset}-day offset`,
    });
  }

  if (input.activityId) for (const dependent of activeActivities) {
    const incoming = (dependent.activity_dependencies || []).filter(
      (dependency) => !dependency.archived_at && dependency.depends_on_activity_id === input.activityId,
    );
    for (const dependency of incoming) constraints.push({
      kind: 'latest_due',
      date: addDays(dependency.constraint_type === 'finish_to_start' ? dependent.start_date : dependent.due_date, -(dependency.offset_days ?? 0)),
      label: `${dependent.name} is fixed at ${date(dependency.constraint_type === 'finish_to_start' ? dependent.start_date : dependent.due_date)}`,
    });
  }

  if (input.timingRule) {
    const offset = input.timingOffsetDays;
    if (!Number.isInteger(offset) || offset == null || offset < (input.timingRule === 'post_project_deadline' ? 1 : 0)) {
      return { status: 'conflict', constraints, message: 'Enter a valid whole-day project timing offset.' };
    }
    if (input.timingRule === 'advance_deadline') constraints.push({
      kind: 'latest_due', date: addDays(input.project.end_date, -offset),
      label: `${offset} calendar day${offset === 1 ? '' : 's'} before ${input.project.name} ends`,
    });
    else constraints.push(
      { kind: 'earliest_due', date: addDays(input.project.end_date, 1), label: `the day after ${input.project.name} ends` },
      { kind: 'latest_due', date: addDays(input.project.end_date, offset), label: `${offset} calendar day${offset === 1 ? '' : 's'} after ${input.project.name} ends` },
    );
  }

  const earliestStart = latest(constraints, 'earliest_start');
  const earliestDue = latest(constraints, 'earliest_due');
  const latestDue = earliest(constraints, 'latest_due');
  try {
    const placement = placeDatedActivity(input.startDate, input.dueDate, {
      earliest_start_date: earliestStart?.date,
      earliest_due_date: earliestDue?.date,
      latest_due_date: latestDue?.date,
    });
    return { status: placement.shift_days === 0 ? 'valid' : 'adjusted', placement, constraints };
  } catch {
    const lower = earliestStart && (!earliestDue || earliestStart.date >= earliestDue.date) ? earliestStart : earliestDue;
    const detail = lower && latestDue
      ? `It must occur on or after ${date(lower.date)} because ${lower.label}, but must finish by ${date(latestDue.date)} because ${latestDue.label}.`
      : 'Its current duration cannot fit within the available schedule boundaries.';
    return { status: 'conflict', constraints, message: `“${input.activityName}” cannot satisfy these schedule rules. ${detail}` };
  }
}
