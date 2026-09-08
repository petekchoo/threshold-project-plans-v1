'use client';

import { Pill } from '../shared/status-pill';
import { date } from '../../lib/planning/dates';
import type { Activity } from '../../lib/planning/types';

export function ActivityAttentionList({ id, title, empty, activities, onEdit }: { id: string; title: string; empty: string; activities: Activity[]; onEdit: (activity: Activity) => void }) {
  return <section className="overview-activity-list" id={id} tabIndex={-1}><div className="section-head"><h2>{title}</h2><strong>{activities.length}</strong></div>{activities.length ? activities.map(activity=><button type="button" className="overview-activity-row" onClick={()=>onEdit(activity)} key={activity.id}><span><strong>{activity.name}</strong><small>{activity.projects?.name||'Project'} · due {date(activity.due_date)}</small></span><Pill value={activity.status}/></button>) : <p className="overview-activity-empty">{empty}</p>}</section>;
}
