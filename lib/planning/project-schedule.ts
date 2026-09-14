import { addDays, dayDifference, isoDate } from './dates';

export const PROJECT_SCHEDULE_DAY_WIDTH = 18;
export const PROJECT_SCHEDULE_MIN_DAY_WIDTH = 10;
export const PROJECT_SCHEDULE_MAX_DAY_WIDTH = 36;
export const PROJECT_SCHEDULE_LABEL_GUTTER = 96;

export type ProjectScheduleMark = { date: string; label?: string };
export type ProjectScheduleInterval = 'day' | 'week' | 'month' | 'quarter';

const localDate = (value: string) => new Date(`${value}T12:00:00`);

function firstMondayOnOrAfter(value: string) {
  const result = localDate(value);
  result.setDate(result.getDate() + ((8 - result.getDay()) % 7));
  return isoDate(result);
}

function firstMonthOnOrAfter(value: string, quarter = false) {
  const result = localDate(value);
  const atBoundary = result.getDate() === 1 && (!quarter || result.getMonth() % 3 === 0);
  const month = atBoundary ? result.getMonth() : quarter ? Math.ceil((result.getMonth() + 1) / 3) * 3 : result.getMonth() + 1;
  result.setMonth(month, 1);
  return isoDate(result);
}

export function projectScheduleMarks(start: string, end: string, interval: ProjectScheduleInterval, labelled = false): ProjectScheduleMark[] {
  let cursor = interval === 'week' ? firstMondayOnOrAfter(start) : interval === 'month' ? firstMonthOnOrAfter(start) : interval === 'quarter' ? firstMonthOnOrAfter(start, true) : start;
  const marks: ProjectScheduleMark[] = [];
  while (cursor <= end) {
    marks.push({
      date: cursor,
      label: labelled ? localDate(cursor).toLocaleDateString('en-US', interval === 'quarter' ? { month: 'short', year: 'numeric' } : { month: 'short', day: 'numeric' }) : undefined,
    });
    if (interval === 'month' || interval === 'quarter') {
      const result = localDate(cursor);
      result.setMonth(result.getMonth() + (interval === 'quarter' ? 3 : 1), 1);
      cursor = isoDate(result);
    } else cursor = addDays(cursor, interval === 'week' ? 7 : 1);
  }
  return marks;
}

export function projectScheduleOffset(domainStart: string, value: string, dayWidth = PROJECT_SCHEDULE_DAY_WIDTH) {
  return dayDifference(domainStart, value) * dayWidth;
}

export function projectScheduleBar(domainStart: string, start: string, exclusiveEnd: string, dayWidth = PROJECT_SCHEDULE_DAY_WIDTH) {
  return {
    left: `${projectScheduleOffset(domainStart, start, dayWidth)}px`,
    width: `${Math.max(3, dayDifference(start, exclusiveEnd) * dayWidth)}px`,
  };
}

export function projectScheduleScale(domainStart: string, domainEnd: string, availableTrackWidth?: number, minimumDayWidth = PROJECT_SCHEDULE_MIN_DAY_WIDTH) {
  const span = dayDifference(domainStart, domainEnd) + 1;
  const fittedDayWidth = availableTrackWidth ? (availableTrackWidth - PROJECT_SCHEDULE_LABEL_GUTTER) / span : PROJECT_SCHEDULE_DAY_WIDTH;
  const dayWidth = Math.max(minimumDayWidth, Math.min(PROJECT_SCHEDULE_MAX_DAY_WIDTH, fittedDayWidth));
  const majorUnit: ProjectScheduleInterval = span <= 45 || dayWidth >= 14 ? 'week' : span <= 210 ? 'month' : 'quarter';
  const minorUnit: ProjectScheduleInterval = majorUnit === 'week' ? 'day' : majorUnit === 'month' ? 'week' : 'month';
  return {
    span,
    dayWidth,
    trackWidth: Math.max(availableTrackWidth || 0, span * dayWidth + PROJECT_SCHEDULE_LABEL_GUTTER),
    majorUnit,
    minorUnit,
    major: projectScheduleMarks(domainStart, domainEnd, majorUnit, true),
    minor: projectScheduleMarks(domainStart, domainEnd, minorUnit),
  };
}
