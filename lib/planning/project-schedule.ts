import { addDays, dayDifference, isoDate } from './dates';

export type ProjectScheduleUnit = 'day' | 'week' | 'month' | 'quarter';
export type ProjectScheduleMark = { date: string; label?: string };

const localDate = (value: string) => new Date(`${value}T12:00:00`);

function startOfWeek(value: string) {
  const result = localDate(value);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return isoDate(result);
}

function startOfMonth(value: string) {
  const result = localDate(value);
  result.setDate(1);
  return isoDate(result);
}

function startOfQuarter(value: string) {
  const result = localDate(value);
  result.setMonth(Math.floor(result.getMonth() / 3) * 3, 1);
  return isoDate(result);
}

function advance(value: string, unit: ProjectScheduleUnit) {
  if (unit === 'day') return addDays(value, 1);
  if (unit === 'week') return addDays(value, 7);
  const result = localDate(value);
  result.setMonth(result.getMonth() + (unit === 'quarter' ? 3 : 1), 1);
  return isoDate(result);
}

export function addCalendarMonths(value: string, months: number) {
  const result = localDate(value);
  const originalDay = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0, 12).getDate();
  result.setDate(Math.min(originalDay, lastDay));
  return result;
}

export function projectScheduleMarks(start: string, end: string, unit: ProjectScheduleUnit, labelled = false): ProjectScheduleMark[] {
  let cursor = unit === 'week' ? startOfWeek(start) : unit === 'month' ? startOfMonth(start) : unit === 'quarter' ? startOfQuarter(start) : start;
  while (cursor < start) cursor = advance(cursor, unit);
  const result: ProjectScheduleMark[] = [];
  while (cursor <= end) {
    const current = localDate(cursor);
    const label = unit === 'quarter'
      ? `Q${Math.floor(current.getMonth() / 3) + 1} ${current.getFullYear()}`
      : unit === 'month'
        ? current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    result.push({ date: cursor, label: labelled ? label : undefined });
    cursor = advance(cursor, unit);
  }
  return result;
}

export function projectScheduleScale(domainStart: string, domainEnd: string) {
  const span = dayDifference(domainStart, domainEnd) + 1;
  const monthLimit = addCalendarMonths(domainStart, 1);
  const halfYearLimit = addCalendarMonths(domainStart, 6);
  const [majorUnit, minorUnit] = localDate(domainEnd) <= monthLimit
    ? ['week', 'day'] as const
    : localDate(domainEnd) <= halfYearLimit
      ? ['month', 'week'] as const
      : ['quarter', 'month'] as const;
  return {
    span,
    majorUnit,
    minorUnit,
    major: projectScheduleMarks(domainStart, domainEnd, majorUnit, true),
    minor: projectScheduleMarks(domainStart, domainEnd, minorUnit),
  };
}
