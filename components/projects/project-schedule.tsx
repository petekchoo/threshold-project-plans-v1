'use client';

import { addDays, date, dayDifference, isoDate } from '../../lib/planning/dates';
import { timelinePosition } from '../../lib/planning/scheduling';
import type { Activity, Project } from '../../lib/planning/types';
import { statusLabel } from '../shared/status-pill';

type Mark = { date: string; label?: string };

const localDate = (value: string) => new Date(`${value}T12:00:00`);

function startOfWeek(value: string) {
  const result = localDate(value);
  const day = result.getDay();
  result.setDate(result.getDate() - ((day + 6) % 7));
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

function advance(value: string, unit: 'day' | 'week' | 'month' | 'quarter') {
  if (unit === 'day') return addDays(value, 1);
  if (unit === 'week') return addDays(value, 7);
  const result = localDate(value);
  result.setMonth(result.getMonth() + (unit === 'quarter' ? 3 : 1), 1);
  return isoDate(result);
}

function addCalendarMonths(value: string, months: number) {
  const result = localDate(value);
  const originalDay = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0, 12).getDate();
  result.setDate(Math.min(originalDay, lastDay));
  return result;
}

function marks(start: string, end: string, unit: 'day' | 'week' | 'month' | 'quarter', labelled = false): Mark[] {
  let cursor = unit === 'week' ? startOfWeek(start) : unit === 'month' ? startOfMonth(start) : unit === 'quarter' ? startOfQuarter(start) : start;
  const result: Mark[] = [];
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

export function ProjectSchedule({ project, activities, onEdit }: { project: Project; activities: Activity[]; onEdit: (activity: Activity) => void }) {
  const domainStart = [project.start_date, ...activities.map((activity) => activity.start_date)].sort()[0];
  const domainEnd = [project.end_date, ...activities.map((activity) => activity.due_date)].sort().at(-1) || project.end_date;
  const span = dayDifference(domainStart, domainEnd) + 1;
  const monthLimit = addCalendarMonths(domainStart, 1);
  const halfYearLimit = addCalendarMonths(domainStart, 6);
  const [majorUnit, minorUnit] = localDate(domainEnd) <= monthLimit ? ['week', 'day'] as const : localDate(domainEnd) <= halfYearLimit ? ['month', 'week'] as const : ['quarter', 'month'] as const;
  const major = marks(domainStart, domainEnd, majorUnit, true);
  const minor = marks(domainStart, domainEnd, minorUnit);
  const position = (value: string) => `${Math.min(100, Math.max(0, dayDifference(domainStart, value) / span * 100))}%`;
  const endPosition = (value: string) => `${Math.min(100, Math.max(0, (dayDifference(domainStart, value) + 1) / span * 100))}%`;
  const ordered = [...activities].sort((a, b) => a.start_date.localeCompare(b.start_date) || a.due_date.localeCompare(b.due_date) || a.name.localeCompare(b.name));

  const grid = <>{minor.map((mark) => <i aria-hidden="true" className="schedule-grid-minor" key={`minor-${mark.date}`} style={{ left: position(mark.date) }}/>) }{major.map((mark) => <i aria-hidden="true" className="schedule-grid-major" key={`major-${mark.date}`} style={{ left: position(mark.date) }}/>)}</>;

  return (
    <div className="project-schedule-scroll">
      <div className="project-schedule">
        <div className="schedule-header-label">Timeline</div>
        <div className="schedule-header-track">{grid}{major.map((mark) => <span key={mark.date} style={{ left: position(mark.date) }}>{mark.label}</span>)}</div>
        <div className="schedule-row-label project-row-label"><strong>Project timeline</strong><small>{date(project.start_date)} – {date(project.end_date)}</small></div>
        <div className="schedule-track project-track">{grid}<b aria-hidden="true" className="project-schedule-bar" style={timelinePosition(project.start_date, addDays(project.end_date, 1), domainStart, addDays(domainEnd, 1))}/><em className="project-end-marker" style={{ left: endPosition(project.end_date) }}><span>Project end</span></em></div>
        {ordered.map((activity) => (
          <div className="schedule-row" key={activity.id}>
            <button className="schedule-row-label" type="button" onClick={() => onEdit(activity)}><strong>{activity.name}</strong><small>{statusLabel(activity.status)} · {date(activity.start_date)} – {date(activity.due_date)}</small></button>
            <div className="schedule-track">{grid}<i aria-hidden="true" className={`schedule-activity-bar status-${activity.status}`} style={timelinePosition(activity.start_date, addDays(activity.due_date, 1), domainStart, addDays(domainEnd, 1))}/></div>
          </div>
        ))}
      </div>
    </div>
  );
}
