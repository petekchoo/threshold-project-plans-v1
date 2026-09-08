'use client';

import Link from 'next/link';
import type { AppData } from '../../lib/planning/types';
import { statusLabel } from '../shared/status-pill';

export function OwnerBreakdown({ data }: { data: AppData }) {
  const rows=data.members.map(member=>({member,activities:data.activities.filter(activity=>activity.activity_owners?.some(owner=>owner.team_members.id===member.id))})),max=Math.max(1,...rows.map(row=>row.activities.length));
  const statuses = ['not_started','in_progress','blocked','completed'] as const;
  return <section className="breakdown overview-breakdown" aria-labelledby="workload-heading"><div className="section-head"><h2 id="workload-heading">Team workload</h2><Link href="/activities">View activities →</Link></div><p className="workload-description">Bar length shows relative activity count; segments show status.</p><ul className="workload-legend" aria-label="Activity status legend">{statuses.map(status=><li key={status}><i className={status.replace('_','-')} aria-hidden="true"/>{statusLabel(status)}</li>)}</ul>{rows.map(({member,activities})=>{const counts=statuses.map(status=>({status,count:activities.filter(item=>item.status===status).length}));const summary=counts.filter(item=>item.count).map(item=>`${item.count} ${statusLabel(item.status).toLowerCase()}`).join(', ')||'no activities';return <div className="owner-row" key={member.id}><span>{member.full_name}</span><div className="stack" style={{width:`${Math.max(4,activities.length/max*100)}%`}} role="img" aria-label={`${member.full_name}: ${activities.length} total activities; ${summary}`}>{counts.map(({status,count})=><i className={status.replace('_','-')} aria-hidden="true" key={status} style={{width:`${activities.length?count/activities.length*100:0}%`}}/>)}</div><strong aria-label={`${activities.length} total activities`}>{activities.length}</strong></div>})}</section>;
}
