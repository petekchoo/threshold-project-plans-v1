'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { TeamMemberPicker } from '../activities/team-member-picker';
import { FormActions } from '../shared/form-actions';
import type { AppData, AuthoritativeProjectReschedulePlan, Project } from '../../lib/planning/types';
import { supabase } from '../../lib/supabase';
import { ReschedulePreviewDialog } from './reschedule-preview-dialog';

type ProjectPayload = { id: string|null; name: string; description: string; project_type_id: string|null; status: string; start_date: string; end_date: string };

const lockSetChanged = (message: string) => message.includes('PROJECT_SCHEDULE_LOCK_SET_CHANGED');
const scheduleBusy = (message: string) => message.includes('PROJECT_SCHEDULE_BUSY');

export function ProjectForm({ initial, data, onCancel, onSaved }: { initial?: Project; data: AppData; onCancel: () => void; onSaved: () => void }) {
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[previewError,setPreviewError]=useState(''),[preview,setPreview]=useState<AuthoritativeProjectReschedulePlan|null>(null),[pendingProject,setPendingProject]=useState<ProjectPayload|null>(null),[ownerIds,setOwnerIds]=useState<string[]>(initial?.project_owners?.map(owner=>owner.team_members.id)||[]),[start,setStart]=useState(initial?.start_date||''),[end,setEnd]=useState(initial?.end_date||'');

  async function requestPreview(project: ProjectPayload) {
    if (!initial) return;
    setBusy(true);
    const result=await supabase.rpc('preview_project_reschedule',{p_project_id:initial.id,p_new_start:project.start_date,p_new_end:project.end_date});
    setBusy(false);
    if(result.error||!result.data){setError(result.error?.message||'The schedule preview could not be loaded.');return}
    setPendingProject(project);setPreviewError('');setPreview(result.data as unknown as AuthoritativeProjectReschedulePlan);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();setError('');
    const form=new FormData(event.currentTarget);
    if(end<start){setError('End date must be on or after the start date.');return}
    const project:ProjectPayload={id:initial?.id||null,name:String(form.get('name')),description:String(form.get('description')||''),project_type_id:String(form.get('type')||'')||null,status:String(form.get('status')),start_date:start,end_date:end};
    if(initial&&(start!==initial.start_date||end!==initial.end_date)){await requestPreview(project);return}
    setBusy(true);
    const result=await supabase.rpc('save_project',{p_project:project,p_owner_ids:ownerIds});
    setBusy(false);
    if(result.error)setError(result.error.message);else onSaved();
  }

  async function confirm(attempt=0) {
    if(!preview||!pendingProject||busy)return;
    setBusy(true);setPreviewError('');
    const result=await supabase.rpc('reschedule_project',{p_project:pendingProject,p_owner_ids:ownerIds,p_expected_schedule_fingerprint:preview.schedule_fingerprint});
    if(result.error&&lockSetChanged(result.error.message)&&attempt<2){
      await new Promise(resolve=>setTimeout(resolve,75+Math.floor(Math.random()*126)));
      setBusy(false);return confirm(attempt+1);
    }
    if(result.error){
      if(result.error.message.includes('schedule changed after preview')){
        const refreshed=await supabase.rpc('preview_project_reschedule',{p_project_id:initial!.id,p_new_start:pendingProject.start_date,p_new_end:pendingProject.end_date});
        setBusy(false);
        if(refreshed.error){setPreviewError(refreshed.error.message);return}
        setPreview(refreshed.data as unknown as AuthoritativeProjectReschedulePlan);
        setPreviewError('The schedule changed after your preview. Review the refreshed details before confirming again.');return;
      }
      setBusy(false);
      setPreviewError(scheduleBusy(result.error.message)?'The project schedule is busy with another update. Wait a moment and try again.':result.error.message);return;
    }
    setBusy(false);onSaved();
  }

  function applyContainingStart(value:string){setStart(value);setPreview(null);setPreviewError('')}

  return <><form className="edit-form structured-form" onSubmit={submit}><fieldset className="form-section"><legend>Project brief</legend><p>Name the operating window and capture the concise brief people need to understand it.</p><label>Name<input name="name" required defaultValue={initial?.name}/></label><label>Description<textarea name="description" rows={3} defaultValue={initial?.description}/></label></fieldset><fieldset className="form-section"><legend>Classification and schedule</legend><p>Set the planning vocabulary, current health, and intentional project window.</p><div className="form-grid"><label>Type<select name="type" defaultValue={initial?.project_type_id||initial?.project_types?.id}>{data.projectTypes.map(type=><option value={type.id} key={type.id}>{type.name}</option>)}</select></label><label>Status<select name="status" defaultValue={initial?.status||'draft'}><option value="draft">Draft</option><option value="on_track">On Track</option><option value="at_risk">At Risk</option><option value="blocked">Blocked</option><option value="completed">Completed</option></select></label><label>Start date<input name="start" type="date" required value={start} onChange={event=>setStart(event.target.value)}/></label><label>End date<input name="end" type="date" required value={end} onChange={event=>setEnd(event.target.value)}/></label></div></fieldset><TeamMemberPicker members={data.members} selected={ownerIds} onChange={setOwnerIds} label="Project team members" copy="Select the team members assigned to this project."/>{error&&<p className="form-error" role="alert">{error}</p>}<FormActions busy={busy} onCancel={onCancel}/></form>{preview&&<ReschedulePreviewDialog plan={preview} activities={data.activities.filter(activity=>activity.project_id===initial?.id)} busy={busy} error={previewError} onCancel={()=>{if(!busy){setPreview(null);setPreviewError('')}}} onConfirm={()=>confirm()} onApplyContainingStart={applyContainingStart}/>}</>;
}
