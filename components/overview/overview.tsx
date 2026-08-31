'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ActivityPanel } from '../activities/activity-panel';
import { Heading } from '../shared/page-heading';
import { statusLabel } from '../shared/status-pill';
import { addDays, date, isoDate } from '../../lib/planning/dates';
import { progress } from '../../lib/planning/progress';
import { timelinePosition } from '../../lib/planning/scheduling';
import type { Activity, AppData } from '../../lib/planning/types';
import { ActivityAttentionList } from './activity-attention-list';
import { OwnerBreakdown } from './owner-breakdown';
import { ProjectCard } from './project-card';

export function Overview({ data, refresh, setToast }: { data: AppData; refresh: () => void; setToast: (value: string) => void }) {
  const today = isoDate(new Date());
  const weekEnd = addDays(today, 7);
  const [range, setRange] = useState<'Week'|'Month'|'Quarter'|'Half-year'|'Year'|'All Events'>('Month');
  const [showDraft, setShowDraft] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity|null>(null);
  const visible = data.projects.filter(project=>(showDraft||project.status!=='draft')&&(showCompleted||project.status!=='completed'));
  const rangeDays = {'Week':7,'Month':35,'Quarter':95,'Half-year':185,'Year':370,'All Events':0}[range];
  const domainStart = range==='All Events'?(visible.map(project=>project.start_date).sort()[0]||today):today;
  const domainEnd = range==='All Events'?(visible.map(project=>project.end_date).sort().at(-1)||addDays(today,35)):addDays(today,rangeDays);
  const ticks = Array.from({length:5},(_,index)=>addDays(domainStart,Math.round((new Date(`${domainEnd}T12:00:00`).getTime()-new Date(`${domainStart}T12:00:00`).getTime())/86400000/4*index)));
  const byDueThenName = (a: Activity, b: Activity) => a.due_date.localeCompare(b.due_date)||a.name.localeCompare(b.name);
  const overdue = data.activities.filter(activity=>activity.status!=='completed'&&activity.due_date<today).sort(byDueThenName);
  const dueSoon = data.activities.filter(activity=>activity.status!=='completed'&&activity.due_date>=today&&activity.due_date<=weekEnd).sort(byDueThenName);
  const unassigned = data.activities.filter(activity=>!activity.activity_owners?.length).sort(byDueThenName);

  return <><Heading eyebrow={new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric'}).format(new Date())} title="Threshold at a glance" copy="What is moving, what needs attention, and what comes next."/><section className="metric-grid"><a href="#overdue-activities"><article><div className="metric-icon overdue">!</div><div><strong>{overdue.length}</strong><span>Overdue activities</span></div><small>Incomplete work past its due date</small></article></a><a href="#due-soon-activities"><article><div className="metric-icon due">↗</div><div><strong>{dueSoon.length}</strong><span>Due in 7 days</span></div><small>Not overdue yet</small></article></a><a href="#unassigned-activities"><article><div className="metric-icon unassigned">○</div><div><strong>{unassigned.length}</strong><span>Unassigned</span></div><small>Ready for a team member</small></article></a></section><section className="portfolio-card"><div className="section-head"><div><p className="eyebrow">Portfolio timeline</p><h2>Active projects</h2></div><div className="timeline-visibility"><label><input type="checkbox" checked={showDraft} onChange={event=>setShowDraft(event.target.checked)}/> Draft</label><label><input type="checkbox" checked={showCompleted} onChange={event=>setShowCompleted(event.target.checked)}/> Completed</label><Link href="/projects">View all →</Link></div></div><div className="range-tabs">{(['Week','Month','Quarter','Half-year','Year','All Events'] as const).map(option=><button className={range===option?'selected':''} onClick={()=>setRange(option)} key={option}>{option}</button>)}</div><div className="gantt desktop-only"><div className="gantt-header"><div>Project</div><div className="weeks">{ticks.map(tick=><span key={tick}>{date(tick)}</span>)}</div></div>{visible.map(project=><div className="gantt-row" key={project.id}><Link className="project-label" href={`/projects/${project.id}`}><strong>{project.name}</strong><span>{project.project_types?.name} · {progress(project,data.activities)}% complete</span></Link><div className="timeline"><div className={`bar status-${project.status}`} style={timelinePosition(project.start_date,project.end_date,domainStart,domainEnd)}><span>{statusLabel(project.status)}</span><b style={{width:`${progress(project,data.activities)}%`}}/></div></div></div>)}</div><div className="project-cards mobile-only">{visible.map(project=><ProjectCard key={project.id} p={project} activities={data.activities}/>)}</div></section><OwnerBreakdown data={data}/><div className="overview-attention-grid"><ActivityAttentionList id="overdue-activities" eyebrow="Past due" title="Overdue activities" empty="No incomplete activities are overdue." activities={overdue} onEdit={setEditingActivity}/><ActivityAttentionList id="due-soon-activities" eyebrow="Next seven days" title="Due soon" empty="No incomplete activities are due in the next seven days." activities={dueSoon} onEdit={setEditingActivity}/><ActivityAttentionList id="unassigned-activities" eyebrow="Ownership" title="Unassigned activities" empty="Every activity has a team member." activities={unassigned} onEdit={setEditingActivity}/></div>{editingActivity&&<ActivityPanel activity={editingActivity} data={data} onClose={()=>setEditingActivity(null)} onSaved={()=>{setEditingActivity(null);refresh();setToast('Activity changes saved.')}}/>}</>;
}
