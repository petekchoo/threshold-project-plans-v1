'use client';

import { Pill } from '../shared/status-pill';
import Link from 'next/link';
import { date } from '../../lib/planning/dates';
import type { Activity } from '../../lib/planning/types';

export function ActivityAttentionList({ id, title, empty, activities, onEdit }: { id: string; title: string; empty: string; activities: Activity[]; onEdit: (activity: Activity) => void }) {
  const visible = activities.slice(0, 5);
  return <section className="overview-activity-list" id={id} tabIndex={-1}><div className="section-head"><h2>{title}</h2><strong>{activities.length}</strong></div>{visible.length ? visible.map(activity=><button type="button" className="overview-activity-row" onClick={()=>onEdit(activity)} key={activity.id}><span><strong>{activity.name}</strong><small>{activity.projects?.name||'Project'} · due {date(activity.due_date)}</small></span><Pill value={activity.status}/></button>) : <p className="overview-activity-empty">{empty}</p>}{activities.length > visible.length && <Link className="overview-activity-more" href="/activities">View all {activities.length} activities →</Link>}</section>;
}
