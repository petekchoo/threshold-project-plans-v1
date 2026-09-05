'use client';

import { addDays, date, dayDifference } from '../../lib/planning/dates';
import { projectScheduleScale } from '../../lib/planning/project-schedule';
import { timelinePosition } from '../../lib/planning/scheduling';
import type { Activity, Project } from '../../lib/planning/types';
import { statusLabel } from '../shared/status-pill';

export function ProjectSchedule({ project, activities, onEdit }: { project: Project; activities: Activity[]; onEdit: (activity: Activity) => void }) {
  const domainStart = [project.start_date, ...activities.map((activity) => activity.start_date)].sort()[0];
  const domainEnd = [project.end_date, ...activities.map((activity) => activity.due_date)].sort().at(-1) || project.end_date;
  const { span, major, minor } = projectScheduleScale(domainStart, domainEnd);
  const position = (value: string) => `${Math.min(100, Math.max(0, dayDifference(domainStart, value) / span * 100))}%`;
  const endPosition = (value: string) => `${Math.min(100, Math.max(0, (dayDifference(domainStart, value) + 1) / span * 100))}%`;
  const ordered = [...activities].sort((a, b) => a.start_date.localeCompare(b.start_date) || a.due_date.localeCompare(b.due_date) || a.name.localeCompare(b.name));
  const labels = major.map((mark, index) => {
    const next = major[index + 1]?.date || addDays(domainEnd, 1);
    const width = dayDifference(mark.date, next) / span * 100;
    return { ...mark, width };
  }).filter((mark) => mark.width >= 18);

  const grid = <>{minor.map((mark) => <i aria-hidden="true" className="schedule-grid-minor" key={`minor-${mark.date}`} style={{ left: position(mark.date) }}/>) }{major.map((mark) => <i aria-hidden="true" className="schedule-grid-major" key={`major-${mark.date}`} style={{ left: position(mark.date) }}/>)}</>;

  return (
    <><p className="mobile-schedule-hint">Swipe horizontally to review the complete project timeline.</p><div className="project-schedule-scroll">
      <div className="project-schedule">
        <div className="schedule-header-label">Timeline</div>
        <div className="schedule-header-track">{grid}{labels.map((mark) => <span key={mark.date} style={{ left: position(mark.date), width: `${mark.width}%` }}>{mark.label}</span>)}</div>
        <div className="schedule-row-label project-row-label"><strong>Project timeline</strong><small>{date(project.start_date)} – {date(project.end_date)}</small></div>
        <div className="schedule-track project-track">{grid}<b aria-hidden="true" className="project-schedule-bar" style={timelinePosition(project.start_date, addDays(project.end_date, 1), domainStart, addDays(domainEnd, 1))}/><em className="project-end-marker" style={{ left: endPosition(project.end_date) }}><span>Project end</span></em></div>
        {ordered.map((activity) => (
          <div className="schedule-row" key={activity.id}>
            <button className="schedule-row-label" type="button" onClick={() => onEdit(activity)}><strong>{activity.name}</strong><small>{statusLabel(activity.status)} · {date(activity.start_date)} – {date(activity.due_date)}</small></button>
            <div className="schedule-track">{grid}<i aria-hidden="true" className={`schedule-activity-bar status-${activity.status}`} style={timelinePosition(activity.start_date, addDays(activity.due_date, 1), domainStart, addDays(domainEnd, 1))}/></div>
          </div>
        ))}
      </div>
    </div></>
  );
}
