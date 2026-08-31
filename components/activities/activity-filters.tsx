'use client';

import { useState } from 'react';
import { addDays, isoDate } from '../../lib/planning/dates';
import type { AppData } from '../../lib/planning/types';

type ActivitySort = 'due_date' | 'start_date' | 'name' | 'status' | 'priority';

export function useActivityFilters(data: AppData, initialQuery = '', fixedProjectId?: string) {
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [owner, setOwner] = useState('all');
  const [type, setType] = useState('all');
  const [project, setProject] = useState('all');
  const [due, setDue] = useState('all');
  const [sort, setSort] = useState<ActivitySort>('due_date');
  const [showArchived, setShowArchived] = useState(false);
  const today = isoDate(new Date());
  const weekEnd = addDays(today, 7);
  const source = showArchived ? [...data.activities, ...(data.archivedActivities || [])] : data.activities;
  const rows = source.filter((activity) =>
    (activity.name + (activity.projects?.name || '')).toLowerCase().includes(query.toLowerCase()) &&
    (!fixedProjectId || activity.project_id === fixedProjectId) &&
    (fixedProjectId || project === 'all' || activity.project_id === project) &&
    (status === 'all' || activity.status === status) &&
    (priority === 'all' || activity.priority === priority) &&
    (type === 'all' || activity.activity_type_id === type) &&
    (owner === 'all' || (owner === 'unassigned' ? !activity.activity_owners?.length : activity.activity_owners?.some((item) => item.team_members.id === owner))) &&
    (due === 'all' || (due === 'overdue' ? activity.status !== 'completed' && activity.due_date < today : due === 'week' ? activity.status !== 'completed' && activity.due_date >= today && activity.due_date <= weekEnd : true)),
  ).sort((a, b) => String(a[sort]).localeCompare(String(b[sort])));

  return { rows, query, setQuery, status, setStatus, priority, setPriority, owner, setOwner, type, setType, project, setProject, due, setDue, sort, setSort, showArchived, setShowArchived, today };
}

export function ActivityFilterBar({ data, filters, includeProject = false }: { data: AppData; filters: ReturnType<typeof useActivityFilters>; includeProject?: boolean }) {
  const projects = filters.showArchived ? [...data.projects, ...(data.archivedProjects || [])] : data.projects;
  return <div className="filters activity-filters"><input className="filter-search" type="search" aria-label="Search activities" placeholder="Search activities" value={filters.query} onChange={event=>filters.setQuery(event.target.value)}/><select aria-label="Filter by status" value={filters.status} onChange={event=>filters.setStatus(event.target.value)}><option value="all">All statuses</option><option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="blocked">Blocked</option><option value="completed">Completed</option></select><select aria-label="Filter by priority" value={filters.priority} onChange={event=>filters.setPriority(event.target.value)}><option value="all">All priorities</option><option value="urgent">Urgent</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select>{includeProject&&<select aria-label="Filter by project" value={filters.project} onChange={event=>filters.setProject(event.target.value)}><option value="all">All projects</option>{projects.map(project=><option value={project.id} key={project.id}>{project.name}{project.archived_at?' (Archived)':''}</option>)}</select>}<select aria-label="Filter by team member" value={filters.owner} onChange={event=>filters.setOwner(event.target.value)}><option value="all">All team members</option><option value="unassigned">Unassigned</option>{data.members.map(member=><option value={member.id} key={member.id}>{member.full_name}</option>)}</select><select aria-label="Filter by activity type" value={filters.type} onChange={event=>filters.setType(event.target.value)}><option value="all">All types</option>{data.activityTypes.map(row=><option value={row.id} key={row.id}>{row.name}</option>)}</select><select aria-label="Filter by due date" value={filters.due} onChange={event=>filters.setDue(event.target.value)}><option value="all">Any due date</option><option value="overdue">Overdue</option><option value="week">Due in 7 days</option></select><select aria-label="Sort activities" value={filters.sort} onChange={event=>filters.setSort(event.target.value as ActivitySort)}><option value="due_date">Sort: Due</option><option value="start_date">Sort: Start</option><option value="name">Sort: Name</option><option value="status">Sort: Status</option><option value="priority">Sort: Priority</option></select><label className="filter-check"><input type="checkbox" checked={filters.showArchived} onChange={event=>filters.setShowArchived(event.target.checked)}/> Archived</label><span>{filters.rows.length} activities</span></div>;
}
