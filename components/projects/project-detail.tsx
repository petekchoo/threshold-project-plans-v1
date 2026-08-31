'use client';

import { useEffect, useState } from 'react';
import { ActivityPanel } from '../activities/activity-panel';
import { Heading } from '../shared/page-heading';
import { Pill } from '../shared/status-pill';
import { date } from '../../lib/planning/dates';
import type { Activity, AppData, Project } from '../../lib/planning/types';
import { supabase } from '../../lib/supabase';
import { ProjectActivityList } from './project-activity-list';
import { ProjectForm } from './project-form';
import { ProjectSchedule } from './project-schedule';

export function ProjectDetail({ project, activities, data, refresh, setToast, onNewActivity }: { project: Project; activities: Activity[]; data: AppData; refresh: () => void; setToast: (value: string) => void; onNewActivity: () => void }) {
  const [edit, setEdit] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const ordered = [...activities].sort((a, b) => a.due_date.localeCompare(b.due_date));
  const next = ordered.find((activity) => activity.status !== 'completed');

  useEffect(() => {
    if (!edit) return;
    const cancel = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.isComposing && !document.querySelector('[data-editor-child-modal="true"]')) setEdit(false);
    };
    document.addEventListener('keydown', cancel);
    return () => document.removeEventListener('keydown', cancel);
  }, [edit]);

  async function archiveProject() {
    if (!confirm(`Archive ${project.name} and all of its activities? The records will remain available through archived views.`)) return;
    const result = await supabase.rpc('archive_project', { p_project_id: project.id });
    if (result.error) setToast(result.error.message);
    else location.href = '/projects';
  }

  return <>{edit ? <><Heading eyebrow="Project settings" title={`Edit ${project.name}`} copy="Update the project details, then save or cancel your changes."/><ProjectForm initial={project} data={data} onCancel={()=>setEdit(false)} onSaved={()=>{setEdit(false);refresh();setToast('Project changes saved.')}}/></> : <><Heading eyebrow={`${project.project_types?.name||'Project'} · Active project`} title={project.name} copy={project.description||'No project brief has been added yet.'} action={<div className="heading-actions"><button className="secondary-btn" onClick={()=>setEdit(true)}>Edit project</button><button className="danger-btn" onClick={archiveProject}>Archive</button></div>}/><section className="detail-summary project-summary"><div><span>Status</span><Pill value={project.status}/></div><div><span>Dates</span><strong>{date(project.start_date)} — {date(project.end_date)}</strong></div><div><span>Activity progress</span><strong>{activities.filter(activity=>activity.status==='completed').length} of {activities.length} complete</strong></div><div className="project-summary-next"><span>Next due</span><strong>{next?`${date(next.due_date)} · ${next.name}`:'No open activities'}</strong></div></section><section className="portfolio-card project-schedule-card"><div className="section-head"><div><p className="eyebrow">Schedule</p><h2>Activity sequence</h2></div><button onClick={onNewActivity}>＋ New activity</button></div>{ordered.length?<ProjectSchedule project={project} activities={activities} onEdit={setEditingActivity}/>:<div className="empty-project"><strong>No activities yet</strong><p>Add the first activity to begin shaping this project’s operating plan.</p><button className="create-btn" onClick={onNewActivity}>＋ New activity</button></div>}</section><ProjectActivityList projectId={project.id} data={data} onNew={onNewActivity} onEdit={setEditingActivity}/></>}{editingActivity&&<ActivityPanel activity={editingActivity} data={data} onClose={()=>setEditingActivity(null)} onSaved={()=>{setEditingActivity(null);refresh();setToast('Activity changes saved.')}}/>}</>;
}
