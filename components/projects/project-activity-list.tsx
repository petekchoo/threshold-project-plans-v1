'use client';

import { date } from '../../lib/planning/dates';
import type { AppData, Activity } from '../../lib/planning/types';
import { ActivityFilterBar, useActivityFilters } from '../activities/activity-filters';
import { AvatarList } from '../shared/avatar-list';
import { Icon } from '../shared/icon';
import { Pill } from '../shared/status-pill';

export function ProjectActivityList({ projectId, data, onNew, onEdit }: { projectId: string; data: AppData; onNew: () => void; onEdit: (activity: Activity) => void }) {
  const filters = useActivityFilters(data, '', projectId);
  return <section className="project-activity-list">
    <div className="section-head"><div><p className="eyebrow">Project work</p><h2>Activities</h2></div><button className="quiet-btn" onClick={onNew}><Icon name="plus"/>Add activity</button></div>
    <ActivityFilterBar data={data} filters={filters}/>
    {filters.rows.length ? filters.rows.map((activity) => <button type="button" onClick={() => onEdit(activity)} className="project-activity-row" key={activity.id}>
      <div><strong>{activity.name}</strong><small>{activity.activity_types?.name || 'Activity'}{activity.archived_at ? ' · Archived' : ''}</small></div>
      <AvatarList owners={activity.activity_owners?.map((owner) => owner.team_members) || []}/><Pill value={activity.status}/><span>{date(activity.start_date)} — {date(activity.due_date)}</span>
    </button>) : <div className="filtered-empty" aria-live="polite"><strong>{filters.hasActiveFilters ? 'No activities match these filters.' : 'No activities yet.'}</strong><p>{filters.hasActiveFilters ? 'Clear the filters to see all activities in this project.' : 'Add an activity to begin planning the project work.'}</p>{filters.hasActiveFilters && <button type="button" className="secondary-btn" onClick={filters.clearFilters}>Clear filters</button>}</div>}
  </section>;
}
