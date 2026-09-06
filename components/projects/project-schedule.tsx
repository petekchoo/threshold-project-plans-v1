'use client';

import type { CSSProperties } from 'react';
import { addDays, date } from '../../lib/planning/dates';
import { projectScheduleBar, projectScheduleOffset, projectScheduleScale } from '../../lib/planning/project-schedule';
import type { Activity, Project } from '../../lib/planning/types';
import { statusLabel } from '../shared/status-pill';

export function ProjectSchedule({ project, activities, onEdit }: { project: Project; activities: Activity[]; onEdit: (activity: Activity) => void }) {
  const domainStart = [project.start_date, ...activities.map((activity) => activity.start_date)].sort()[0];
  const domainEnd = [project.end_date, ...activities.map((activity) => activity.due_date)].sort().at(-1) || project.end_date;
  const { trackWidth, dayWidth, major, minor } = projectScheduleScale(domainStart, domainEnd);
  const position = (value: string) => `${projectScheduleOffset(domainStart, value)}px`;
  const endPosition = (value: string) => `${projectScheduleOffset(domainStart, value) + dayWidth}px`;
  const ordered = [...activities].sort((a, b) => a.start_date.localeCompare(b.start_date) || a.due_date.localeCompare(b.due_date) || a.name.localeCompare(b.name));

  const grid = <>{minor.map((mark) => <i aria-hidden="true" className="schedule-grid-minor" key={`minor-${mark.date}`} style={{ left: position(mark.date) }}/>) }{major.map((mark) => <i aria-hidden="true" className="schedule-grid-major" key={`major-${mark.date}`} style={{ left: position(mark.date) }}/>)}</>;

  return (
    <><p className="mobile-schedule-hint">Swipe horizontally to review the complete project timeline.</p><div className="project-schedule-scroll">
      <div className="project-schedule" style={{ '--schedule-track-width': `${trackWidth}px` } as CSSProperties}>
        <div className="schedule-header-label">Timeline</div>
        <div className="schedule-header-track">{grid}{major.map((mark) => <span key={mark.date} style={{ left: position(mark.date), width: `${dayWidth * 7}px` }}>{mark.label}</span>)}</div>
        <div className="schedule-row-label project-row-label"><strong>Project timeline</strong><small>{date(project.start_date)} – {date(project.end_date)}</small></div>
        <div className="schedule-track project-track">{grid}<b aria-hidden="true" className="project-schedule-bar" style={projectScheduleBar(domainStart, project.start_date, addDays(project.end_date, 1))}/><em className="project-end-marker" style={{ left: endPosition(project.end_date) }}><span>{date(project.end_date)}</span></em></div>
        {ordered.map((activity) => (
          <div className="schedule-row" key={activity.id}>
            <button className="schedule-row-label" type="button" onClick={() => onEdit(activity)}><strong>{activity.name}</strong><small>{statusLabel(activity.status)} · {date(activity.start_date)} – {date(activity.due_date)}</small></button>
            <div className="schedule-track">{grid}<i aria-hidden="true" className={`schedule-activity-bar status-${activity.status}`} style={projectScheduleBar(domainStart, activity.start_date, addDays(activity.due_date, 1))}/></div>
          </div>
        ))}
      </div>
    </div></>
  );
}
