'use client';

import Link from 'next/link';
import type { AppData } from '../../lib/planning/types';

export function OwnerBreakdown({ data }: { data: AppData }) {
  const rows=data.members.map(member=>({member,activities:data.activities.filter(activity=>activity.activity_owners?.some(owner=>owner.team_members.id===member.id))})),max=Math.max(1,...rows.map(row=>row.activities.length));
  return <section className="breakdown overview-breakdown"><div className="section-head"><div><p className="eyebrow">Team workload</p><h2>Activity breakdown by team member</h2></div><Link href="/activities">View activities →</Link></div>{rows.map(({member,activities})=><div className="owner-row" key={member.id}><span>{member.full_name.split(' ')[0]}</span><div className="stack" style={{width:`${Math.max(4,activities.length/max*100)}%`}}>{(['not_started','in_progress','blocked','completed'] as const).map(status=><i className={status.replace('_','-')} key={status} style={{width:`${activities.length?activities.filter(activity=>activity.status===status).length/activities.length*100:0}%`}}/>)}</div><strong>{activities.length}</strong></div>)}</section>;
}
