'use client';

import { AvatarList } from '../shared/avatar-list';
import { Pill } from '../shared/status-pill';
import { date } from '../../lib/planning/dates';
import type { Activity } from '../../lib/planning/types';

export function ProjectActivityList({ activities, onNew, onEdit }: { activities: Activity[]; onNew: () => void; onEdit: (activity: Activity) => void }) {
  return <section className="project-activity-list"><div className="section-head"><div><p className="eyebrow">Project work</p><h2>Activities</h2></div><button onClick={onNew}>＋ Add activity</button></div>{activities.map(activity=><button type="button" onClick={()=>onEdit(activity)} className="project-activity-row" key={activity.id}><div><strong>{activity.name}</strong><small>{activity.activity_types?.name||'Activity'}</small></div><AvatarList owners={activity.activity_owners?.map(owner=>owner.team_members)||[]}/><Pill value={activity.status}/><span>{date(activity.start_date)} — {date(activity.due_date)}</span><b>Edit →</b></button>)}</section>;
}
