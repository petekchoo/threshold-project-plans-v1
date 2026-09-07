'use client';

import { type FormEvent, useState } from 'react';
import Link from 'next/link';
import { date } from '../../lib/planning/dates';
import { evaluateActivitySchedule, type ActivityScheduleEvaluation } from '../../lib/planning/activity-schedule';
import type { Activity, AppData, Dependency, ProjectTimingRule, TemplateScheduleRule } from '../../lib/planning/types';
import { supabase } from '../../lib/supabase';
import { handleModalKeyDown } from '../shared/modal-keyboard';
import { RequiredMark } from '../shared/form-validation';

type DraftRule = { key: string; schedule_rule: TemplateScheduleRule; relative_activity_id: string; offset_days: number | '' };
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
  const [picking,setPicking]=useState(false),[creating,setCreating]=useState(false),[created,setCreated]=useState<Activity[]>([]);
  const [search,setSearch]=useState(''),[projectFilter,setProjectFilter]=useState(''),[typeFilter,setTypeFilter]=useState(''),[memberFilter,setMemberFilter]=useState('');
  const project=data.projects.find(item=>item.id===projectId);
  const allActivities=[...data.activities,...created.filter(item=>!data.activities.some(existing=>existing.id===item.id))];
  const candidates=allActivities.filter(activity=>activity.id!==initial?.id&&!activity.archived_at);
  const visibleCandidates=candidates.filter(activity=>(!search||activity.name.toLowerCase().includes(search.toLowerCase()))&&(!projectFilter||activity.project_id===projectFilter)&&(!typeFilter||activity.activity_type_id===typeFilter)&&(!memberFilter||(activity.activity_owners||[]).some(owner=>owner.team_members.id===memberFilter)));
  const incoming=initial?data.activities.flatMap(activity=>(activity.activity_dependencies||[]).filter(rule=>!rule.archived_at&&rule.depends_on_activity_id===initial.id).map(rule=>({activity,rule}))):[];
  const beginProjectRule=()=>setEditing({key:'project',schedule_rule:timingRule==='post_project_deadline'?'finish_after_project_end':'finish_before_project_end',relative_activity_id:'',offset_days:timingOffsetDays??0});
  const beginDependency=(dependency?:Dependency)=>setEditing({key:dependency?`dependency-${dependency.depends_on_activity_id}`:`new-${++nextRule}`,schedule_rule:dependency?.constraint_type==='finish_to_finish'?'finish_after_activity_finish':'start_after_activity_finish',relative_activity_id:dependency?.depends_on_activity_id||'',offset_days:dependency?.offset_days??0});
  const beginRule=()=>setEditing({key:`new-${++nextRule}`,schedule_rule:timingRule?'start_after_activity_finish':'finish_before_project_end',relative_activity_id:'',offset_days:0});
  const close=()=>{setEditing(null);setError('');setEvaluation(null)};
  function candidateState(draft:DraftRule){
    const offset=Number(draft.offset_days);
    let nextTiming=timingRule,nextOffset=timingOffsetDays,nextDependencies=dependencies;
    if(relationshipRule(draft.schedule_rule)){
      const dependency:Dependency={depends_on_activity_id:draft.relative_activity_id,constraint_type:draft.schedule_rule==='start_after_activity_finish'?'finish_to_start':'finish_to_finish',offset_days:offset};
      nextDependencies=[...dependencies.filter(item=>`dependency-${item.depends_on_activity_id}`!==draft.key&&item.depends_on_activity_id!==draft.relative_activity_id),dependency];
    }else{
      nextTiming=draft.schedule_rule==='finish_before_project_end'?'advance_deadline':'post_project_deadline';nextOffset=offset;
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
    if(draft.offset_days===''||!Number.isInteger(Number(draft.offset_days))||Number(draft.offset_days)<(draft.schedule_rule==='finish_after_project_end'?1:0)){setError('Enter a valid whole-day offset.');return}
    const {nextTiming,nextOffset,nextDependencies}=candidateState(draft);
    const result=evaluateActivitySchedule({activityId:initial?.id,activityName:name||'This activity',startDate,dueDate,project,timingRule:nextTiming,
      timingOffsetDays:nextOffset,dependencies:nextDependencies,activities:allActivities});
    setEditing(draft);setEvaluation(result);setError(result.status==='conflict'?result.message:'');if(result.status==='valid')apply(draft,result);
  }
  async function createReference(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const form=new FormData(event.currentTarget);const referenceProject=data.projects.find(item=>item.id===String(form.get('project')));if(!referenceProject)return;
    const activity={id:null,name:String(form.get('name')).trim(),project_id:referenceProject.id,activity_type_id:String(form.get('type')),status:'not_started',priority:'normal',start_date:String(form.get('start')),due_date:String(form.get('due')),notes:'',allow_outside_project:false,adjust_project_start:false,project_timing_rule:null,project_timing_boundary:null,project_timing_offset_days:null};
    const result=await supabase.rpc('save_activity',{p_activity:activity,p_owner_ids:[],p_links:[],p_dependencies:[]});
    if(result.error){setError(result.error.message);return}const made:Activity={...activity,id:String(result.data),status:'not_started',priority:'normal',notes:'',projects:{id:referenceProject.id,name:referenceProject.name,start_date:referenceProject.start_date,end_date:referenceProject.end_date},activity_dependencies:[],activity_owners:[]};
    setCreated(current=>[...current,made]);if(editing)setEditing({...editing,relative_activity_id:made.id});setCreating(false);setPicking(false);setEvaluation(null);
  }
  const selectedDependencies=dependencies.map(dependency=>({dependency,activity:data.activities.find(activity=>activity.id===dependency.depends_on_activity_id)}));
  return <fieldset className="form-section"><legend>Schedule</legend><p>Add rules that this activity’s entered dates must satisfy.</p>
    <div className="template-rule-list">
      {timingRule&&<div className="template-rule-row"><button type="button" className="link-button" onClick={beginProjectRule}><strong>{timingRule==='advance_deadline'?labels.finish_before_project_end:labels.finish_after_project_end}</strong><small>{timingOffsetDays} calendar day{timingOffsetDays===1?'':'s'}</small></button><button type="button" className="template-rule-remove" aria-label="Remove project timing rule" onClick={()=>onTimingChange(null,null)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"/></svg></button></div>}
      {selectedDependencies.map(({dependency,activity})=><div className="template-rule-row" key={dependency.depends_on_activity_id}><button type="button" className="link-button" onClick={()=>beginDependency(dependency)}><strong>{dependency.constraint_type==='finish_to_start'?labels.start_after_activity_finish:labels.finish_after_activity_finish}</strong><small>{dependency.offset_days??0} calendar day{(dependency.offset_days??0)===1?'':'s'} · {activity?.name||'Unavailable activity'} · due {activity?date(activity.due_date):'—'}</small></button><button type="button" className="template-rule-remove" aria-label={`Remove rule for ${activity?.name||'activity'}`} onClick={()=>onDependenciesChange(dependencies.filter(item=>item!==dependency))}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"/></svg></button></div>)}
    </div>
    {!timingRule&&!dependencies.length&&<p className="schedule-empty">No schedule rules yet.</p>}
    <div className="heading-actions"><button type="button" className="secondary-btn" onClick={beginRule}>＋ Add scheduling rule</button></div>
    {incoming.length>0&&<div className="incoming-template-rules"><p><strong>Used by other activities</strong></p>{incoming.map(({activity,rule})=><Link className="template-rule-row incoming-template-rule" href={`/activities/${activity.id}`} key={`${activity.id}-${rule.id||rule.constraint_type}`}><span><strong>{activity.name}</strong><small>{rule.constraint_type==='finish_to_start'?'Must start':'Must finish'} on or after this activity finishes · {(rule.offset_days??0)} calendar day{(rule.offset_days??0)===1?'':'s'} offset · fixed {rule.constraint_type==='finish_to_start'?date(activity.start_date):date(activity.due_date)}</small></span><span aria-hidden="true">›</span></Link>)}</div>}
    {editing&&<div className="picker-backdrop nested-modal" data-editor-child-modal="true" onKeyDown={event=>handleModalKeyDown(event,{onSave:evaluate,onCancel:close,canSave:evaluation?.status!=='adjusted'})} onClick={event=>{if(event.target===event.currentTarget)close()}}><section className="modal edit-form structured-form" role="dialog" aria-modal="true" aria-labelledby="activity-schedule-rule-title"><button type="button" className="modal-close" onClick={close} aria-label="Close schedule rule">×</button><p className="eyebrow">Schedule</p><h1 id="activity-schedule-rule-title">Schedule rule</h1><fieldset className="form-section"><label htmlFor="activity-rule">Rule<RequiredMark/><select id="activity-rule" value={editing.schedule_rule} onChange={event=>{const schedule_rule=event.target.value as TemplateScheduleRule;setEditing({...editing,schedule_rule,relative_activity_id:relationshipRule(schedule_rule)?editing.relative_activity_id:'',offset_days:schedule_rule==='finish_after_project_end'?Math.max(1,Number(editing.offset_days)):editing.offset_days});setEvaluation(null);setError('')}}>{Object.entries(labels).map(([value,label])=><option value={value} key={value} disabled={!relationshipRule(value as TemplateScheduleRule)&&!!timingRule&&editing.key!=='project'}>{label}</option>)}</select></label>{relationshipRule(editing.schedule_rule)&&<div className="template-reference"><label>Activity<RequiredMark/><button type="button" className="secondary-btn" onClick={()=>setPicking(true)}>{editing.relative_activity_id?candidates.find(item=>item.id===editing.relative_activity_id)?.name||'Selected activity':'Choose activity'}</button></label><button type="button" className="secondary-btn" onClick={()=>setCreating(true)}>＋ Create activity</button></div>}<label htmlFor="activity-rule-offset">Offset in calendar days<RequiredMark/><input id="activity-rule-offset" type="number" min={editing.schedule_rule==='finish_after_project_end'?1:0} step="1" required value={editing.offset_days} onChange={event=>{setEditing({...editing,offset_days:event.target.value===''?'':Number(event.target.value)});setEvaluation(null);setError('')}}/></label></fieldset>
      {evaluation?.status==='adjusted'&&<div className="schedule-rule-impact"><strong>This rule changes the current activity’s dates.</strong><p>Current: {date(startDate)} — {date(dueDate)}<br/>Proposed: {date(evaluation.placement.start_date)} — {date(evaluation.placement.due_date)}</p><p>The activity moves {Math.abs(evaluation.placement.shift_days)} calendar day{Math.abs(evaluation.placement.shift_days)===1?'':'s'} {evaluation.placement.shift_days>0?'later':'earlier'} and keeps its current duration.</p></div>}
      {error&&<p className="form-error" role="alert">{error}</p>}<div className="form-actions"><button type="button" className="secondary-btn" onClick={close}>Cancel</button>{evaluation?.status==='adjusted'?<button type="button" className="create-btn" onClick={()=>apply(editing,evaluation)}>Apply rule and update dates</button>:<button type="button" className="create-btn" onClick={evaluate}>Check rule</button>}</div></section></div>}
    {picking&&editing&&<div className="picker-backdrop nested-modal"><section className="modal edit-form structured-form activity-reference-picker" role="dialog" aria-modal="true" aria-labelledby="activity-picker-title"><button type="button" className="modal-close" onClick={()=>setPicking(false)} aria-label="Close activity picker">×</button><p className="eyebrow">Schedule reference</p><h1 id="activity-picker-title">Choose an activity</h1><div className="form-grid"><label>Search<input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search activity name"/></label><label>Project<select value={projectFilter} onChange={event=>setProjectFilter(event.target.value)}><option value="">All projects</option>{data.projects.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Type<select value={typeFilter} onChange={event=>setTypeFilter(event.target.value)}><option value="">All types</option>{data.activityTypes.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Team member<select value={memberFilter} onChange={event=>setMemberFilter(event.target.value)}><option value="">All team members</option>{data.members.map(item=><option key={item.id} value={item.id}>{item.full_name}</option>)}</select></label></div><div className="activity-picker-results">{visibleCandidates.map(activity=><button type="button" className="template-rule-row incoming-template-rule" key={activity.id} onClick={()=>{setEditing({...editing,relative_activity_id:activity.id});setPicking(false);setEvaluation(null)}}><span><strong>{activity.name}</strong><small>{activity.projects?.name||data.projects.find(item=>item.id===activity.project_id)?.name} · {activity.activity_types?.name||'No type'} · {date(activity.start_date)}–{date(activity.due_date)}</small></span><span aria-hidden="true">›</span></button>)}{!visibleCandidates.length&&<p className="schedule-empty">No activities match these filters.</p>}</div><div className="form-actions"><button type="button" className="secondary-btn" onClick={()=>setPicking(false)}>Cancel</button><button type="button" className="create-btn" onClick={()=>{setPicking(false);setCreating(true)}}>＋ Create activity</button></div></section></div>}
    {creating&&<div className="picker-backdrop nested-modal"><form className="modal edit-form structured-form" onSubmit={createReference} role="dialog" aria-modal="true" aria-labelledby="create-reference-title"><button type="button" className="modal-close" onClick={()=>setCreating(false)} aria-label="Close new activity">×</button><p className="eyebrow">Schedule reference</p><h1 id="create-reference-title">Create activity</h1><fieldset className="form-section"><label>Name<RequiredMark/><input name="name" required/></label><label>Project<RequiredMark/><select name="project" required defaultValue={projectId}>{data.projects.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Type<RequiredMark/><select name="type" required defaultValue={data.activityTypes[0]?.id}>{data.activityTypes.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="form-grid"><label>Start date<RequiredMark/><input name="start" type="date" required defaultValue={project?.start_date}/></label><label>Due date<RequiredMark/><input name="due" type="date" required defaultValue={project?.start_date}/></label></div></fieldset>{error&&<p className="form-error" role="alert">{error}</p>}<div className="form-actions"><button type="button" className="secondary-btn" onClick={()=>setCreating(false)}>Cancel</button><button type="submit" className="create-btn">Create activity</button></div></form></div>}
  </fieldset>;
}
