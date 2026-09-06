'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AvatarList } from '../shared/avatar-list';
import { Heading } from '../shared/page-heading';
import { Pill, statusLabel } from '../shared/status-pill';
import { date } from '../../lib/planning/dates';
import type { Activity, AppData } from '../../lib/planning/types';
import { ActivityForm } from './activity-form';

export function ActivityDetail({ activity, data, refresh, setToast }: { activity: Activity; data: AppData; refresh: () => void; setToast: (value: string) => void }) {
  const [edit, setEdit] = useState(false);
  if (edit) return <><Heading eyebrow="Activity settings" title={`Edit ${activity.name}`} copy="Update the work, schedule, and prerequisite relationships, then save or cancel."/><ActivityForm initial={activity} data={data} onCancel={() => setEdit(false)} onSaved={() => { setEdit(false); refresh(); setToast('Activity changes saved.'); }}/></>;

  return <>
    <Heading eyebrow={`${activity.projects?.name || 'Project'} · Activity`} title={activity.name} copy="Schedule context, accountability, notes, and prerequisite relationships." action={<button className="secondary-btn" onClick={() => setEdit(true)}>Edit activity</button>}/>
    <section className="detail-summary activity-summary">
      <div><span>Status</span><Pill value={activity.status}/></div>
      <div><span>Type</span><strong>{activity.activity_types?.name || '—'}</strong></div>
      <div><span>Priority</span><strong>{statusLabel(activity.priority)}</strong></div>
      <div><span>Dates</span><strong>{date(activity.start_date)} — {date(activity.due_date)}</strong></div>
    </section>
    <div className="activity-workspace">
      <div>
        <section className="focus-timeline">
          <div className="section-head"><div><p className="eyebrow">Schedule</p><h2>Project context</h2></div></div>
          <div><strong>{activity.projects?.name}</strong><i className="project-line"/></div>
          <div><strong>{activity.name}</strong><i className={`activity-line status-${activity.status}`}/></div>
        </section>
        <section className="activity-detail notes-panel"><article><p className="eyebrow">Working notes</p><h2>Notes</h2><p>{activity.notes || 'No notes added.'}</p></article></section>
      </div>
      <aside className="relations-panel">
        <article><p className="eyebrow">Relationships</p><h2>Prerequisites</h2>{activity.activity_dependencies?.length ? activity.activity_dependencies.map(dependency => {
          const prerequisite = data.activities.find(candidate => candidate.id === dependency.depends_on_activity_id);
          return <Link className="relationship-link" key={dependency.id || dependency.depends_on_activity_id} href={`/activities/${dependency.depends_on_activity_id}`}><strong>{prerequisite?.name || 'Archived activity'}</strong><small>{statusLabel(dependency.constraint_type)} · due {prerequisite ? date(prerequisite.due_date) : '—'}</small><span>→</span></Link>;
        }) : <p>No prerequisites assigned.</p>}</article>
        <article><p className="eyebrow">References</p><h2>External links</h2>{activity.activity_links?.length ? activity.activity_links.map(link => <a className="relationship-link" key={link.id} href={link.url} target="_blank" rel="noreferrer"><strong>{link.label || link.url}</strong><span>↗</span></a>) : <p>No links added.</p>}</article>
        <article><p className="eyebrow">Accountability</p><h2>Team members</h2><AvatarList owners={activity.activity_owners?.map(owner => owner.team_members) || []}/></article>
      </aside>
    </div>
  </>;
}
