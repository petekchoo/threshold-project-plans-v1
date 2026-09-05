'use client';

import { handleModalKeyDown } from '../shared/modal-keyboard';
import { date } from '../../lib/planning/dates';
import type { Activity, AuthoritativeProjectReschedulePlan } from '../../lib/planning/types';

export function movementCopy(plan: AuthoritativeProjectReschedulePlan) {
  if (!plan.end_delta_days) return 'Activity dates remain in place.';
  const direction = plan.end_delta_days > 0 ? 'later' : 'earlier';
  const count = Math.abs(plan.end_delta_days);
  return `Activity dates move ${count} calendar ${count === 1 ? 'day' : 'days'} ${direction}.`;
}

export function windowCopy(plan: AuthoritativeProjectReschedulePlan) {
  if (plan.window_change === 'expand') return 'The project window expands; added planning space remains unused.';
  if (plan.window_change === 'compress') return 'The project window compresses without shortening activity durations or gaps.';
  if (plan.window_change === 'shift') return 'The project window shifts without changing its duration.';
  return 'The project window duration is unchanged.';
}

export function ReschedulePreviewDialog({ plan, activities, busy, error, onCancel, onConfirm, onApplyContainingStart }: {
  plan: AuthoritativeProjectReschedulePlan; activities: Activity[]; busy: boolean; error: string; onCancel: () => void; onConfirm: () => void; onApplyContainingStart: (value: string) => void;
}) {
  const mode = plan.mode === 'move_entire_schedule' ? 'Move entire schedule' : 'Reschedule remaining work';
  const activityById = new Map(activities.map(activity=>[activity.id,activity]));
  return <div className="picker-backdrop reschedule-preview-backdrop" data-editor-child-modal="true" onKeyDown={event=>handleModalKeyDown(event,{onSave:onConfirm,onCancel,canSave:plan.can_confirm&&!busy})} onClick={event=>{if(event.target===event.currentTarget&&!busy)onCancel()}}>
    <section className="reschedule-preview" role="dialog" aria-modal="true" aria-labelledby="reschedule-preview-title" aria-describedby="reschedule-preview-summary" tabIndex={-1} autoFocus>
      <div className="section-head"><div><p className="eyebrow">Review schedule change</p><h2 id="reschedule-preview-title">{mode}</h2></div><button type="button" className="modal-close" onClick={onCancel} disabled={busy} aria-label="Close schedule preview">×</button></div>
      <p id="reschedule-preview-summary" className="reschedule-summary">{movementCopy(plan)} {windowCopy(plan)}</p>
      <div className="reschedule-windows"><div><span>Original project window</span><strong>{date(plan.original_project_start_date)} — {date(plan.original_project_end_date)}</strong></div><div><span>Entered project window</span><strong>{date(plan.requested_project_start_date)} — {date(plan.requested_project_end_date)}</strong></div></div>
      {plan.earliest_containing_start_date&&<div className="reschedule-option"><p>The entered start does not contain the shifted activity schedule. The earliest containing start is <strong>{date(plan.earliest_containing_start_date)}</strong>.</p><button type="button" className="secondary-btn" onClick={()=>onApplyContainingStart(plan.earliest_containing_start_date!)}>Use this start date</button></div>}
      {plan.conflicts.length>0&&<section className="reschedule-conflicts" aria-labelledby="reschedule-conflicts-title"><h3 id="reschedule-conflicts-title">Resolve before saving</h3><ul>{plan.conflicts.map((conflict,index)=><li key={`${conflict.code}-${index}`}><strong>{conflict.code.replaceAll('_',' ')}</strong><span>{conflict.message}</span></li>)}</ul></section>}
      <section className="reschedule-activities" aria-labelledby="reschedule-activities-title"><h3 id="reschedule-activities-title">Activity schedule</h3>{plan.activity_changes.length?<div className="reschedule-activity-list">{plan.activity_changes.map(change=>{const activity=activityById.get(change.activity_id);return <article key={change.activity_id}><div><strong>{change.name}</strong><span>{change.disposition.replaceAll('_',' ')}</span>{activity?.project_timing_rule&&<small>{activity.project_timing_rule==='advance_deadline'?`Complete ${activity.project_timing_offset_days} days before project end`:`Complete within ${activity.project_timing_offset_days} days after project end`}</small>}{activity?.allow_outside_project&&<small>Approved project-date exception preserved</small>}</div><p><span>{date(change.original_start_date)} — {date(change.original_due_date)}</span><b aria-hidden="true">→</b><span>{date(change.proposed_start_date)} — {date(change.proposed_due_date)}</span></p></article>})}</div>:<p className="empty-state">This project has no active activities to move.</p>}</section>
      {error&&<p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><button type="button" className="secondary-btn" onClick={onCancel} disabled={busy}>Back to project</button><button type="button" className="create-btn" onClick={onConfirm} disabled={!plan.can_confirm||busy}>{busy?'Saving schedule…':'Confirm schedule'}</button></div>
    </section>
  </div>;
}
