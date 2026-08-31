'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AvatarList } from '../shared/avatar-list';
import { Heading } from '../shared/page-heading';
import { Pill } from '../shared/status-pill';
import { date, isoDate } from '../../lib/planning/dates';
import type { AppData, Project } from '../../lib/planning/types';

const progress = (project: Project, activities: AppData['activities']) => {
  const rows = activities.filter((activity) => activity.project_id === project.id);
  return rows.length ? Math.round(rows.filter((activity) => activity.status === 'completed').length / rows.length * 100) : 0;
};

export function Projects({ data, query, onNew }: { data: AppData; query: string; onNew: () => void }) {
  const [search, setSearch] = useState(query);
  const [sort, setSort] = useState<'start_date'|'end_date'|'status'|'name'>('start_date');
  const [showArchived, setShowArchived] = useState(false);
  const today = isoDate(new Date());
  const source = showArchived ? [...data.projects, ...(data.archivedProjects || [])] : data.projects;
  const ps = source.filter((project) => project.name.toLowerCase().includes(search.toLowerCase())).sort((a, b) => String(a[sort]).localeCompare(String(b[sort])));

  return <><Heading eyebrow="Planning portfolio" title="Projects" copy="Search, sort, and open every operating window." action={<button className="secondary-btn" onClick={onNew}>＋ New project</button>}/><div className="filters"><input className="filter-search" type="search" aria-label="Search projects" placeholder="Search projects" value={search} onChange={event=>setSearch(event.target.value)}/><label>Sort<select value={sort} onChange={event=>setSort(event.target.value as typeof sort)}><option value="start_date">Start date</option><option value="end_date">End date</option><option value="status">Status</option><option value="name">Name</option></select></label><label className="filter-check"><input type="checkbox" checked={showArchived} onChange={event=>setShowArchived(event.target.checked)}/> Show archived</label><span>{ps.length} projects</span></div><div className="table-card"><table><thead><tr><th>Project</th><th>Type</th><th>Status</th><th>Start</th><th>End</th><th>Progress</th><th>Overdue</th><th>Team members</th></tr></thead><tbody>{ps.map(project=>{const overdue=data.activities.filter(activity=>activity.project_id===project.id&&activity.status!=='completed'&&activity.due_date<today).length;return <tr key={project.id}><td><Link href={`/projects/${project.id}`}><strong>{project.name}</strong><small>{project.archived_at?'Archived':project.description}</small></Link></td><td>{project.project_types?.name}</td><td><Pill value={project.status}/></td><td>{date(project.start_date)}</td><td>{date(project.end_date)}</td><td>{progress(project,data.activities)}%</td><td>{overdue}</td><td><AvatarList owners={project.project_owners?.map(owner=>owner.team_members)||[]}/></td></tr>})}</tbody></table></div><div className="mobile-list">{ps.map(project=><Link key={project.id} href={`/projects/${project.id}`} className="project-tile"><div className="card-title"><div><small>{project.project_types?.name||'Project'}</small><h3>{project.name}</h3></div><Pill value={project.status}/></div><div className="date-row"><span>{date(project.start_date)}</span><i/><span>{date(project.end_date)}</span></div><div className="progress"><div><span>Activity progress</span><strong>{progress(project,data.activities)}%</strong></div><i><b style={{width:`${progress(project,data.activities)}%`}}/></i></div><div className="project-card-signals"><span><b>{data.activities.filter(activity=>activity.project_id===project.id&&activity.status!=='completed'&&activity.due_date<today).length}</b> overdue</span><span><b>{data.activities.filter(activity=>activity.project_id===project.id&&activity.status==='blocked').length}</b> blocked</span></div><p className="next"><span>Next</span>{[...data.activities].filter(activity=>activity.project_id===project.id&&activity.status!=='completed').sort((a,b)=>a.due_date.localeCompare(b.due_date))[0]?.name||'No open activities'}</p></Link>)}</div></>;
}
