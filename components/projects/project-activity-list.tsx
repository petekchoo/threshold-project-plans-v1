'use client';

import { ActivityFilterBar, useActivityFilters } from '../activities/activity-filters';
import { AvatarList } from '../shared/avatar-list';
import { Pill } from '../shared/status-pill';
import { date } from '../../lib/planning/dates';
import type { Activity, AppData } from '../../lib/planning/types';

export function ProjectActivityList({ projectId, data, onNew, onEdit }: { projectId: string; data: AppData; onNew: () => void; onEdit: (activity: Activity) => void }) {
  const filters = useActivityFilters(data, '', projectId);
  return <section className="project-activity-list"><div className="section-head"><div><p className="eyebrow">Project work</p><h2>Activities</h2></div><button onClick={onNew}>＋ Add activity</button></div><ActivityFilterBar data={data} filters={filters}/>{filters.rows.length ? filters.rows.map(activity=><button type="button" onClick={()=>onEdit(activity)} className="project-activity-row" key={activity.id}><div><strong>{activity.name}</strong><small>{activity.activity_types?.name||'Activity'}{activity.archived_at?' · Archived':''}</small></div><AvatarList owners={activity.activity_owners?.map(owner=>owner.team_members)||[]}/><Pill value={activity.status}/><span>{date(activity.start_date)} — {date(activity.due_date)}</span></button>) : <p className="filtered-empty">No activities match these filters.</p>}</section>;
}
