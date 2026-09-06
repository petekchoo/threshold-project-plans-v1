'use client';

import Link from 'next/link';
import { useState } from 'react';
import { resolveTemplateSchedule } from '../../lib/planning/project-template';
import type { AppData, ProjectTemplate } from '../../lib/planning/types';
import { supabase } from '../../lib/supabase';
import { Heading } from '../shared/page-heading';
import { TemplateForm } from './template-form';

const ready = (template: ProjectTemplate, data: AppData) => {
  try {
    if (!data.projectTypes.some(type => type.id === template.project_type_id)) return false;
    if (template.activities.some(activity => !data.activityTypes.some(type => type.id === activity.activity_type_id))) return false;
    resolveTemplateSchedule(template.activities, '2030-01-01'); return true;
  }
  catch { return false; }
};

export function Templates({data,refresh,setToast}:{data:AppData;refresh:()=>Promise<void>;setToast:(value:string)=>void}) {
  const [search,setSearch]=useState(''),[showArchived,setShowArchived]=useState(false),[creating,setCreating]=useState(false);
  const source=showArchived?[...data.templates,...data.archivedTemplates]:data.templates;
  const rows=source.filter(template=>(template.name+(template.project_types?.name||'')).toLowerCase().includes(search.toLowerCase()));
  async function archive(template:ProjectTemplate){
    if(!confirm(`Archive “${template.name}”? Existing projects created from it will not change.`))return;
    const result=await supabase.rpc('archive_project_template',{p_template_id:template.id});
    if(result.error)setToast(result.error.message);else{await refresh();setToast('Template archived.');}
  }
  return <>
    <Heading eyebrow="Reusable planning" title="Templates" copy="Build repeatable activity schedules anchored to a project end date." action={<button className="secondary-btn" onClick={()=>setCreating(true)}>＋ Create template</button>}/>
    <div className="filters template-filters"><input className="filter-search" type="search" aria-label="Search templates" placeholder="Search templates" value={search} onChange={event=>setSearch(event.target.value)}/><label className="filter-check"><input type="checkbox" checked={showArchived} onChange={event=>setShowArchived(event.target.checked)}/> Archived</label><span>{rows.length} templates</span></div>
    <div className="table-card template-table template-list-table"><table><thead><tr><th>Template</th><th>Project type</th><th>Activities</th><th>Readiness</th><th aria-label="Actions"/></tr></thead><tbody>{rows.map(template=>{const isReady=ready(template,data);return <tr key={template.id}><td><Link href={`/templates/${template.id}`}><strong>{template.name}</strong></Link>{template.archived_at&&<small>Archived</small>}</td><td>{template.project_types?.name}</td><td>{template.activities.length}</td><td><span className={`template-readiness ${isReady?'ready':'needs-setup'}`}>{isReady?'Ready':'Needs setup'}</span></td><td>{!template.archived_at&&<button className="text-btn" onClick={()=>archive(template)}>Archive</button>}</td></tr>})}</tbody></table>{!rows.length&&<div className="empty-state"><h3>No templates found</h3><p>Create a reusable schedule or adjust your search.</p></div>}</div>
    {creating&&<div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="new-template-title"><button className="modal-close" onClick={()=>setCreating(false)} aria-label="Close">×</button><p className="eyebrow">Create new</p><h1 id="new-template-title">Project template</h1><TemplateForm data={data} onCancel={()=>setCreating(false)} onSaved={id=>{location.href=`/templates/${id}`}}/></div></div>}
  </>;
}
