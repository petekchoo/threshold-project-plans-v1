'use client';

import Link from 'next/link';
import { AvatarList } from '../shared/avatar-list';
import { Heading } from '../shared/page-heading';
import { Pill } from '../shared/status-pill';
import { date } from '../../lib/planning/dates';
import type { AppData } from '../../lib/planning/types';
import { ActivityFilterBar, useActivityFilters } from './activity-filters';

export function ActivitiesList({ data, query, onNew }: { data: AppData; query: string; onNew: () => void }) {
  const filters = useActivityFilters(data, query);
  const { rows, today } = filters;

  return <><Heading eyebrow="Cross-project work" title="Activities" copy="Direct entry and management across every project." action={<button className="secondary-btn" onClick={onNew}>＋ New activity</button>}/><ActivityFilterBar data={data} filters={filters} includeProject/><div className="table-card"><table><thead><tr><th>Activity</th><th>Project</th><th>Type</th><th>Team members</th><th>Status</th><th>Priority</th><th>Start</th><th>Due</th><th>Overdue</th></tr></thead><tbody>{rows.map(activity=><tr key={activity.id}><td><Link href={`/activities/${activity.id}`}><strong>{activity.name}</strong><small>{activity.archived_at?'Archived':''}</small></Link></td><td>{activity.projects?.name}</td><td>{activity.activity_types?.name}</td><td><AvatarList owners={activity.activity_owners?.map(item=>item.team_members)||[]}/></td><td><Pill value={activity.status}/></td><td><span className={`priority priority-${activity.priority}`}>{activity.priority}</span></td><td>{date(activity.start_date)}</td><td>{date(activity.due_date)}</td><td>{activity.status!=='completed'&&activity.due_date<today?'Overdue':'—'}</td></tr>)}</tbody></table></div><div className="mobile-list">{rows.map(activity=><Link className="activity-card" href={`/activities/${activity.id}`} key={activity.id}><small>{activity.projects?.name}</small><h3>{activity.name}</h3><div><Pill value={activity.status}/><span className={`priority priority-${activity.priority}`}>{activity.priority}</span></div><p>{date(activity.start_date)} — {date(activity.due_date)}</p></Link>)}</div></>;
}
