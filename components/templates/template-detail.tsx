'use client';

import { useState } from 'react';
import { resolveTemplateSchedule } from '../../lib/planning/project-template';
import type { AppData, ProjectTemplate, ProjectTemplateActivity } from '../../lib/planning/types';
import { supabase } from '../../lib/supabase';
import { Heading } from '../shared/page-heading';
import { TemplateActivityForm } from './template-activity-form';
import { TemplateForm } from './template-form';

const ruleLabel:Record<ProjectTemplateActivity['schedule_rule'],string>={finish_before_project_end:'Finish before project end',finish_after_project_end:'Finish after project end',start_after_activity_finish:'Start after activity finishes',finish_after_activity_finish:'Finish after activity finishes'};

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
    <div className="table-card template-table"><table><thead><tr><th>Activity</th><th>Type</th><th>Rule</th><th>Offset</th><th>Duration</th><th>Reference</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{template.activities.map(activity=>{const reference=template.activities.find(row=>row.id===activity.relative_activity_id);return <tr key={activity.id}><td><button className="link-button" onClick={()=>setEditingActivity(activity)}><strong>{activity.name}</strong></button></td><td>{activity.activity_types?.name}</td><td>{ruleLabel[activity.schedule_rule]}</td><td>{activity.offset_days} days</td><td>{activity.duration_days} days</td><td>{reference?.name||'Project end'}</td><td><button className="text-btn" onClick={()=>archiveActivity(activity)}>Archive</button></td></tr>})}</tbody></table>{!template.activities.length&&<div className="empty-state"><h3>No activities yet</h3><p>Add an activity anchored to project end to begin the reusable schedule.</p><button className="secondary-btn" onClick={()=>setEditingActivity(null)}>＋ Add activity</button></div>}</div>
    {editingTemplate&&<div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-template-title"><button className="modal-close" onClick={()=>setEditingTemplate(false)} aria-label="Close">×</button><p className="eyebrow">Maintain</p><h1 id="edit-template-title">Project template</h1><TemplateForm initial={template} data={data} onCancel={()=>setEditingTemplate(false)} onSaved={async()=>{setEditingTemplate(false);await refresh();setToast('Template saved.')}}/></div></div>}
    {editingActivity!==undefined&&<div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-template-activity-title"><button className="modal-close" onClick={()=>setEditingActivity(undefined)} aria-label="Close">×</button><p className="eyebrow">{editingActivity?'Maintain':'Create new'}</p><h1 id="edit-template-activity-title">Template activity</h1><TemplateActivityForm template={template} data={data} initial={editingActivity||undefined} onCancel={()=>setEditingActivity(undefined)} onSaved={activitySaved}/></div></div>}
  </>;
}
