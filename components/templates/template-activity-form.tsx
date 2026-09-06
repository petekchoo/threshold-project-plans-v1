'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import type { AppData, ProjectTemplate, ProjectTemplateActivity, ProjectTemplateActivityRule, TemplateScheduleRule } from '../../lib/planning/types';
import { supabase } from '../../lib/supabase';
import { FormActions } from '../shared/form-actions';
import { RequiredMark } from '../shared/form-validation';

const activityRule = (rule:TemplateScheduleRule) => rule==='start_after_activity_finish'||rule==='finish_after_activity_finish';
const labels:Record<TemplateScheduleRule,string>={finish_before_project_end:'Finish before project end',finish_after_project_end:'Finish after project end',start_after_activity_finish:'Start after another activity finishes',finish_after_activity_finish:'Finish after another activity finishes'};
type DraftRule=ProjectTemplateActivityRule;
let nextTemporaryRuleId=0;
const temporaryRuleId=()=>`new-rule-${++nextTemporaryRuleId}`;

export function TemplateActivityForm({template,data,initial,onCancel,onSaved,onOpenActivity}:{
  template:ProjectTemplate;data:AppData;initial?:ProjectTemplateActivity;onCancel:()=>void;onSaved:(id:string,name?:string)=>void;onOpenActivity?:(activity:ProjectTemplateActivity)=>void;
}){
  const [rules,setRules]=useState<DraftRule[]>(initial?.rules||[]);
  const [editingRule,setEditingRule]=useState<DraftRule|null>(null);
  const [createdReferences,setCreatedReferences]=useState<{id:string;name:string}[]>([]);
  const [creatingReference,setCreatingReference]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const candidates=[...template.activities.filter(activity=>activity.id!==initial?.id),...createdReferences.filter(created=>!template.activities.some(activity=>activity.id===created.id))];
  const incoming=initial?template.activities.flatMap(activity=>activity.rules.filter(rule=>rule.relative_activity_id===initial.id).map(rule=>({activity,rule}))):[];
  const addRule=()=>setEditingRule({id:temporaryRuleId(),template_activity_id:initial?.id||'',schedule_rule:'finish_before_project_end',offset_days:0,relative_activity_id:null,sort_order:rules.length});
  function saveRule(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!editingRule)return;
    const offset=Number(new FormData(event.currentTarget).get('offset'));
    if(activityRule(editingRule.schedule_rule)&&!editingRule.relative_activity_id){setError('Choose or create the referenced template activity.');return;}
    const savedRule={...editingRule,offset_days:offset};
    setRules(current=>[...current.filter(rule=>rule.id!==editingRule.id),savedRule].sort((a,b)=>a.sort_order-b.sort_order));
    setEditingRule(null);setError('');
  }
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setError('');setBusy(true);const form=new FormData(event.currentTarget);
    const result=await supabase.rpc('save_project_template_activity',{p_activity:{
      id:initial?.id||null,template_id:template.id,name:String(form.get('name')),
      activity_type_id:String(form.get('type')),duration_days:Number(form.get('duration')),
      sort_order:initial?.sort_order??template.activities.length,
      rules:rules.map((rule,index)=>({id:rule.id.startsWith('new-rule-')?null:rule.id,schedule_rule:rule.schedule_rule,offset_days:rule.offset_days,relative_activity_id:activityRule(rule.schedule_rule)?rule.relative_activity_id:null,sort_order:index})),
    }});
    setBusy(false);if(result.error)setError(result.error.message);else onSaved(result.data,String(form.get('name')).trim());
  }
  return <>
    <form className="edit-form structured-form" onSubmit={submit}>
      <fieldset className="form-section"><legend>Activity details</legend>
        <label htmlFor="template-activity-name">Name<RequiredMark/><input id="template-activity-name" name="name" required defaultValue={initial?.name}/></label>
        <label htmlFor="template-activity-type">Activity type<RequiredMark/><select id="template-activity-type" name="type" required defaultValue={initial?.activity_type_id||data.activityTypes[0]?.id}>{data.activityTypes.map(type=><option value={type.id} key={type.id}>{type.name}</option>)}</select></label>
        <label htmlFor="template-duration">Duration in calendar days<RequiredMark/><input id="template-duration" name="duration" type="number" min="1" step="1" required defaultValue={initial?.duration_days??1}/><small>One day starts and finishes on the same date.</small></label>
      </fieldset>
      <fieldset className="form-section"><legend>Schedule</legend><p>Add every rule this activity must satisfy.</p>
        <div className="template-rule-list">{rules.map(rule=>{const reference=candidates.find(activity=>activity.id===rule.relative_activity_id);return <div className="template-rule-row" key={rule.id}><button type="button" className="link-button" onClick={()=>setEditingRule(rule)}><strong>{labels[rule.schedule_rule]}</strong><small>{rule.offset_days} {rule.offset_days===1?'day':'days'}{rule.relative_activity_id?` · ${reference?.name||'New template activity'}`:''}</small></button><button type="button" className="template-rule-remove" aria-label={`Remove ${labels[rule.schedule_rule]} rule`} onClick={()=>setRules(current=>current.filter(item=>item.id!==rule.id))}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"/></svg></button></div>})}</div>
        {!rules.length&&!editingRule&&<p className="schedule-empty">No schedule rules yet.</p>}
        {!editingRule&&<button type="button" className="secondary-btn" onClick={addRule}>＋ Add schedule rule</button>}
      </fieldset>
      {incoming.length>0&&<fieldset className="form-section incoming-template-rules"><legend>Targeted by other activities</legend><p>These relationships are managed from the associated activity.</p><div className="template-rule-list">{incoming.map(({activity,rule})=><button type="button" className="template-rule-row incoming-template-rule" key={rule.id} onClick={()=>onOpenActivity?.(activity)}><span><strong>{activity.name}</strong><small>{rule.schedule_rule==='start_after_activity_finish'?'Can’t start':'Can’t finish'} until this activity is complete · {rule.offset_days} {rule.offset_days===1?'day':'days'} offset</small></span><span aria-hidden="true">›</span></button>)}</div></fieldset>}
      {error&&<p className="form-error" role="alert">{error}</p>}<FormActions busy={busy} onCancel={onCancel}/>
    </form>
    {editingRule&&<div className="modal-backdrop nested-modal"><form className="modal edit-form structured-form" role="dialog" aria-modal="true" aria-labelledby="schedule-rule-title" onSubmit={saveRule}><button type="button" className="modal-close" onClick={()=>setEditingRule(null)} aria-label="Close">×</button><p className="eyebrow">Schedule</p><h1 id="schedule-rule-title">Schedule rule</h1><fieldset className="form-section"><label htmlFor="template-rule">Rule<RequiredMark/><select id="template-rule" value={editingRule.schedule_rule} onChange={event=>setEditingRule({...editingRule,schedule_rule:event.target.value as TemplateScheduleRule,relative_activity_id:activityRule(event.target.value as TemplateScheduleRule)?editingRule.relative_activity_id:null,offset_days:event.target.value==='finish_after_project_end'&&editingRule.offset_days<1?1:editingRule.offset_days})}>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>{activityRule(editingRule.schedule_rule)&&<div className="template-reference"><label htmlFor="template-reference">Activity<RequiredMark/><select id="template-reference" value={editingRule.relative_activity_id||''} onChange={event=>setEditingRule({...editingRule,relative_activity_id:event.target.value})} required><option value="">Choose activity</option>{candidates.map(activity=><option key={activity.id} value={activity.id}>{activity.name}</option>)}</select></label><button type="button" className="secondary-btn" onClick={()=>setCreatingReference(true)}>＋ Create activity</button></div>}<label htmlFor="template-offset">Offset in calendar days<RequiredMark/><input key={`${editingRule.id}-${editingRule.schedule_rule}`} id="template-offset" name="offset" type="number" min={editingRule.schedule_rule==='finish_after_project_end'?1:0} step="1" required defaultValue={editingRule.offset_days}/></label></fieldset><FormActions busy={false} onCancel={()=>setEditingRule(null)}/></form></div>}
    {creatingReference&&<div className="modal-backdrop nested-modal"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="inline-activity-title"><button className="modal-close" onClick={()=>setCreatingReference(false)} aria-label="Close">×</button><p className="eyebrow">Add reference</p><h1 id="inline-activity-title">Create template activity</h1><TemplateActivityForm template={template} data={data} onCancel={()=>setCreatingReference(false)} onSaved={(id,name)=>{setCreatedReferences(current=>[...current.filter(item=>item.id!==id),{id,name:name||'New template activity'}]);if(editingRule)setEditingRule({...editingRule,relative_activity_id:id});setCreatingReference(false)}}/></div></div>}
  </>;
}
