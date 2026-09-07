'use client';

import { useEffect, useRef, useState } from 'react';
import { Administration } from './administration/administration';
import { ActivitiesList as Activities } from './activities/activities-list';
import { ActivityDetail } from './activities/activity-detail';
import { Overview } from './overview/overview';
import { Editor } from './shared/editor';
import { MobileNav } from './shell/mobile-nav';
import { Sidebar } from './shell/sidebar';
import { ProjectDetail } from './projects/project-detail';
import { Projects } from './projects/projects-list';
import { Templates } from './templates/templates-list';
import { TemplateDetail } from './templates/template-detail';
import { loadData } from '../lib/data/planning-data';
import type {
 AppData,
 Kind,
} from '../lib/planning/types';
import { supabase } from '../lib/supabase';

function isRetryableAuthError(error:unknown){
 if(!error||typeof error!=='object')return false;
 const candidate=error as {code?:string;message?:string};
 return candidate.code==='PGRST303'||/jwt|token/i.test(candidate.message||'');
}

export default function ThresholdApp({view,id}:{view:Kind;id?:string}){
 const [data,setData]=useState<AppData>({projects:[],activities:[],members:[],projectTypes:[],activityTypes:[],templates:[],archivedTemplates:[]}),[modal,setModal]=useState<'project'|'activity'|null>(null),[activityProjectId,setActivityProjectId]=useState<string|undefined>(),[toast,setToast]=useState('');
 const refreshInFlight=useRef(false);
 const refresh=async()=>{
  if(refreshInFlight.current)return;
  refreshInFlight.current=true;
  try{
   let next:AppData;
   try{next=await loadData()}
   catch(error){
    if(!isRetryableAuthError(error))throw error;
    const {error:sessionError}=await supabase.auth.refreshSession();
    if(sessionError)throw sessionError;
    next=await loadData();
   }
   setData(next);
  }catch(error){console.error('Threshold data refresh failed',error);setToast('Unable to refresh project data. Please reload or sign in again.')}finally{refreshInFlight.current=false}
 };
 useEffect(()=>{
  supabase.auth.getUser().then(async({data:{user},error})=>{
   if(error||!user){
    await supabase.auth.signOut({scope:'local'});
    location.href='/sign-in';
    return;
   }
   refresh();
  });
  const channel=supabase.channel('threshold-live').on('postgres_changes',{event:'*',schema:'public'},refresh).subscribe();
  return()=>{supabase.removeChannel(channel)};
 },[]);
 const selectedProject=data.projects.find(p=>p.id===id),selectedActivity=data.activities.find(a=>a.id===id),selectedTemplate=data.templates.find(template=>template.id===id);
 const openActivity=(projectId?:string)=>{setActivityProjectId(projectId);setModal('activity')};
 const closeModal=()=>{setModal(null);setActivityProjectId(undefined)};
 return <main className="app-shell"><Sidebar view={view}/><section className="main-panel"><MobileNav/><div className="content">{toast&&<div className="notice" role="status"><span>{toast}</span><button onClick={()=>setToast('')}>×</button></div>}{view==='overview'&&<Overview data={data} refresh={refresh} setToast={setToast}/>} {view==='projects'&&<Projects data={data} query="" onNew={()=>setModal('project')}/>} {view==='activities'&&<Activities data={data} query="" onNew={()=>openActivity()}/>} {view==='templates'&&<Templates data={data} refresh={refresh} setToast={setToast}/>} {view==='template'&&selectedTemplate&&<TemplateDetail template={selectedTemplate} data={data} refresh={refresh} setToast={setToast}/>} {view==='administration'&&<Administration data={data} refresh={refresh} setToast={setToast}/>} {view==='project'&&selectedProject&&<ProjectDetail project={selectedProject} activities={data.activities.filter(a=>a.project_id===selectedProject.id)} data={data} refresh={refresh} setToast={setToast} onNewActivity={()=>openActivity(selectedProject.id)}/>} {view==='activity'&&selectedActivity&&<ActivityDetail activity={selectedActivity} data={data} refresh={refresh} setToast={setToast}/>}</div></section>{modal&&<Editor kind={modal} data={data} initialProjectId={activityProjectId} onClose={closeModal} onSaved={()=>{const savedKind=modal;closeModal();refresh();setToast(`${savedKind==='project'?'Project':'Activity'} saved.`)}}/>}</main>
}
