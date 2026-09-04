import { addDays, dayDifference } from './dates';
import type {
  Activity,
  Project,
  ProjectRescheduleActivityChange,
  ProjectRescheduleConflict,
  ProjectRescheduleInput,
  ProjectReschedulePlan,
  ProjectWindowChange,
} from './types';

const completed = (activity: Activity) => activity.status === 'completed';
const active = (activity: Activity) => !activity.archived_at;

const isIsoDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

function windowChange(project: Project, newStart: string, newEnd: string): ProjectWindowChange {
  const oldDuration = dayDifference(project.start_date, project.end_date);
  const newDuration = dayDifference(newStart, newEnd);
  if (newStart === project.start_date && newEnd === project.end_date) return 'unchanged';
  if (newDuration > oldDuration) return 'expand';
  if (newDuration < oldDuration) return 'compress';
  return 'shift';
}

function activityConflict(
  code: ProjectRescheduleConflict['code'],
  activity: Activity,
  message: string,
  dates?: Record<string, string>,
  differenceDays?: number,
): ProjectRescheduleConflict {
  return {
    code,
    message,
    activity_id: activity.id,
    project_id: activity.project_id,
    dates,
    difference_days: differenceDays,
  };
}

function validateActivity(
  activity: Activity,
  startDate: string,
  dueDate: string,
  project: Project,
): ProjectRescheduleConflict[] {
  const conflicts: ProjectRescheduleConflict[] = [];
  if (dueDate < startDate) {
    conflicts.push(activityConflict('ACTIVITY_DATE_ORDER', activity, `${activity.name} ends before it starts.`, {
      activity_start: startDate,
      activity_due: dueDate,
    }));
  }
  if (startDate < project.start_date) {
    conflicts.push(activityConflict(
      'ACTIVITY_BEFORE_PROJECT_START',
      activity,
      `${activity.name} starts before the proposed project start.`,
      { activity_start: startDate, project_start: project.start_date },
      dayDifference(startDate, project.start_date),
    ));
  }

  const rule = activity.project_timing_rule;
  const offset = activity.project_timing_offset_days;
  const invalidTimingConfiguration = rule
    ? activity.project_timing_boundary !== 'end' ||
      !Number.isInteger(offset) ||
      (offset ?? -1) < (rule === 'post_project_deadline' ? 1 : 0)
    : activity.project_timing_boundary != null || offset != null;
  if (invalidTimingConfiguration) {
    conflicts.push(activityConflict(
      'TIMING_RULE_INVALID',
      activity,
      `${activity.name} has an invalid project timing offset.`,
    ));
  } else if (rule === 'advance_deadline' && offset != null) {
    const deadline = addDays(project.end_date, -offset);
    if (dueDate > deadline) {
      conflicts.push(activityConflict(
        'ADVANCE_DEADLINE_VIOLATION',
        activity,
        `${activity.name} finishes after its required advance deadline.`,
        { activity_due: dueDate, deadline, project_end: project.end_date },
        dayDifference(deadline, dueDate),
      ));
    }
  } else if (rule === 'post_project_deadline' && offset != null) {
    const deadline = addDays(project.end_date, offset);
    if (dueDate <= project.end_date || dueDate > deadline) {
      conflicts.push(activityConflict(
        'POST_PROJECT_WINDOW_VIOLATION',
        activity,
        `${activity.name} does not finish within its required post-project window.`,
        { activity_due: dueDate, project_end: project.end_date, deadline },
        dueDate <= project.end_date
          ? dayDifference(dueDate, project.end_date)
          : dayDifference(deadline, dueDate),
      ));
    }
  }

  if (dueDate > project.end_date && !activity.allow_outside_project) {
    conflicts.push(activityConflict(
      'OUTSIDE_PROJECT_UNAPPROVED',
      activity,
      `${activity.name} finishes after the project end without a recorded exception.`,
      { activity_due: dueDate, project_end: project.end_date },
      dayDifference(project.end_date, dueDate),
    ));
  }
  if (dueDate <= project.end_date && activity.allow_outside_project) {
    conflicts.push(activityConflict(
      'OUTSIDE_PROJECT_EXCEPTION_STALE',
      activity,
      `${activity.name} retains a project-date exception but no longer finishes after the project end.`,
      { activity_due: dueDate, project_end: project.end_date },
    ));
  }
  return conflicts;
}

export function planProjectReschedule(input: ProjectRescheduleInput): ProjectReschedulePlan {
  const projectActivities = input.activities
    .filter((activity) => activity.project_id === input.project.id)
    .sort((left, right) => left.id.localeCompare(right.id));
  const activeProjectActivities = projectActivities.filter(active);
  const hasCompletedWork = activeProjectActivities.some(completed);
  const mode = hasCompletedWork ? 'reschedule_remaining_work' : 'move_entire_schedule';
  const invalidDates = [
    ['project_start', input.project.start_date],
    ['project_end', input.project.end_date],
    ['requested_project_start', input.new_start_date],
    ['requested_project_end', input.new_end_date],
    ...activeProjectActivities.flatMap((activity) => [
      [`activity:${activity.id}:start`, activity.start_date],
      [`activity:${activity.id}:due`, activity.due_date],
    ]),
  ].filter((entry) => !isIsoDate(entry[1]));
  if (invalidDates.length) {
    const fallbackChanges: ProjectRescheduleActivityChange[] = projectActivities.map((activity) => ({
      activity_id: activity.id,
      project_id: activity.project_id,
      name: activity.name,
      disposition: activity.archived_at
        ? 'unchanged_archived'
        : hasCompletedWork && completed(activity)
          ? 'preserved_completed'
          : 'unchanged_active',
      original_start_date: activity.start_date,
      original_due_date: activity.due_date,
      proposed_start_date: activity.start_date,
      proposed_due_date: activity.due_date,
    }));
    const dateConflicts: ProjectRescheduleConflict[] = invalidDates.map(([field, value]) => ({
      code: 'DATE_INVALID',
      message: `${field} is not a valid calendar date.`,
      project_id: input.project.id,
      dates: { [field]: value },
    }));
    return {
      mode,
      end_delta_days: 0,
      window_change: 'unchanged',
      original_project_start_date: input.project.start_date,
      original_project_end_date: input.project.end_date,
      requested_project_start_date: input.new_start_date,
      requested_project_end_date: input.new_end_date,
      proposed_project_start_date: hasCompletedWork ? input.project.start_date : input.new_start_date,
      proposed_project_end_date: input.new_end_date,
      available_lead_in_days: null,
      earliest_containing_start_date: null,
      activity_changes: fallbackChanges,
      conflicts: dateConflicts,
      can_confirm: false,
    };
  }
  const endDelta = dayDifference(input.project.end_date, input.new_end_date);
  const proposedStart = hasCompletedWork ? input.project.start_date : input.new_start_date;
  const proposedProject: Project = {
    ...input.project,
    start_date: proposedStart,
    end_date: input.new_end_date,
  };
  const conflicts: ProjectRescheduleConflict[] = [];

  if (input.project.status === 'completed') {
    conflicts.push({
      code: 'PROJECT_COMPLETED',
      message: `${input.project.name} must be reopened before it can be rescheduled.`,
      project_id: input.project.id,
    });
  }
  if (input.new_end_date < input.new_start_date) {
    conflicts.push({
      code: 'PROJECT_DATE_ORDER',
      message: 'The proposed project end date is before its start date.',
      project_id: input.project.id,
      dates: { project_start: input.new_start_date, project_end: input.new_end_date },
    });
  }
  if (proposedStart !== input.new_start_date && input.new_end_date < proposedStart) {
    conflicts.push({
      code: 'PROJECT_DATE_ORDER',
      message: 'The effective project end date is before the preserved project start date.',
      project_id: input.project.id,
      dates: { project_start: proposedStart, project_end: input.new_end_date },
    });
  }
  if (hasCompletedWork && input.new_start_date !== input.project.start_date) {
    conflicts.push({
      code: 'PROJECT_START_CHANGE_WITH_COMPLETED_WORK',
      message: 'The project start cannot change while completed activities remain fixed.',
      project_id: input.project.id,
      dates: { current_start: input.project.start_date, requested_start: input.new_start_date },
      difference_days: dayDifference(input.project.start_date, input.new_start_date),
    });
  }

  const activityChanges: ProjectRescheduleActivityChange[] = projectActivities.map((activity) => {
    const disposition = activity.archived_at
      ? 'unchanged_archived'
      : hasCompletedWork && completed(activity)
        ? 'preserved_completed'
        : endDelta === 0
          ? 'unchanged_active'
          : 'moved';
    const shouldMove = disposition === 'moved';
    return {
      activity_id: activity.id,
      project_id: activity.project_id,
      name: activity.name,
      disposition,
      original_start_date: activity.start_date,
      original_due_date: activity.due_date,
      proposed_start_date: shouldMove ? addDays(activity.start_date, endDelta) : activity.start_date,
      proposed_due_date: shouldMove ? addDays(activity.due_date, endDelta) : activity.due_date,
    };
  });
  const changesById = new Map(activityChanges.map((change) => [change.activity_id, change]));
  const activitiesById = new Map(input.activities.map((activity) => [activity.id, activity]));
  const finalDates = (activity: Activity) => {
    const change = changesById.get(activity.id);
    return change
      ? { start_date: change.proposed_start_date, due_date: change.proposed_due_date }
      : { start_date: activity.start_date, due_date: activity.due_date };
  };

  for (const activity of activeProjectActivities) {
    const dates = finalDates(activity);
    conflicts.push(...validateActivity(activity, dates.start_date, dates.due_date, proposedProject));
  }

  const relevantDependencies = input.dependencies.filter((dependency) => !dependency.archived_at).sort(
    (left, right) => left.id.localeCompare(right.id),
  );
  for (const dependency of relevantDependencies) {
    const dependent = activitiesById.get(dependency.activity_id);
    const prerequisite = activitiesById.get(dependency.depends_on_activity_id);
    const touchesProject =
      dependent?.project_id === input.project.id || prerequisite?.project_id === input.project.id;
    if (!touchesProject) continue;
    if (!dependent || !prerequisite) {
      conflicts.push({
        code: 'DEPENDENCY_ENDPOINT_MISSING',
        message: 'A dependency refers to an activity that is not available for schedule validation.',
        dependency_id: dependency.id,
        dependent_activity_id: dependency.activity_id,
        prerequisite_activity_id: dependency.depends_on_activity_id,
      });
      continue;
    }
    if (!active(dependent) || !active(prerequisite)) continue;

    const invalidEndpoint = [dependent, prerequisite].find(
      (activity) => !isIsoDate(activity.start_date) || !isIsoDate(activity.due_date),
    );
    if (invalidEndpoint) {
      conflicts.push(activityConflict(
        'DATE_INVALID',
        invalidEndpoint,
        `${invalidEndpoint.name} has an invalid calendar date.`,
        { activity_start: invalidEndpoint.start_date, activity_due: invalidEndpoint.due_date },
      ));
      continue;
    }

    const dependentDates = finalDates(dependent);
    const prerequisiteDates = finalDates(prerequisite);
    const dependencyScope: ProjectRescheduleConflict['dependency_scope'] = dependent.project_id === input.project.id
      ? prerequisite.project_id === input.project.id ? 'internal' : 'incoming'
      : 'outgoing';
    const common = {
      dependency_id: dependency.id,
      dependent_activity_id: dependent.id,
      prerequisite_activity_id: prerequisite.id,
      project_id: input.project.id,
      dependency_scope: dependencyScope,
      dependent_activity_name: dependent.name,
      dependent_project_id: dependent.project_id,
      prerequisite_activity_name: prerequisite.name,
      prerequisite_project_id: prerequisite.project_id,
    };
    if (completed(dependent) && !completed(prerequisite)) {
      conflicts.push({
        ...common,
        code: 'COMPLETED_DEPENDENT_INCOMPLETE_PREREQUISITE',
        message: `${dependent.name} is completed while its prerequisite ${prerequisite.name} remains incomplete.`,
      });
    }
    if (
      dependency.constraint_type === 'finish_to_start' &&
      dependentDates.start_date < prerequisiteDates.due_date
    ) {
      conflicts.push({
        ...common,
        code: 'FINISH_TO_START_VIOLATION',
        message: `${dependent.name} starts before prerequisite ${prerequisite.name} finishes.`,
        dates: {
          dependent_start: dependentDates.start_date,
          prerequisite_due: prerequisiteDates.due_date,
        },
        difference_days: dayDifference(dependentDates.start_date, prerequisiteDates.due_date),
      });
    }
    if (
      dependency.constraint_type === 'finish_to_finish' &&
      dependentDates.due_date < prerequisiteDates.due_date
    ) {
      conflicts.push({
        ...common,
        code: 'FINISH_TO_FINISH_VIOLATION',
        message: `${dependent.name} finishes before prerequisite ${prerequisite.name} finishes.`,
        dates: {
          dependent_due: dependentDates.due_date,
          prerequisite_due: prerequisiteDates.due_date,
        },
        difference_days: dayDifference(dependentDates.due_date, prerequisiteDates.due_date),
      });
    }
  }

  const activeStarts = activityChanges
    .filter((change) => change.disposition !== 'unchanged_archived')
    .map((change) => change.proposed_start_date)
    .sort();
  const earliestStart = activeStarts[0] ?? null;
  const availableLeadIn = earliestStart ? dayDifference(proposedStart, earliestStart) : null;

  return {
    mode,
    end_delta_days: endDelta,
    window_change: windowChange(input.project, input.new_start_date, input.new_end_date),
    original_project_start_date: input.project.start_date,
    original_project_end_date: input.project.end_date,
    requested_project_start_date: input.new_start_date,
    requested_project_end_date: input.new_end_date,
    proposed_project_start_date: proposedStart,
    proposed_project_end_date: input.new_end_date,
    available_lead_in_days: availableLeadIn,
    earliest_containing_start_date:
      mode === 'move_entire_schedule' && earliestStart && earliestStart < proposedStart
        ? earliestStart
        : null,
    activity_changes: activityChanges,
    conflicts,
    can_confirm: conflicts.length === 0,
  };
}
