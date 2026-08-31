'use client';

import type { AppData } from '../../lib/planning/types';
import { ActivityForm as ExtractedActivityForm } from '../activities/activity-form';
import { ProjectForm } from '../projects/project-form';

export function Editor({ kind, data, initialProjectId, onClose, onSaved }: { kind: 'project'|'activity'; data: AppData; initialProjectId?: string; onClose: () => void; onSaved: () => void }) {
  return <div className="modal-backdrop"><div className="modal"><button className="modal-close" onClick={onClose}>×</button><p className="eyebrow">Create new</p><h1>{kind==='project'?'Project':'Activity'}</h1>{kind==='activity'?<ExtractedActivityForm data={data} initialProjectId={initialProjectId} onCancel={onClose} onSaved={onSaved}/>:<ProjectForm data={data} onCancel={onClose} onSaved={onSaved}/>}</div></div>;
}
