'use client';

import { useState } from 'react';
import { date } from '../../lib/planning/dates';
import { evaluateActivitySchedule, type ActivityScheduleEvaluation } from '../../lib/planning/activity-schedule';
import type { Activity, AppData, Dependency, ProjectTimingRule, TemplateScheduleRule } from '../../lib/planning/types';
import { handleModalKeyDown } from '../shared/modal-keyboard';
import { RequiredMark } from '../shared/form-validation';

type DraftRule = { key: string; schedule_rule: TemplateScheduleRule; relative_activity_id: string; offset_days: number };
const labels: Record<TemplateScheduleRule,string> = {
  finish_before_project_end: 'Finish before project end', finish_after_project_end: 'Finish after project end',
  start_after_activity_finish: 'Start after another activity finishes', finish_after_activity_finish: 'Finish after another activity finishes',
};
const relationshipRule = (rule: TemplateScheduleRule) => rule === 'start_after_activity_finish' || rule === 'finish_after_activity_finish';
let nextRule = 0;

export function ActivityScheduleEditor({ initial, data, name, projectId, startDate, dueDate, timingRule, timingOffsetDays, dependencies,
  onTimingChange, onDependenciesChange, onDatesChange }:{
  initial?: Activity; data: AppData; name: string; projectId: string; startDate: string; dueDate: string;
  timingRule: ProjectTimingRule|null; timingOffsetDays: number|null; dependencies: Dependency[];
  onTimingChange:(rule:ProjectTimingRule|null,offset:number|null)=>void; onDependenciesChange:(items:Dependency[])=>void;
  onDatesChange:(start:string,due:string)=>void;
}) {
  const [editing,setEditing]=useState<DraftRule|null>(null),[error,setError]=useState(''),[evaluation,setEvaluation]=useState<ActivityScheduleEvaluation|null>(null);
  const project=data.projects.find(item=>item.id===projectId);
  const candidates=data.activities.filter(activity=>activity.id!==initial?.id&&!activity.archived_at);
  const incoming=initial?data.activities.flatMap(activity=>(activity.activity_dependencies||[]).filter(rule=>!rule.archived_at&&rule.depends_on_activity_id===initial.id).map(rule=>({activity,rule}))):[];
  const beginProjectRule=()=>setEditing({key:'project',schedule_rule:timingRule==='post_project_deadline'?'finish_after_project_end':'finish_before_project_end',relative_activity_id:'',offset_days:timingOffsetDays??0});
  const beginDependency=(dependency?:Dependency)=>setEditing({key:dependency?`dependency-${dependency.depends_on_activity_id}`:`new-${++nextRule}`,schedule_rule:dependency?.constraint_type==='finish_to_finish'?'finish_after_activity_finish':'start_after_activity_finish',relative_activity_id:dependency?.depends_on_activity_id||'',offset_days:0});
  const close=()=>{setEditing(null);setError('');setEvaluation(null)};
  function candidateState(draft:DraftRule){
    let nextTiming=timingRule,nextOffset=timingOffsetDays,nextDependencies=dependencies;
    if(relationshipRule(draft.schedule_rule)){
      const dependency:Dependency={depends_on_activity_id:draft.relative_activity_id,constraint_type:draft.schedule_rule==='start_after_activity_finish'?'finish_to_start':'finish_to_finish'};
      nextDependencies=[...dependencies.filter(item=>`dependency-${item.depends_on_activity_id}`!==draft.key&&item.depends_on_activity_id!==draft.relative_activity_id),dependency];
    }else{
      nextTiming=draft.schedule_rule==='finish_before_project_end'?'advance_deadline':'post_project_deadline';nextOffset=draft.offset_days;
    }
    return {nextTiming,nextOffset,nextDependencies};
  }
  function apply(draft:DraftRule, result:ActivityScheduleEvaluation){
    const {nextTiming,nextOffset,nextDependencies}=candidateState(draft);onTimingChange(nextTiming,nextOffset);onDependenciesChange(nextDependencies);
    if(result.status!=='conflict')onDatesChange(result.placement.start_date,result.placement.due_date);close();
  }
  function evaluate(){
    if(!editing||!project)return;
    const draft=editing;
    if(!startDate||!dueDate){setError('Enter the activity start and due dates before adding a schedule rule.');return}
    if(relationshipRule(draft.schedule_rule)&&!draft.relative_activity_id){setError('Choose the activity that establishes this schedule boundary.');return}
    const {nextTiming,nextOffset,nextDependencies}=candidateState(draft);
    const result=evaluateActivitySchedule({activityId:initial?.id,activityName:name||'This activity',startDate,dueDate,project,timingRule:nextTiming,
      timingOffsetDays:nextOffset,dependencies:nextDependencies,activities:data.activities});
    setEditing(draft);setEvaluation(result);setError(result.status==='conflict'?result.message:'');if(result.status==='valid')apply(draft,result);
  }
  const selectedDependencies=dependencies.map(dependency=>({dependency,activity:data.activities.find(activity=>activity.id===dependency.depends_on_activity_id)}));
  return <fieldset className="form-section"><legend>Schedule</legend><p>Add rules that this activity’s entered dates must satisfy.</p>
    <div className="template-rule-list">
      {timingRule&&<div className="template-rule-row"><button type="button" className="link-button" onClick={beginProjectRule}><strong>{timingRule==='advance_deadline'?labels.finish_before_project_end:labels.finish_after_project_end}</strong><small>{timingOffsetDays} calendar day{timingOffsetDays===1?'':'s'}</small></button><button type="button" className="template-rule-remove" aria-label="Remove project timing rule" onClick={()=>onTimingChange(null,null)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"/></svg></button></div>}
      {selectedDependencies.map(({dependency,activity})=><div className="template-rule-row" key={dependency.depends_on_activity_id}><button type="button" className="link-button" onClick={()=>beginDependency(dependency)}><strong>{dependency.constraint_type==='finish_to_start'?labels.start_after_activity_finish:labels.finish_after_activity_finish}</strong><small>{activity?.name||'Unavailable activity'} · due {activity?date(activity.due_date):'—'}</small></button><button type="button" className="template-rule-remove" aria-label={`Remove rule for ${activity?.name||'activity'}`} onClick={()=>onDependenciesChange(dependencies.filter(item=>item!==dependency))}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"/></svg></button></div>)}
    </div>
    {!timingRule&&!dependencies.length&&<p className="schedule-empty">No schedule rules yet.</p>}
    <div className="heading-actions"><button type="button" className="secondary-btn" onClick={beginProjectRule} disabled={!!timingRule}>＋ Add project rule</button><button type="button" className="secondary-btn" onClick={()=>beginDependency()}>＋ Add prerequisite</button></div>
    {incoming.length>0&&<div className="incoming-template-rules"><p><strong>Used by other activities</strong></p>{incoming.map(({activity,rule})=><div className="template-rule-row incoming-template-rule" key={`${activity.id}-${rule.id||rule.constraint_type}`}><span><strong>{activity.name}</strong><small>{rule.constraint_type==='finish_to_start'?'Must start':'Must finish'} on or after this activity finishes · fixed {rule.constraint_type==='finish_to_start'?date(activity.start_date):date(activity.due_date)}</small></span></div>)}</div>}
    {editing&&<div className="picker-backdrop nested-modal" data-editor-child-modal="true" onKeyDown={event=>handleModalKeyDown(event,{onSave:evaluate,onCancel:close,canSave:evaluation?.status!=='adjusted'})} onClick={event=>{if(event.target===event.currentTarget)close()}}><section className="modal edit-form structured-form" role="dialog" aria-modal="true" aria-labelledby="activity-schedule-rule-title"><button type="button" className="modal-close" onClick={close} aria-label="Close schedule rule">×</button><p className="eyebrow">Schedule</p><h1 id="activity-schedule-rule-title">Schedule rule</h1><fieldset className="form-section"><label htmlFor="activity-rule">Rule<RequiredMark/><select id="activity-rule" value={editing.schedule_rule} onChange={event=>{const schedule_rule=event.target.value as TemplateScheduleRule;setEditing({...editing,schedule_rule,relative_activity_id:relationshipRule(schedule_rule)?editing.relative_activity_id:'',offset_days:schedule_rule==='finish_after_project_end'?Math.max(1,editing.offset_days):editing.offset_days});setEvaluation(null);setError('')}}>{Object.entries(labels).map(([value,label])=><option value={value} key={value} disabled={!relationshipRule(value as TemplateScheduleRule)&&!!timingRule&&editing.key!=='project'}>{label}</option>)}</select></label>{relationshipRule(editing.schedule_rule)&&<label htmlFor="activity-rule-reference">Activity<RequiredMark/><select id="activity-rule-reference" required value={editing.relative_activity_id} onChange={event=>{setEditing({...editing,relative_activity_id:event.target.value});setEvaluation(null);setError('')}}><option value="">Choose activity</option>{candidates.map(activity=><option value={activity.id} key={activity.id}>{activity.name} · due {date(activity.due_date)}</option>)}</select></label>}{!relationshipRule(editing.schedule_rule)&&<label htmlFor="activity-rule-offset">Offset in calendar days<RequiredMark/><input id="activity-rule-offset" type="number" min={editing.schedule_rule==='finish_after_project_end'?1:0} step="1" required value={editing.offset_days} onChange={event=>{setEditing({...editing,offset_days:Number(event.target.value)});setEvaluation(null);setError('')}}/></label>}</fieldset>
      {evaluation?.status==='adjusted'&&<div className="schedule-rule-impact"><strong>This rule changes the current activity’s dates.</strong><p>Current: {date(startDate)} — {date(dueDate)}<br/>Proposed: {date(evaluation.placement.start_date)} — {date(evaluation.placement.due_date)}</p><p>The activity moves {Math.abs(evaluation.placement.shift_days)} calendar day{Math.abs(evaluation.placement.shift_days)===1?'':'s'} {evaluation.placement.shift_days>0?'later':'earlier'} and keeps its current duration.</p></div>}
      {error&&<p className="form-error" role="alert">{error}</p>}<div className="form-actions"><button type="button" className="secondary-btn" onClick={close}>Cancel</button>{evaluation?.status==='adjusted'?<button type="button" className="create-btn" onClick={()=>apply(editing,evaluation)}>Apply rule and update dates</button>:<button type="button" className="create-btn" onClick={evaluate}>Check rule</button>}</div></section></div>}
  </fieldset>;
}
