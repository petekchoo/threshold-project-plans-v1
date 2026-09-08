'use client';

import { useEffect } from 'react';
import type { Activity, AppData } from '../../lib/planning/types';
import { useDialogFocus } from '../shared/dialog-focus';
import { ActivityForm } from './activity-form';

export function ActivityPanel({ activity, data, onClose, onSaved }: { activity: Activity; data: AppData; onClose: () => void; onSaved: () => void }) {
  const dialogRef = useDialogFocus<HTMLElement>();
  useEffect(()=>{function handleKeyDown(event:KeyboardEvent){if(event.key==='Escape'&&!event.isComposing&&!document.querySelector('[data-editor-child-modal="true"]'))onClose()}document.addEventListener('keydown',handleKeyDown);return()=>document.removeEventListener('keydown',handleKeyDown)},[onClose]);
  return <div className="panel-backdrop" role="presentation" onClick={event=>{if(event.target===event.currentTarget)onClose()}}><section ref={dialogRef} className="activity-panel" role="dialog" aria-modal="true" aria-labelledby="activity-panel-title" tabIndex={-1}><header><div><p className="eyebrow">Edit within project</p><h1 id="activity-panel-title">{activity.name}</h1><p>Update this activity without leaving the project workspace.</p></div><button type="button" aria-label="Close activity editor" onClick={onClose}>×</button></header><ActivityForm initial={activity} data={data} onCancel={onClose} onSaved={onSaved}/></section></div>;
}
