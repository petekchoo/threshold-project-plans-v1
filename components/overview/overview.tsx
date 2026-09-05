'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ActivityPanel } from '../activities/activity-panel';
import { Heading } from '../shared/page-heading';
import { statusLabel } from '../shared/status-pill';
import { addDays, isoDate } from '../../lib/planning/dates';
import { overviewBarPosition, overviewTimeline, type OverviewRange } from '../../lib/planning/overview-timeline';
import { progress } from '../../lib/planning/progress';
import type { Activity, AppData } from '../../lib/planning/types';
import { ActivityAttentionList } from './activity-attention-list';
import { OwnerBreakdown } from './owner-breakdown';
import { ProjectCard } from './project-card';

const DEFAULT_OVERVIEW_RANGE: OverviewRange = 'Month';
const RANGE_OPTIONS: OverviewRange[] = ['Week','Month','Quarter','Half-year','Year','All Events'];

export function Overview({ data, refresh, setToast }: { data: AppData; refresh: () => void; setToast: (value: string) => void }) {
  const today = isoDate(new Date());
  const weekEnd = addDays(today, 7);
  const [range, setRange] = useState<OverviewRange>(DEFAULT_OVERVIEW_RANGE);
  const [showDraft, setShowDraft] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity|null>(null);
  const visible = data.projects.filter(project=>(showDraft||project.status!=='draft')&&(showCompleted||project.status!=='completed'));
  const scale = overviewTimeline(range, today, visible);
  const byDueThenName = (a: Activity, b: Activity) => a.due_date.localeCompare(b.due_date)||a.name.localeCompare(b.name);
  const overdue = data.activities.filter(activity=>activity.status!=='completed'&&activity.due_date<today).sort(byDueThenName);
  const dueSoon = data.activities.filter(activity=>activity.status!=='completed'&&activity.due_date>=today&&activity.due_date<=weekEnd).sort(byDueThenName);
  const unassigned = data.activities.filter(activity=>!activity.activity_owners?.length).sort(byDueThenName);
  const showTodayMarker = scale.todayPosition !== null && scale.todayPosition > 0 && scale.todayPosition < 100;
  const gridLines = [...scale.gridMarks.map((mark,index)=><i aria-hidden="true" className={`overview-grid-line ${index===scale.gridMarks.length-1?'is-terminal':''}`} key={mark.date} style={{left:`${mark.left}%`}}/>), ...(showTodayMarker?[<i aria-hidden="true" className="overview-today-marker" key="today" style={{left:`${scale.todayPosition}%`}}/>]:[])];
  const scaleLabel = `${range} timeline from ${scale.domainStart} through ${addDays(scale.domainEnd,-1)}, divided by ${scale.gridUnit}${showTodayMarker?', with today marked':''}`;

  return <><Heading eyebrow={new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric'}).format(new Date())} title="Threshold at a glance" copy="What is moving, what needs attention, and what comes next."/><section className="metric-grid"><a href="#overdue-activities"><article><div className="metric-icon overdue">!</div><div><strong>{overdue.length}</strong><span>Overdue activities</span></div><small>Incomplete work past its due date</small></article></a><a href="#due-soon-activities"><article><div className="metric-icon due">↗</div><div><strong>{dueSoon.length}</strong><span>Due in 7 days</span></div><small>Not overdue yet</small></article></a><a href="#unassigned-activities"><article><div className="metric-icon unassigned">○</div><div><strong>{unassigned.length}</strong><span>Unassigned</span></div><small>Ready for a team member</small></article></a></section><section className="portfolio-card"><div className="section-head"><div><p className="eyebrow">Portfolio timeline</p><h2>Active projects</h2></div><div className="timeline-visibility"><label><input type="checkbox" checked={showDraft} onChange={event=>setShowDraft(event.target.checked)}/> Draft</label><label><input type="checkbox" checked={showCompleted} onChange={event=>setShowCompleted(event.target.checked)}/> Completed</label><Link href="/projects">View all →</Link></div></div><div className="range-tabs" aria-label="Portfolio timeline range">{RANGE_OPTIONS.map(option=><button type="button" aria-pressed={range===option} className={range===option?'selected':''} onClick={()=>setRange(option)} key={option}>{option}</button>)}</div><div className="gantt desktop-only"><div className="gantt-header"><div>Project</div><div className="overview-scale" role="img" aria-label={scaleLabel}>{gridLines}{scale.marks.map(mark=><span aria-hidden="true" key={mark.date} style={{left:`${mark.left}%`,width:`${mark.width}%`}}>{mark.label}</span>)}</div></div>{visible.map(project=>{const position=overviewBarPosition(project.start_date,project.end_date,scale.domainStart,scale.domainEnd);return <div className="gantt-row" key={project.id}><Link className="project-label" href={`/projects/${project.id}`}><strong>{project.name}</strong><span>{project.project_types?.name} · {progress(project,data.activities)}% complete</span></Link><div className="timeline overview-timeline">{gridLines}{position&&<div className={`bar status-${project.status} ${position.extendsBefore?'bar-extends-before':''} ${position.extendsAfter?'bar-extends-after':''}`} style={{left:position.left,width:position.width}}><span>{statusLabel(project.status)}</span><b style={{width:`${progress(project,data.activities)}%`}}/></div>}</div></div>})}</div><div className="project-cards mobile-only">{visible.map(project=><ProjectCard key={project.id} p={project} activities={data.activities}/>)}</div></section><div className="overview-attention-grid"><ActivityAttentionList id="overdue-activities" eyebrow="Past due" title="Overdue activities" empty="No incomplete activities are overdue." activities={overdue} onEdit={setEditingActivity}/><ActivityAttentionList id="due-soon-activities" eyebrow="Next seven days" title="Due soon" empty="No incomplete activities are due in the next seven days." activities={dueSoon} onEdit={setEditingActivity}/><ActivityAttentionList id="unassigned-activities" eyebrow="Ownership" title="Unassigned activities" empty="Every activity has a team member." activities={unassigned} onEdit={setEditingActivity}/></div><OwnerBreakdown data={data}/>{editingActivity&&<ActivityPanel activity={editingActivity} data={data} onClose={()=>setEditingActivity(null)} onSaved={()=>{setEditingActivity(null);refresh();setToast('Activity changes saved.')}}/>}</>;
}
