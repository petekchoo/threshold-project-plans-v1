'use client';

import { useState } from 'react';
import type { Member } from '../../lib/planning/types';

export function TeamMemberPicker({ members, selected, onChange, label, copy }: { members: Member[]; selected: string[]; onChange: (ids: string[]) => void; label: string; copy: string }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<string[]>([]);
  const assigned = selected.map(id=>members.find(member=>member.id===id)).filter((member):member is Member=>!!member);
  const available = members.filter(member=>member.full_name.toLowerCase().includes(search.toLowerCase()));
  function showPicker(){setDraft(selected);setSearch('');setOpen(true)}
  function closePicker(){setOpen(false);setSearch('')}
  return <fieldset className="form-section owner-picker"><legend>{label}</legend><p>{copy}</p>{assigned.length?<div className="assigned-members">{assigned.map(member=><div className="assigned-member" key={member.id}><span className="avatar">{member.initials}</span><strong>{member.full_name}</strong><button type="button" onClick={()=>onChange(selected.filter(id=>id!==member.id))} aria-label={`Remove ${member.full_name}`}>Remove</button></div>)}</div>:<p className="empty-state">No team members assigned.</p>}<button type="button" className="secondary-btn add-member" onClick={showPicker}>＋ Add team member</button>{open&&<div className="picker-backdrop"><section className="member-picker-modal" role="dialog" aria-modal="true" aria-labelledby="member-picker-title"><div className="section-head"><div><p className="eyebrow">Team directory</p><h2 id="member-picker-title">Add team members</h2></div><button type="button" className="modal-close" onClick={closePicker} aria-label="Close team member picker">×</button></div><input autoFocus aria-label="Search team members" placeholder="Search team members" value={search} onChange={event=>setSearch(event.target.value)}/>{available.length?<div className="member-picker-options">{available.map(member=><label key={member.id}><input type="checkbox" checked={draft.includes(member.id)} onChange={()=>setDraft(current=>current.includes(member.id)?current.filter(id=>id!==member.id):[...current,member.id])}/><span className="avatar">{member.initials}</span><strong>{member.full_name}</strong></label>)}</div>:<p className="empty-state">No matching team members.</p>}<div className="form-actions"><button type="button" className="secondary-btn" onClick={closePicker}>Cancel</button><button type="button" className="create-btn" onClick={()=>{onChange(draft);closePicker()}}>Save team members</button></div></section></div>}</fieldset>;
}
