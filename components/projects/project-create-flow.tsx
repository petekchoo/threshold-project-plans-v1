'use client';

import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { resolveTemplateSchedule } from '../../lib/planning/project-template';
import type { AppData, ProjectTemplate } from '../../lib/planning/types';
import { supabase } from '../../lib/supabase';
import { date, dayDifference } from '../../lib/planning/dates';
import { FormActions } from '../shared/form-actions';
import { RequiredMark } from '../shared/form-validation';
import { ProjectForm } from './project-form';

const isReady=(template:ProjectTemplate,data:AppData)=>{try{if(!data.projectTypes.some(type=>type.id===template.project_type_id)||template.activities.some(activity=>!data.activityTypes.some(type=>type.id===activity.activity_type_id)))return false;resolveTemplateSchedule(template.activities,'2030-01-01');return true}catch{return false}};
const leadIn=(template:ProjectTemplate)=>{const schedule=resolveTemplateSchedule(template.activities,'2030-01-01');const days=dayDifference(schedule.project_start_date,schedule.project_end_date);return `${days} calendar day${days===1?'':'s'} lead-in`};

export function ProjectCreateFlow({data,onCancel,onSaved}:{data:AppData;onCancel:()=>void;onSaved:()=>void}){
  const [step,setStep]=useState<'choice'|'blank'|'templates'|'details'>('choice');
  const [search,setSearch]=useState(''),[selected,setSelected]=useState<ProjectTemplate|null>(null),[endDate,setEndDate]=useState('');
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const templates=data.templates.filter(template=>isReady(template,data)&&(template.name+(template.project_types?.name||'')).toLowerCase().includes(search.toLowerCase()));
  const previewResult=useMemo(()=>{if(!selected||!endDate)return {schedule:null,message:''};try{return {schedule:resolveTemplateSchedule(selected.activities,endDate),message:''}}catch(problem){return {schedule:null,message:problem instanceof Error?problem.message:'The template schedule could not be previewed.'}}},[selected,endDate]);
  const preview=previewResult.schedule;
  if(step==='blank')return <ProjectForm data={data} onCancel={()=>setStep('choice')} onSaved={onSaved}/>;
  if(step==='choice')return <div className="project-create-choice"><p>Choose how you want to begin.</p><button className="choice-card" onClick={()=>setStep('blank')}><strong>Start a blank project</strong><span>Enter the full project details and schedule manually.</span></button><button className="choice-card" onClick={()=>setStep('templates')}><strong>Start from template</strong><span>Choose a reusable activity schedule, then enter a name and end date.</span></button><button className="text-btn" onClick={onCancel}>Cancel</button></div>;
  if(step==='templates')return <div className="template-picker"><button className="text-btn" onClick={()=>setStep('choice')}>← Back</button><label htmlFor="template-search">Search templates<input id="template-search" type="search" placeholder="Search by name or type" value={search} onChange={event=>setSearch(event.target.value)}/></label><div className="template-picker-list">{templates.map(template=><button className="choice-card" key={template.id} onClick={()=>{setSelected(template);setStep('details')}}><strong>{template.name}</strong><span>{template.project_types?.name} · {template.activities.length} activities · {leadIn(template)}</span></button>)}{!templates.length&&<p>No ready templates match your search.</p>}</div></div>;
  async function create(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!selected||!preview)return;setBusy(true);setError('');const form=new FormData(event.currentTarget);const result=await supabase.rpc('create_project_from_template',{p_template_id:selected.id,p_project_name:String(form.get('name')),p_project_end:endDate});setBusy(false);if(result.error)setError(result.error.message);else location.href=`/projects/${result.data}`}
  return <form className="edit-form structured-form" onSubmit={create}><button className="text-btn" type="button" onClick={()=>setStep('templates')}>← Back to templates</button><fieldset className="form-section"><legend>Create from {selected?.name}</legend><p>The project type and complete activity schedule come from this template.</p><label htmlFor="generated-project-name">Project name<RequiredMark/><input id="generated-project-name" name="name" required/></label><label htmlFor="generated-project-end">Project end date<RequiredMark/><input id="generated-project-end" type="date" required value={endDate} onInput={event=>setEndDate(event.currentTarget.value)}/></label></fieldset>{preview&&<section className="template-preview"><h2>Schedule preview</h2><p><strong>Project window:</strong> {date(preview.project_start_date)}–{date(preview.project_end_date)}</p><div className="table-card"><table><thead><tr><th>Activity</th><th>Start</th><th>Finish</th></tr></thead><tbody>{preview.activities.map(activity=><tr key={activity.id}><td>{activity.name}</td><td>{date(activity.start_date)}</td><td>{date(activity.due_date)}</td></tr>)}</tbody></table></div></section>}{previewResult.message&&<p className="form-error" role="alert">{previewResult.message}</p>}{error&&<p className="form-error" role="alert">{error}</p>}<FormActions busy={busy} disabled={!preview} onCancel={onCancel}/></form>;
}
