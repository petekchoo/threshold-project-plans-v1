'use client';

import type { FormEvent } from 'react';
import { useRef, useState } from 'react';
import { TeamMemberPicker } from '../activities/team-member-picker';
import { FormActions } from '../shared/form-actions';
import type { AppData, AuthoritativeProjectReschedulePlan, Project } from '../../lib/planning/types';
import { supabase } from '../../lib/supabase';
import { ReschedulePreviewDialog } from './reschedule-preview-dialog';
import { ErrorSummary, FieldError, focusFirstInvalid, nativeFieldErrors, RequiredMark, validationProps, type FieldErrors } from '../shared/form-validation';

type ProjectPayload = { id: string|null; name: string; description: string; project_type_id: string|null; status: string; start_date: string; end_date: string };

const lockSetChanged = (message: string) => message.includes('PROJECT_SCHEDULE_LOCK_SET_CHANGED');
const scheduleBusy = (message: string) => message.includes('PROJECT_SCHEDULE_BUSY');

export function ProjectForm({ initial, data, onCancel, onSaved }: { initial?: Project; data: AppData; onCancel: () => void; onSaved: () => void }) {
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[previewError,setPreviewError]=useState(''),[preview,setPreview]=useState<AuthoritativeProjectReschedulePlan|null>(null),[pendingProject,setPendingProject]=useState<ProjectPayload|null>(null),[ownerIds,setOwnerIds]=useState<string[]>(initial?.project_owners?.map(owner=>owner.team_members.id)||[]);
  const [fieldErrors,setFieldErrors]=useState<FieldErrors>({});
  const formRef=useRef<HTMLFormElement>(null);
  const startInput=useRef<HTMLInputElement>(null);

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
    const nativeErrors=nativeFieldErrors(event.currentTarget);
    if(Object.keys(nativeErrors).length){setFieldErrors(nativeErrors);focusFirstInvalid(event.currentTarget,nativeErrors);return}
    const form=new FormData(event.currentTarget);
    const submittedStart=String(form.get('start')),submittedEnd=String(form.get('end'));
    if(submittedEnd<submittedStart){const errors={end:'End date must be on or after the start date.'};setFieldErrors(errors);focusFirstInvalid(event.currentTarget,errors);return}
    setFieldErrors({});
    const project:ProjectPayload={id:initial?.id||null,name:String(form.get('name')),description:String(form.get('description')||''),project_type_id:String(form.get('type')||'')||null,status:String(form.get('status')),start_date:submittedStart,end_date:submittedEnd};
    if(initial&&(submittedStart!==initial.start_date||submittedEnd!==initial.end_date)){await requestPreview(project);return}
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

  function applyContainingStart(value:string){if(startInput.current)startInput.current.value=value;setPreview(null);setPreviewError('')}

  return <><form ref={formRef} noValidate className="edit-form structured-form" onSubmit={submit}><ErrorSummary errors={fieldErrors} formRef={formRef}/><fieldset className="form-section"><legend>Project brief</legend><p>Name the operating window and capture the concise brief people need to understand it.</p><label htmlFor="name">Name<RequiredMark/><input id="name" name="name" required defaultValue={initial?.name} {...validationProps('name',fieldErrors)}/><FieldError name="name" errors={fieldErrors}/></label><label htmlFor="description">Description<textarea id="description" name="description" rows={3} defaultValue={initial?.description}/></label></fieldset><fieldset className="form-section"><legend>Classification and schedule</legend><p>Set the planning vocabulary, current health, and intentional project window.</p><div className="form-grid"><label htmlFor="type">Type<select id="type" name="type" defaultValue={initial?.project_type_id||initial?.project_types?.id}>{data.projectTypes.map(type=><option value={type.id} key={type.id}>{type.name}</option>)}</select></label><label htmlFor="status">Status<select id="status" name="status" defaultValue={initial?.status||'draft'}><option value="draft">Draft</option><option value="on_track">On Track</option><option value="at_risk">At Risk</option><option value="blocked">Blocked</option><option value="completed">Completed</option></select></label><label htmlFor="start">Start date<RequiredMark/><input ref={startInput} id="start" name="start" type="date" required defaultValue={initial?.start_date} {...validationProps('start',fieldErrors)}/><FieldError name="start" errors={fieldErrors}/></label><label htmlFor="end">End date<RequiredMark/><input id="end" name="end" type="date" required defaultValue={initial?.end_date} {...validationProps('end',fieldErrors)}/><FieldError name="end" errors={fieldErrors}/></label></div></fieldset><TeamMemberPicker members={data.members} selected={ownerIds} onChange={setOwnerIds} label="Project team members" copy="Select the team members assigned to this project."/>{error&&<p className="form-error" role="alert">{error}</p>}<FormActions busy={busy} onCancel={onCancel}/></form>{preview&&<ReschedulePreviewDialog plan={preview} activities={data.activities.filter(activity=>activity.project_id===initial?.id)} busy={busy} error={previewError} onCancel={()=>{if(!busy){setPreview(null);setPreviewError('')}}} onConfirm={()=>confirm()} onApplyContainingStart={applyContainingStart}/>}</>;
}
