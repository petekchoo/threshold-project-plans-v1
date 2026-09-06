'use client';

import { useState } from 'react';
import { resolveTemplateSchedule } from '../../lib/planning/project-template';
import type { AppData, ProjectTemplate, ProjectTemplateActivity } from '../../lib/planning/types';
import { supabase } from '../../lib/supabase';
import { Heading } from '../shared/page-heading';
import { TemplateActivityForm } from './template-activity-form';
import { TemplateForm } from './template-form';

const ruleLabel={finish_before_project_end:'Finish before project end',finish_after_project_end:'Finish after project end',start_after_activity_finish:'Start after activity finishes',finish_after_activity_finish:'Finish after activity finishes'} as const;
const days=(value:number)=>`${value} ${value===1?'day':'days'}`;
const ownRuleLabel=(rule:ProjectTemplateActivity['rules'][number],template:ProjectTemplate)=>{const reference=template.activities.find(row=>row.id===rule.relative_activity_id);if(rule.schedule_rule==='start_after_activity_finish')return `Can’t start until ${reference?.name||'referenced activity'} is complete · ${days(rule.offset_days)} offset`;if(rule.schedule_rule==='finish_after_activity_finish')return `Can’t finish until ${reference?.name||'referenced activity'} is complete · ${days(rule.offset_days)} offset`;return `${ruleLabel[rule.schedule_rule]} · ${days(rule.offset_days)}`};
const incomingRuleLabels=(activity:ProjectTemplateActivity,template:ProjectTemplate)=>template.activities.flatMap(dependent=>dependent.rules.filter(rule=>rule.relative_activity_id===activity.id).map(rule=>rule.schedule_rule==='start_after_activity_finish'?`${dependent.name} can’t start until this is complete · ${days(rule.offset_days)} offset`:`${dependent.name} can’t finish until this is complete · ${days(rule.offset_days)} offset`));

export function TemplateDetail({template,data,refresh,setToast}:{template:ProjectTemplate;data:AppData;refresh:()=>Promise<void>;setToast:(value:string)=>void}){
  const [editingTemplate,setEditingTemplate]=useState(false),[editingActivity,setEditingActivity]=useState<ProjectTemplateActivity|null|undefined>(undefined);
  let readiness='Ready',readinessDetail='Every activity resolves to the project end date.';
  try{if(!data.projectTypes.some(type=>type.id===template.project_type_id)||template.activities.some(activity=>!data.activityTypes.some(type=>type.id===activity.activity_type_id)))throw new Error('Choose active project and activity types.');resolveTemplateSchedule(template.activities,'2030-01-01')}catch(error){readiness='Needs setup';readinessDetail=error instanceof Error?error.message:'Complete the activity schedule.'}
  async function activitySaved(){setEditingActivity(undefined);await refresh();setToast('Template activity saved.');}
  async function archiveActivity(activity:ProjectTemplateActivity){
    if(!confirm(`Archive “${activity.name}”? Activities that reference it will need a new rule.`))return;
    const result=await supabase.rpc('archive_project_template_activity',{p_activity_id:activity.id});
    if(result.error)setToast(result.error.message);else{await refresh();setToast('Template activity archived.');}
  }
  return <>
    <Heading eyebrow="Project template" title={template.name} copy={`${template.project_types?.name||'Project'} · ${readiness}`} action={<div className="heading-actions"><button className="secondary-btn" onClick={()=>setEditingTemplate(true)}>Edit template</button><button className="primary-btn" onClick={()=>setEditingActivity(null)}>＋ Add activity</button></div>}/>
    <section className={`template-readiness-card ${readiness==='Ready'?'ready':'needs-setup'}`}><strong>{readiness}</strong><span>{readinessDetail}</span></section>
    <div className="table-card template-table template-activity-table"><table><thead><tr><th>Activity</th><th>Type</th><th>Schedule</th><th>Duration</th><th aria-label="Actions"/></tr></thead><tbody>{template.activities.map(activity=>{const incoming=incomingRuleLabels(activity,template);return <tr key={activity.id}><td><button className="link-button" onClick={()=>setEditingActivity(activity)}><strong>{activity.name}</strong></button></td><td>{activity.activity_types?.name}</td><td><div className="template-rule-summary">{activity.rules.map(rule=><small key={rule.id}>{ownRuleLabel(rule,template)}</small>)}{incoming.map((label,index)=><small className="incoming" key={`${activity.id}-incoming-${index}`}>{label}</small>)}{!activity.rules.length&&!incoming.length&&<small>Not connected to the schedule</small>}</div></td><td>{days(activity.duration_days)}</td><td><button className="text-btn" onClick={()=>archiveActivity(activity)}>Archive</button></td></tr>})}</tbody></table>{!template.activities.length&&<div className="empty-state"><h3>No activities yet</h3><p>Add an activity anchored to project end to begin the reusable schedule.</p><button className="secondary-btn" onClick={()=>setEditingActivity(null)}>＋ Add activity</button></div>}</div>
    {editingTemplate&&<div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-template-title"><button className="modal-close" onClick={()=>setEditingTemplate(false)} aria-label="Close">×</button><p className="eyebrow">Maintain</p><h1 id="edit-template-title">Project template</h1><TemplateForm initial={template} data={data} onCancel={()=>setEditingTemplate(false)} onSaved={async()=>{setEditingTemplate(false);await refresh();setToast('Template saved.')}}/></div></div>}
    {editingActivity!==undefined&&<div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-template-activity-title"><button className="modal-close" onClick={()=>setEditingActivity(undefined)} aria-label="Close">×</button><p className="eyebrow">{editingActivity?'Maintain':'Create new'}</p><h1 id="edit-template-activity-title">Template activity</h1><TemplateActivityForm key={editingActivity?.id||'new'} template={template} data={data} initial={editingActivity||undefined} onCancel={()=>setEditingActivity(undefined)} onSaved={activitySaved} onOpenActivity={setEditingActivity}/></div></div>}
  </>;
}
