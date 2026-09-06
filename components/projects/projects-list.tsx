'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AvatarList } from '../shared/avatar-list';
import { Heading } from '../shared/page-heading';
import { Pill } from '../shared/status-pill';
import { ProjectTile } from './project-tile';
import { addDays, date, isoDate } from '../../lib/planning/dates';
import type { AppData, Project } from '../../lib/planning/types';

const progress = (project: Project, activities: AppData['activities']) => {
  const rows = activities.filter((activity) => activity.project_id === project.id);
  return rows.length ? Math.round(rows.filter((activity) => activity.status === 'completed').length / rows.length * 100) : 0;
};

export function Projects({ data, query, onNew }: { data: AppData; query: string; onNew: () => void }) {
  const [search, setSearch] = useState(query);
  const [sort, setSort] = useState<'start_date' | 'end_date' | 'status' | 'name'>('start_date');
  const [status, setStatus] = useState('all');
  const [owner, setOwner] = useState('all');
  const [type, setType] = useState('all');
  const [endDate, setEndDate] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const today = isoDate(new Date());
  const weekEnd = addDays(today, 7);
  const source = showArchived ? [...data.projects, ...(data.archivedProjects || [])] : data.projects;
  const projects = source.filter((project) =>
    (project.name + (project.project_types?.name || '')).toLowerCase().includes(search.toLowerCase()) &&
    (status === 'all' || project.status === status) &&
    (type === 'all' || project.project_type_id === type) &&
    (owner === 'all' || (owner === 'unassigned' ? !project.project_owners?.length : project.project_owners?.some((item) => item.team_members.id === owner))) &&
    (endDate === 'all' || (endDate === 'ended' ? project.end_date < today : endDate === 'week' ? project.end_date >= today && project.end_date <= weekEnd : endDate === 'future' ? project.end_date > weekEnd : true)),
  ).sort((a, b) => String(a[sort]).localeCompare(String(b[sort])));
  const activeFilterCount = [status !== 'all', owner !== 'all', type !== 'all', endDate !== 'all', sort !== 'start_date', showArchived].filter(Boolean).length;
  const clearFilters = () => { setStatus('all'); setOwner('all'); setType('all'); setEndDate('all'); setSort('start_date'); setShowArchived(false); };

  return <>
    <Heading eyebrow="Planning portfolio" title="Projects" copy="Search, sort, and open every operating window." action={<button className="secondary-btn" onClick={onNew}>＋ Add project</button>}/>
    <div className={`filters project-filters ${filtersOpen ? 'filters-open' : 'filters-collapsed'}`}>
      <input className="filter-search" type="search" aria-label="Search projects" placeholder="Search projects" value={search} onChange={(event) => setSearch(event.target.value)}/>
      <button className="project-filter-toggle" type="button" aria-expanded={filtersOpen} aria-controls="project-filter-controls" onClick={() => setFiltersOpen(value => !value)}>Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}</button>
      <div className="project-filter-controls" id="project-filter-controls">
        <select aria-label="Filter projects by status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="draft">Draft</option><option value="on_track">On track</option><option value="at_risk">At risk</option><option value="blocked">Blocked</option><option value="completed">Completed</option></select>
        <select aria-label="Filter projects by team member" value={owner} onChange={(event) => setOwner(event.target.value)}><option value="all">All team members</option><option value="unassigned">Unassigned</option>{data.members.map(member => <option value={member.id} key={member.id}>{member.full_name}</option>)}</select>
        <select aria-label="Filter projects by type" value={type} onChange={(event) => setType(event.target.value)}><option value="all">All types</option>{data.projectTypes.map(row => <option value={row.id} key={row.id}>{row.name}</option>)}</select>
        <select aria-label="Filter projects by end date" value={endDate} onChange={(event) => setEndDate(event.target.value)}><option value="all">Any end date</option><option value="ended">Already ended</option><option value="week">Ending in 7 days</option><option value="future">Ending later</option></select>
        <select aria-label="Sort projects" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="start_date">Sort: Start</option><option value="end_date">Sort: End</option><option value="status">Sort: Status</option><option value="name">Sort: Name</option></select>
        <label className="filter-check"><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)}/> Archived</label>
        {activeFilterCount > 0 && <button className="project-filter-clear" type="button" onClick={clearFilters}>Clear filters</button>}
      </div>
      <span className="project-filter-count" aria-live="polite">{projects.length} projects</span>
    </div>
    <div className="table-card"><table><thead><tr><th>Project</th><th>Type</th><th>Status</th><th>Start</th><th>End</th><th>Progress</th><th>Overdue</th><th>Team members</th></tr></thead><tbody>{projects.map((project) => { const overdue = data.activities.filter((activity) => activity.project_id === project.id && activity.status !== 'completed' && activity.due_date < today).length; return <tr key={project.id}><td><Link href={`/projects/${project.id}`}><strong>{project.name}</strong></Link>{project.archived_at ? <small>Archived</small> : project.description ? <details className="project-description"><summary>Project brief</summary><p>{project.description}</p></details> : null}</td><td>{project.project_types?.name}</td><td><Pill value={project.status}/></td><td>{date(project.start_date)}</td><td>{date(project.end_date)}</td><td>{progress(project, data.activities)}%</td><td>{overdue}</td><td><AvatarList owners={project.project_owners?.map((owner) => owner.team_members) || []}/></td></tr>; })}</tbody></table></div>
    <div className="mobile-list">{projects.map((project) => <ProjectTile key={project.id} project={project} activities={data.activities}/>)}</div>
  </>;
}
