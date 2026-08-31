'use client';

import Link from 'next/link';
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
 const [data,setData]=useState<AppData>({projects:[],activities:[],members:[],projectTypes:[],activityTypes:[]}),[loading,setLoading]=useState(true),[live,setLive]=useState(false),[query,setQuery]=useState(''),[modal,setModal]=useState<'project'|'activity'|null>(null),[activityProjectId,setActivityProjectId]=useState<string|undefined>(),[toast,setToast]=useState('');
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
   setData(next);setLive(true);
  }catch(error){console.error('Threshold data refresh failed',error);setLive(false);setToast('Unable to refresh project data. Please reload or sign in again.')}finally{setLoading(false);refreshInFlight.current=false}
 };
 useEffect(()=>{supabase.auth.getSession().then(({data:{session}})=>{if(!session){location.href='/sign-in'}else refresh()});const channel=supabase.channel('threshold-live').on('postgres_changes',{event:'*',schema:'public'},refresh).subscribe();return()=>{supabase.removeChannel(channel)}},[]);
 const selectedProject=data.projects.find(p=>p.id===id),selectedActivity=data.activities.find(a=>a.id===id);
 const activityContext=view==='project'||view==='activity';
 const openActivity=(projectId?:string)=>{setActivityProjectId(projectId);setModal('activity')};
 const closeModal=()=>{setModal(null);setActivityProjectId(undefined)};
 return <main className="app-shell"><Sidebar view={view}/><section className="main-panel"><header className="topbar"><Link href="/" className="mobile-mark">T</Link><label className="search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search this view"/></label><div className="top-actions"><span className={`live-dot ${live?'online':''}`}>{loading?'Connecting…':live?'Live':'Prototype data'}</span><button className="create-btn" onClick={()=>activityContext||view==='activities'?openActivity(selectedProject?.id||selectedActivity?.project_id):setModal('project')}>＋ New {activityContext||view==='activities'?'activity':'project'}</button></div></header><div className="content">{toast&&<div className="notice" role="status"><span>{toast}</span><button onClick={()=>setToast('')}>×</button></div>}{view==='overview'&&<Overview data={data} query={query}/>} {view==='projects'&&<Projects data={data} query={query} onNew={()=>setModal('project')}/>} {view==='activities'&&<Activities data={data} query={query} onNew={()=>openActivity()}/>} {view==='administration'&&<Administration data={data} refresh={refresh} setToast={setToast}/>} {view==='project'&&selectedProject&&<ProjectDetail project={selectedProject} activities={data.activities.filter(a=>a.project_id===selectedProject.id)} data={data} refresh={refresh} setToast={setToast} onNewActivity={()=>openActivity(selectedProject.id)}/>} {view==='activity'&&selectedActivity&&<ActivityDetail activity={selectedActivity} data={data} refresh={refresh} setToast={setToast}/>}</div><MobileNav/></section>{modal&&<Editor kind={modal} data={data} initialProjectId={activityProjectId} onClose={closeModal} onSaved={()=>{const savedKind=modal;closeModal();refresh();setToast(`${savedKind==='project'?'Project':'Activity'} saved.`)}}/>}</main>
}
