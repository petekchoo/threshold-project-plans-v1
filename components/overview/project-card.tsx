'use client';

import Link from 'next/link';
import { Pill } from '../shared/status-pill';
import { date, isoDate } from '../../lib/planning/dates';
import { progress } from '../../lib/planning/progress';
import type { Activity, Project } from '../../lib/planning/types';

export function ProjectCard({ p, activities }: { p: Project; activities: Activity[] }) {
  const today=isoDate(new Date()),rows=activities.filter(activity=>activity.project_id===p.id),overdue=rows.filter(activity=>activity.status!=='completed'&&activity.due_date<today).length,blocked=rows.filter(activity=>activity.status==='blocked').length,next=[...rows].filter(activity=>activity.status!=='completed').sort((a,b)=>a.due_date.localeCompare(b.due_date))[0];
  return <Link href={`/projects/${p.id}`} className="project-tile"><div className="card-title"><div><small>{p.project_types?.name||'Project'}</small><h3>{p.name}</h3></div><Pill value={p.status}/></div><div className="date-row"><span>{date(p.start_date)}</span><i/><span>{date(p.end_date)}</span></div><div className="progress"><div><span>Activity progress</span><strong>{progress(p,activities)}%</strong></div><i><b style={{width:`${progress(p,activities)}%`}}/></i></div><div className="project-card-signals"><span><b>{overdue}</b> overdue</span><span><b>{blocked}</b> blocked</span></div><p className="next"><span>Next</span>{next?`${next.name} · ${date(next.due_date)}`:'No open activities'}</p></Link>;
}
