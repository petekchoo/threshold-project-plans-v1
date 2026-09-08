'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AvatarList } from '../shared/avatar-list';
import { Heading } from '../shared/page-heading';
import { Pill, statusLabel } from '../shared/status-pill';
import { date } from '../../lib/planning/dates';
import type { Activity, AppData } from '../../lib/planning/types';
import { supabase } from '../../lib/supabase';
import { ActivityForm } from './activity-form';
import { ActivityContextTimeline } from './activity-context-timeline';

export function ActivityDetail({ activity, data, refresh, setToast }: { activity: Activity; data: AppData; refresh: () => void; setToast: (value: string) => void }) {
  const [edit, setEdit] = useState(false);
  const archived = Boolean(activity.archived_at);
  const dependents = data.activities.filter(candidate => (candidate.activity_dependencies || []).some(dependency => dependency.depends_on_activity_id === activity.id));
  const timing = activity.project_timing_rule === 'advance_deadline'
    ? `Finish at least ${activity.project_timing_offset_days ?? 0} calendar days before project end.`
    : activity.project_timing_rule === 'post_project_deadline'
      ? `Finish after project end and within ${activity.project_timing_offset_days ?? 0} calendar days.`
      : null;
  async function archiveActivity() {
    const impact = dependents.length ? `\n\nThe following downstream activities remain active, but their relationships to this activity will be archived:\n${dependents.map(item=>`• ${item.name}`).join('\n')}` : '';
    if (!confirm(`Archive ${activity.name}? The record will remain available through archived views.${impact}`)) return;
    const result = await supabase.rpc('archive_activity', { p_activity_id: activity.id });
    if (result.error) setToast(result.error.message);
    else location.href = '/activities';
  }
  if (edit) return <><Heading eyebrow="Activity settings" title={`Edit ${activity.name}`} copy="Update the work, schedule, and prerequisite relationships, then save or cancel."/><ActivityForm initial={activity} data={data} onCancel={() => setEdit(false)} onSaved={() => { setEdit(false); refresh(); setToast('Activity changes saved.'); }}/></>;

  return <>
    <Heading eyebrow={`${activity.projects?.name || 'Project'} · ${archived ? 'Archived activity' : 'Activity'}`} title={activity.name} copy="Schedule context, accountability, notes, and prerequisite relationships." action={archived ? undefined : <div className="heading-actions"><button className="secondary-btn" onClick={() => setEdit(true)}>Edit activity</button><button className="danger-btn" onClick={archiveActivity}>Archive</button></div>}/>
    <section className="detail-summary activity-summary">
      <div><span>Status</span><Pill value={activity.status}/></div>
      <div><span>Type</span><strong>{activity.activity_types?.name || '—'}</strong></div>
      <div><span>Priority</span><strong>{statusLabel(activity.priority)}</strong></div>
      <div><span>Dates</span><strong>{date(activity.start_date)} — {date(activity.due_date)}</strong></div>
    </section>
    <div className="activity-workspace">
      <div>
        <ActivityContextTimeline activity={activity} data={data}/>
        <section className="activity-detail notes-panel"><article><p className="eyebrow">Working notes</p><h2>Notes</h2><p>{activity.notes || 'No notes added.'}</p></article></section>
      </div>
      <aside className="relations-panel">
        {timing&&<article><p className="eyebrow">Project timing</p><h2>Schedule rule</h2><p>{timing}</p></article>}
        <article><p className="eyebrow">Relationships</p><h2>Prerequisites</h2>{activity.activity_dependencies?.length ? activity.activity_dependencies.map(dependency => {
          const prerequisite = [...data.activities,...(data.archivedActivities||[])].find(candidate => candidate.id === dependency.depends_on_activity_id);
          return <Link className="relationship-link" key={dependency.id || dependency.depends_on_activity_id} href={`/activities/${dependency.depends_on_activity_id}`}><strong>{prerequisite?.name || 'Archived activity'}</strong><small>{statusLabel(dependency.constraint_type)} · due {prerequisite ? date(prerequisite.due_date) : '—'}</small><span>→</span></Link>;
        }) : <p>No prerequisites assigned.</p>}</article>
        <article><p className="eyebrow">Relationships</p><h2>Used by</h2>{dependents.length ? dependents.map(dependent => <Link className="relationship-link" key={dependent.id} href={`/activities/${dependent.id}`}><strong>{dependent.name}</strong><small>Depends on this activity</small><span>→</span></Link>) : <p>No dependent activities.</p>}</article>
        <article><p className="eyebrow">Accountability</p><h2>Team members</h2><AvatarList owners={activity.activity_owners?.map(owner => owner.team_members) || []}/></article>
      </aside>
    </div>
    <section className="activity-detail activity-links"><article><p className="eyebrow">References</p><h2>External links</h2>{activity.activity_links?.length ? activity.activity_links.map(link => <a className="relationship-link" key={link.id} href={link.url} target="_blank" rel="noreferrer"><strong>{link.label || link.url}</strong><span>↗</span></a>) : <p>No links added.</p>}</article></section>
  </>;
}
