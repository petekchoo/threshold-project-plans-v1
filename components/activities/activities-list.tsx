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
  const { rows, today, hasActiveFilters, clearFilters } = filters;

  return <>
    <Heading eyebrow="Project work" title="Activities" copy="Plan and manage work across every project." action={<button className="secondary-btn" onClick={onNew}>＋ Add activity</button>}/>
    <ActivityFilterBar data={data} filters={filters} includeProject/>
    {rows.length ? <>
      <div className="table-card"><table><thead><tr><th>Activity</th><th>Project</th><th>Type</th><th>Team members</th><th>Status</th><th>Priority</th><th>Start</th><th>Due</th><th>Overdue</th></tr></thead><tbody>{rows.map(activity => <tr key={activity.id}><td><Link href={`/activities/${activity.id}`}><strong>{activity.name}</strong><small>{activity.archived_at ? 'Archived' : ''}</small></Link></td><td>{activity.projects?.name}</td><td>{activity.activity_types?.name}</td><td><AvatarList owners={activity.activity_owners?.map(item => item.team_members) || []}/></td><td><Pill value={activity.status}/></td><td><span className={`priority priority-${activity.priority}`}>{activity.priority}</span></td><td>{date(activity.start_date)}</td><td>{date(activity.due_date)}</td><td>{activity.status !== 'completed' && activity.due_date < today ? 'Overdue' : '—'}</td></tr>)}</tbody></table></div>
      <div className="mobile-list">{rows.map(activity => {
        const owners = activity.activity_owners?.map(item => item.team_members) || [];
        const overdue = activity.status !== 'completed' && activity.due_date < today;
        return <Link className="activity-card" href={`/activities/${activity.id}`} key={activity.id}>
          <div className="activity-card-heading"><small>{activity.projects?.name}</small>{overdue && <span className="activity-card-overdue">Overdue</span>}</div>
          <h3>{activity.name}</h3>
          <p className="activity-card-type">{activity.activity_types?.name || 'Activity'}</p>
          <div><Pill value={activity.status}/></div>
          <div className="activity-card-team"><span className="activity-card-label">Team members</span>{owners.length ? <AvatarList owners={owners}/> : <span>Unassigned</span>}</div>
          <p>{date(activity.start_date)} — {date(activity.due_date)}</p>
        </Link>;
      })}</div>
    </> : <section className="activity-list-empty" aria-live="polite"><strong>{hasActiveFilters ? 'No activities match these filters.' : 'No activities yet.'}</strong><p>{hasActiveFilters ? 'Clear the filters to see all available activities.' : 'Add the first activity to begin planning the work.'}</p>{hasActiveFilters ? <button type="button" className="secondary-btn" onClick={clearFilters}>Clear filters</button> : <button type="button" className="create-btn" onClick={onNew}>＋ Add activity</button>}</section>}
  </>;
}
