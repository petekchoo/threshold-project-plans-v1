import { addDays, date, dayDifference } from './dates';
import type { Project, ProjectTimingRule } from './types';

export function projectTimingDeadline(
  project: Project,
  rule: ProjectTimingRule,
  offset: number,
) {
  return rule === 'advance_deadline'
    ? addDays(project.end_date, -offset)
    : addDays(project.end_date, offset);
}

export function projectTimingConflict(
  name: string,
  due: string,
  project: Project,
  rule: ProjectTimingRule,
  offset: number,
) {
  const deadline = projectTimingDeadline(project, rule, offset);
  if (due <= deadline) return '';

  const days = dayDifference(deadline, due);
  const basis =
    rule === 'advance_deadline'
      ? `${offset} calendar day${offset === 1 ? '' : 's'} before the project end date`
      : `within ${offset} calendar day${offset === 1 ? '' : 's'} after the project end date`;

  return `“${name}” must finish by ${date(deadline)}—${basis}. Its current finish date is ${date(due)}, ${days} day${days === 1 ? '' : 's'} later.`;
}

export const timelinePosition = (
  start: string,
  end: string,
  domainStart: string,
  domainEnd: string,
) => {
  const origin = new Date(`${domainStart}T12:00:00`).getTime();
  const finish = new Date(`${domainEnd}T12:00:00`).getTime();
  const span = Math.max(86400000, finish - origin);
  const left = Math.max(
    0,
    Math.min(100, ((new Date(`${start}T12:00:00`).getTime() - origin) / span) * 100),
  );
  const right = Math.max(
    0,
    Math.min(100, ((new Date(`${end}T12:00:00`).getTime() - origin) / span) * 100),
  );

  return { left: `${left}%`, width: `${Math.max(2, right - left)}%` };
};
