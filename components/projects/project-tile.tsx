'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { Pill } from '../shared/status-pill';
import { date, isoDate } from '../../lib/planning/dates';
import { progress } from '../../lib/planning/progress';
import { projectTimelineState } from '../../lib/planning/project-tile';
import type { Activity, Project } from '../../lib/planning/types';

export function ProjectTile({ project, activities }: { project: Project; activities: Activity[] }) {
  const today = isoDate(new Date());
  const rows = activities.filter(activity => activity.project_id === project.id);
  const overdue = rows.filter(activity => activity.status !== 'completed' && activity.due_date < today).length;
  const blocked = rows.filter(activity => activity.status === 'blocked').length;
  const next = [...rows].filter(activity => activity.status !== 'completed').sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
  const completion = progress(project, activities);
  const timeline = projectTimelineState(project.start_date, project.end_date, today);
  const timelineStyle = {
    '--elapsed-percent': `${timeline.elapsedPercent}%`,
    '--today-position': `${timeline.todayPercent ?? 0}%`,
  } as CSSProperties;

  return <Link href={`/projects/${project.id}`} className="project-tile">
    <div className="card-title"><div><small>{project.project_types?.name || 'Project'}</small><h3>{project.name}</h3></div><Pill value={project.status}/></div>
    <div className="project-date-progress" style={timelineStyle}>
      <div className="project-date-labels"><span>{date(project.start_date)}</span><span>{date(project.end_date)}</span></div>
      <div className="project-card-track project-date-track" role="img" aria-label={`Project window from ${date(project.start_date)} to ${date(project.end_date)}${timeline.todayPercent === null ? '' : `; today is ${Math.round(timeline.todayPercent)} percent through the window`}`}>
        <i aria-hidden="true"/>
        {timeline.todayPercent !== null && <><b aria-hidden="true"/><small aria-hidden="true">Today</small></>}
      </div>
    </div>
    <div className="progress"><div><span>Activity progress</span><strong>{completion}%</strong></div><div className="project-card-track project-completion-track"><i style={{ width: `${completion}%` }}/></div></div>
    <div className="project-card-signals"><span><b>{overdue}</b> overdue</span><span><b>{blocked}</b> blocked</span></div>
    <p className="next"><span>Next</span>{next ? `${next.name} · ${date(next.due_date)}` : 'No open activities'}</p>
  </Link>;
}
