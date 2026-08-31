'use client';

import { useState } from 'react';
import { date } from '../../lib/planning/dates';
import type { Activity, Dependency } from '../../lib/planning/types';

export function DependencyPicker({ activities, dependencies, onChange, initialId }: { activities: Activity[]; dependencies: Dependency[]; onChange: (dependencies: Dependency[]) => void; initialId?: string }) {
  const [search, setSearch] = useState('');
  const selectedIds = new Set(dependencies.map(dependency=>dependency.depends_on_activity_id));
  const selected = dependencies.map(dependency=>({dependency,activity:activities.find(activity=>activity.id===dependency.depends_on_activity_id)}));
  const available = activities.filter(activity=>activity.id!==initialId&&!selectedIds.has(activity.id)&&(activity.name+' '+(activity.projects?.name||'')).toLowerCase().includes(search.toLowerCase()));
  function add(activityId:string){onChange([...dependencies,{depends_on_activity_id:activityId,constraint_type:'finish_to_start'}])}
  function remove(activityId:string){onChange(dependencies.filter(dependency=>dependency.depends_on_activity_id!==activityId))}
  function setConstraint(activityId:string,constraint_type:Dependency['constraint_type']){onChange(dependencies.map(dependency=>dependency.depends_on_activity_id===activityId?{...dependency,constraint_type}:dependency))}
  return <fieldset className="dependency-picker"><legend>Prerequisites</legend><p>Choose activities that must finish before this activity can start or finish.</p>{selected.length?<div className="selected-dependencies">{selected.map(({dependency,activity})=><div className="selected-dependency" key={dependency.depends_on_activity_id}><div><strong>{activity?.name||'Archived activity'}</strong><small>{activity?.projects?.name} · due {activity?date(activity.due_date):'—'}</small></div><label>Constraint<select aria-label={`Constraint for ${activity?.name||'prerequisite'}`} value={dependency.constraint_type} onChange={event=>setConstraint(dependency.depends_on_activity_id,event.target.value as Dependency['constraint_type'])}><option value="finish_to_start">Finish to start</option><option value="finish_to_finish">Finish to finish</option></select></label><button type="button" className="remove-dependency" onClick={()=>remove(dependency.depends_on_activity_id)}>Remove</button></div>)}</div>:<p className="empty-state">No prerequisites assigned.</p>}<input aria-label="Search prerequisite activities" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search activities or projects"/>{available.length?<div className="dependency-options">{available.map(activity=><div className="dependency-option" key={activity.id}><button type="button" onClick={()=>add(activity.id)}><span>＋</span><strong>{activity.name}</strong><small>{activity.projects?.name} · due {date(activity.due_date)}</small></button></div>)}</div>:<p className="empty-state">No matching activities.</p>}</fieldset>;
}
