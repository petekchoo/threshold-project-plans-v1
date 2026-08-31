'use client';

import { Heading } from '../shared/page-heading';
import type { AppData } from '../../lib/planning/types';
import { AdminList } from './admin-list';

export function Administration({ data, refresh, setToast }: { data: AppData; refresh: () => void; setToast: (value: string) => void }) {
  return <><Heading eyebrow="Workspace settings" title="Administration" copy="Manage the shared team directory and planning vocabulary."/><div className="admin-grid"><AdminList title="Team members" rows={data.members.map(member=>({id:member.id,name:member.full_name,meta:member.email||member.initials}))} table="team_members" data={data} refresh={refresh} setToast={setToast}/><AdminList title="Project types" rows={data.projectTypes.map(type=>({id:type.id,name:type.name,meta:'Project type'}))} table="project_types" data={data} refresh={refresh} setToast={setToast}/><AdminList title="Activity types" rows={data.activityTypes.map(type=>({id:type.id,name:type.name,meta:'Activity type'}))} table="activity_types" data={data} refresh={refresh} setToast={setToast}/></div></>;
}
