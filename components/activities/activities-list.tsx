'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AvatarList } from '../shared/avatar-list';
import { Heading } from '../shared/page-heading';
import { Pill } from '../shared/status-pill';
import { addDays, date, isoDate } from '../../lib/planning/dates';
import type { AppData } from '../../lib/planning/types';

export function ActivitiesList({ data, query, onNew }: { data: AppData; query: string; onNew: () => void }) {
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [owner, setOwner] = useState('all');
  const [type, setType] = useState('all');
  const [due, setDue] = useState('all');
  const [sort, setSort] = useState<'due_date' | 'start_date' | 'name' | 'status' | 'priority'>('due_date');
  const [showArchived, setShowArchived] = useState(false);
  const today = isoDate(new Date());
  const weekEnd = addDays(today, 7);
  const source = showArchived ? [...data.activities, ...(data.archivedActivities || [])] : data.activities;
  const rows = source
    .filter((activity) =>
      (activity.name + (activity.projects?.name || '')).toLowerCase().includes(query.toLowerCase()) &&
      (status === 'all' || activity.status === status) &&
      (priority === 'all' || activity.priority === priority) &&
      (type === 'all' || activity.activity_type_id === type) &&
      (owner === 'all' || (owner === 'unassigned' ? !activity.activity_owners?.length : activity.activity_owners?.some((item) => item.team_members.id === owner))) &&
      (due === 'all' || (due === 'overdue' ? activity.status !== 'completed' && activity.due_date < today : due === 'week' ? activity.status !== 'completed' && activity.due_date >= today && activity.due_date <= weekEnd : true)),
    )
    .sort((a, b) => String(a[sort]).localeCompare(String(b[sort])));

  return <><Heading eyebrow="Cross-project work" title="Activities" copy="Direct entry and management across every project." action={<button className="secondary-btn" onClick={onNew}>＋ New activity</button>}/><div className="filters activity-filters"><select value={status} onChange={event=>setStatus(event.target.value)}><option value="all">All statuses</option><option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="blocked">Blocked</option><option value="completed">Completed</option></select><select value={priority} onChange={event=>setPriority(event.target.value)}><option value="all">All priorities</option><option value="urgent">Urgent</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select><select value={owner} onChange={event=>setOwner(event.target.value)}><option value="all">All team members</option><option value="unassigned">Unassigned</option>{data.members.map(member=><option value={member.id} key={member.id}>{member.full_name}</option>)}</select><select value={type} onChange={event=>setType(event.target.value)}><option value="all">All types</option>{data.activityTypes.map(row=><option value={row.id} key={row.id}>{row.name}</option>)}</select><select value={due} onChange={event=>setDue(event.target.value)}><option value="all">Any due date</option><option value="overdue">Overdue</option><option value="week">Due in 7 days</option></select><select value={sort} onChange={event=>setSort(event.target.value as typeof sort)}><option value="due_date">Sort: Due</option><option value="start_date">Sort: Start</option><option value="name">Sort: Name</option><option value="status">Sort: Status</option><option value="priority">Sort: Priority</option></select><label className="filter-check"><input type="checkbox" checked={showArchived} onChange={event=>setShowArchived(event.target.checked)}/> Archived</label><span>{rows.length} activities</span></div><div className="table-card"><table><thead><tr><th>Activity</th><th>Project</th><th>Type</th><th>Team members</th><th>Status</th><th>Priority</th><th>Start</th><th>Due</th><th>Overdue</th></tr></thead><tbody>{rows.map(activity=><tr key={activity.id}><td><Link href={`/activities/${activity.id}`}><strong>{activity.name}</strong><small>{activity.archived_at?'Archived':''}</small></Link></td><td>{activity.projects?.name}</td><td>{activity.activity_types?.name}</td><td><AvatarList owners={activity.activity_owners?.map(item=>item.team_members)||[]}/></td><td><Pill value={activity.status}/></td><td><span className={`priority priority-${activity.priority}`}>{activity.priority}</span></td><td>{date(activity.start_date)}</td><td>{date(activity.due_date)}</td><td>{activity.status!=='completed'&&activity.due_date<today?'Overdue':'—'}</td></tr>)}</tbody></table></div><div className="mobile-list">{rows.map(activity=><Link className="activity-card" href={`/activities/${activity.id}`} key={activity.id}><small>{activity.projects?.name}</small><h3>{activity.name}</h3><div><Pill value={activity.status}/><span className={`priority priority-${activity.priority}`}>{activity.priority}</span></div><p>{date(activity.start_date)} — {date(activity.due_date)}</p></Link>)}</div></>;
}
