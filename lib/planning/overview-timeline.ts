import { addDays, dayDifference, isoDate } from './dates';
import type { Project } from './types';

export type OverviewRange = 'Week'|'Month'|'Quarter'|'Half-year'|'Year'|'All Events';
type Unit = 'day'|'week'|'month'|'quarter';
export type OverviewTimelineMark = { date: string; label: string; left: number; width: number };

const localDate = (value: string) => new Date(`${value}T12:00:00`);

export function addCalendarMonths(value: string, months: number) {
  const result = localDate(value);
  const originalDay = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0, 12).getDate();
  result.setDate(Math.min(originalDay, lastDay));
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

function advance(value: string, unit: Unit) {
  if (unit === 'day') return addDays(value, 1);
  if (unit === 'week') return addDays(value, 7);
  return addCalendarMonths(value, unit === 'quarter' ? 3 : 1);
}

function label(value: string, unit: Unit) {
  const current = localDate(value);
  if (unit === 'quarter') return `Q${Math.floor(current.getMonth() / 3) + 1} ${current.getFullYear()}`;
  if (unit === 'month') return current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  if (unit === 'week') return current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return current.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function datesByUnit(start: string, end: string, unit: Unit) {
  if (unit === 'month' || unit === 'quarter') {
    const dates = [start];
    let cursor = unit === 'month' ? startOfMonth(start) : startOfQuarter(start);
    while (cursor <= start) cursor = advance(cursor, unit);
    while (cursor < end) { dates.push(cursor); cursor = advance(cursor, unit); }
    return dates;
  }
  const dates: string[] = [];
  let cursor = start;
  while (cursor < end) { dates.push(cursor); cursor = advance(cursor, unit); }
  return dates;
}

export function overviewTimeline(range: OverviewRange, today: string, projects: Project[]) {
  let domainStart = today;
  let domainEnd = addDays(today, 7);
  let gridUnit: Unit = 'day';
  let labelUnit: Unit = 'day';

  if (range === 'Month') {
    domainEnd = addCalendarMonths(today, 1);
    gridUnit = labelUnit = 'week';
  }
  if (range === 'Quarter') {
    domainEnd = addCalendarMonths(today, 3);
    gridUnit = 'week';
    labelUnit = 'month';
  }
  if (range === 'Half-year') {
    domainEnd = addCalendarMonths(today, 6);
    gridUnit = labelUnit = 'month';
  }
  if (range === 'Year') {
    domainEnd = addCalendarMonths(today, 12);
    gridUnit = labelUnit = 'quarter';
  }
  if (range === 'All Events') {
    gridUnit = labelUnit = 'quarter';
    if (projects.length) {
      domainStart = startOfQuarter(projects.map(project=>project.start_date).sort()[0]);
      const latestEnd = projects.map(project=>project.end_date).sort().at(-1) || domainStart;
      domainEnd = addCalendarMonths(startOfQuarter(latestEnd), 3);
    } else {
      domainStart = startOfQuarter(today);
      domainEnd = addCalendarMonths(domainStart, 3);
    }
  }

  const span = Math.max(1, dayDifference(domainStart, domainEnd));
  const gridDates = datesByUnit(domainStart, domainEnd, gridUnit);
  const labelDates = datesByUnit(domainStart, domainEnd, labelUnit);
  const gridMarks = [...gridDates, domainEnd].map(date => ({ date, left: dayDifference(domainStart, date) / span * 100 }));
  const marks: OverviewTimelineMark[] = labelDates.map((date, index) => {
    const nextDate = labelDates[index + 1] || domainEnd;
    return { date, label: label(date, labelUnit), left: dayDifference(domainStart, date) / span * 100, width: dayDifference(date, nextDate) / span * 100 };
  });
  return { domainStart, domainEnd, marks, gridMarks, gridUnit, labelUnit };
}

export function overviewBarPosition(start: string, inclusiveEnd: string, domainStart: string, domainEnd: string) {
  const end = addDays(inclusiveEnd, 1);
  if (end <= domainStart || start >= domainEnd) return null;
  const clippedStart = start < domainStart ? domainStart : start;
  const clippedEnd = end > domainEnd ? domainEnd : end;
  const span = Math.max(1, dayDifference(domainStart, domainEnd));
  const left = dayDifference(domainStart, clippedStart) / span * 100;
  const width = dayDifference(clippedStart, clippedEnd) / span * 100;
  return { left: `${left}%`, width: `${width}%`, extendsBefore: start < domainStart, extendsAfter: end > domainEnd };
}
