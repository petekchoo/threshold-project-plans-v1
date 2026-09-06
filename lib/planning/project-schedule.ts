import { addDays, dayDifference, isoDate } from './dates';

export const PROJECT_SCHEDULE_DAY_WIDTH = 18;
export const PROJECT_SCHEDULE_LABEL_GUTTER = 96;

export type ProjectScheduleMark = { date: string; label?: string };

const localDate = (value: string) => new Date(`${value}T12:00:00`);

function firstMondayOnOrAfter(value: string) {
  const result = localDate(value);
  result.setDate(result.getDate() + ((8 - result.getDay()) % 7));
  return isoDate(result);
}

export function projectScheduleMarks(start: string, end: string, interval: 'day' | 'week', labelled = false): ProjectScheduleMark[] {
  let cursor = interval === 'week' ? firstMondayOnOrAfter(start) : start;
  const marks: ProjectScheduleMark[] = [];
  while (cursor <= end) {
    marks.push({
      date: cursor,
      label: labelled ? localDate(cursor).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : undefined,
    });
    cursor = addDays(cursor, interval === 'week' ? 7 : 1);
  }
  return marks;
}

export function projectScheduleOffset(domainStart: string, value: string) {
  return dayDifference(domainStart, value) * PROJECT_SCHEDULE_DAY_WIDTH;
}

export function projectScheduleBar(domainStart: string, start: string, exclusiveEnd: string) {
  return {
    left: `${projectScheduleOffset(domainStart, start)}px`,
    width: `${Math.max(3, dayDifference(start, exclusiveEnd) * PROJECT_SCHEDULE_DAY_WIDTH)}px`,
  };
}

export function projectScheduleScale(domainStart: string, domainEnd: string) {
  const span = dayDifference(domainStart, domainEnd) + 1;
  return {
    span,
    dayWidth: PROJECT_SCHEDULE_DAY_WIDTH,
    trackWidth: span * PROJECT_SCHEDULE_DAY_WIDTH + PROJECT_SCHEDULE_LABEL_GUTTER,
    majorUnit: 'week' as const,
    minorUnit: 'day' as const,
    major: projectScheduleMarks(domainStart, domainEnd, 'week', true),
    minor: projectScheduleMarks(domainStart, domainEnd, 'day'),
  };
}
