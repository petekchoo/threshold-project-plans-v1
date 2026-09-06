'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import type { AppData, ProjectTemplate, ProjectTemplateActivity, TemplateScheduleRule } from '../../lib/planning/types';
import { supabase } from '../../lib/supabase';
import { FormActions } from '../shared/form-actions';
import { RequiredMark } from '../shared/form-validation';

const activityRule = (rule:TemplateScheduleRule) => rule==='start_after_activity_finish'||rule==='finish_after_activity_finish';

export function TemplateActivityForm({template,data,initial,onCancel,onSaved}:{
  template:ProjectTemplate;data:AppData;initial?:ProjectTemplateActivity;onCancel:()=>void;onSaved:(id:string)=>void;
}){
  const [rule,setRule]=useState<TemplateScheduleRule>(initial?.schedule_rule||'finish_before_project_end');
  const [reference,setReference]=useState(initial?.relative_activity_id||'');
  const [createdReferenceId,setCreatedReferenceId]=useState('');
  const [creatingReference,setCreatingReference]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const candidates=template.activities.filter(activity=>activity.id!==initial?.id);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setError('');
    if(activityRule(rule)&&!reference){setError('Choose or create the referenced template activity.');return;}
    setBusy(true);const form=new FormData(event.currentTarget);
    const result=await supabase.rpc('save_project_template_activity',{p_activity:{
      id:initial?.id||null,template_id:template.id,name:String(form.get('name')),
      activity_type_id:String(form.get('type')),schedule_rule:rule,
      offset_days:Number(form.get('offset')),duration_days:Number(form.get('duration')),
      relative_activity_id:activityRule(rule)?reference:null,
      sort_order:initial?.sort_order??template.activities.length,
    }});
    setBusy(false);if(result.error)setError(result.error.message);else onSaved(result.data);
  }
  return <>
    <form className="edit-form structured-form" onSubmit={submit}>
      <fieldset className="form-section"><legend>Activity details</legend>
        <label htmlFor="template-activity-name">Name<RequiredMark/><input id="template-activity-name" name="name" required defaultValue={initial?.name}/></label>
        <label htmlFor="template-activity-type">Activity type<RequiredMark/><select id="template-activity-type" name="type" required defaultValue={initial?.activity_type_id||data.activityTypes[0]?.id}>{data.activityTypes.map(type=><option value={type.id} key={type.id}>{type.name}</option>)}</select></label>
      </fieldset>
      <fieldset className="form-section"><legend>Schedule</legend><p>Choose the rule first, then its offset and the activity duration. Zero means the same calendar date.</p>
        <label htmlFor="template-rule">Rule<RequiredMark/><select id="template-rule" name="rule" value={rule} onChange={event=>setRule(event.target.value as TemplateScheduleRule)}><option value="finish_before_project_end">Finish before project end</option><option value="finish_after_project_end">Finish after project end</option><option value="start_after_activity_finish">Start after another activity finishes</option><option value="finish_after_activity_finish">Finish after another activity finishes</option></select></label>
        {activityRule(rule)&&<div className="template-reference"><label htmlFor="template-reference">Referenced activity<RequiredMark/><select id="template-reference" value={reference} onChange={event=>setReference(event.target.value)} required><option value="">Choose activity</option>{createdReferenceId&&!candidates.some(activity=>activity.id===createdReferenceId)&&<option value={createdReferenceId}>New template activity</option>}{candidates.map(activity=><option key={activity.id} value={activity.id}>{activity.name}</option>)}</select></label><button type="button" className="secondary-btn" onClick={()=>setCreatingReference(true)}>＋ Create activity</button></div>}
        <label htmlFor="template-offset">Offset in calendar days<RequiredMark/><input id="template-offset" name="offset" type="number" min={rule==='finish_after_project_end'?1:0} step="1" required defaultValue={initial?.offset_days??(rule==='finish_after_project_end'?1:0)}/></label>
        <label htmlFor="template-duration">Duration in calendar days<RequiredMark/><input id="template-duration" name="duration" type="number" min="0" step="1" required defaultValue={initial?.duration_days??0}/><small>Use 0 when the activity starts and finishes on the same date.</small></label>
      </fieldset>
      {error&&<p className="form-error" role="alert">{error}</p>}<FormActions busy={busy} onCancel={onCancel}/>
    </form>
    {creatingReference&&<div className="modal-backdrop nested-modal"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="inline-activity-title"><button className="modal-close" onClick={()=>setCreatingReference(false)} aria-label="Close">×</button><p className="eyebrow">Add reference</p><h1 id="inline-activity-title">Create template activity</h1><TemplateActivityForm template={template} data={data} onCancel={()=>setCreatingReference(false)} onSaved={id=>{setCreatedReferenceId(id);setReference(id);setCreatingReference(false)}}/></div></div>}
  </>;
}
