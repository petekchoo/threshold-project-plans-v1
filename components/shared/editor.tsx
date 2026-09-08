'use client';

import { ActivityForm } from '../activities/activity-form';
import { ProjectCreateFlow } from '../projects/project-create-flow';
import type { AppData } from '../../lib/planning/types';
import { Icon } from './icon';
import { useDialogFocus } from './dialog-focus';

export function Editor({ kind, data, initialProjectId, onClose, onSaved }: { kind: 'project' | 'activity'; data: AppData; initialProjectId?: string; onClose: () => void; onSaved: () => void }) {
  const dialogRef = useDialogFocus<HTMLDivElement>();
  return <div className="modal-backdrop" onKeyDown={(event) => {
    if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }
  }}><div ref={dialogRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="create-editor-title" tabIndex={-1}>
    <button type="button" className="modal-close" onClick={onClose} aria-label="Close editor"><Icon name="close" size={22}/></button>
    <p className="eyebrow">Create new</p><h1 id="create-editor-title">{kind === 'project' ? 'Project' : 'Activity'}</h1>
    {kind === 'activity' ? <ActivityForm data={data} initialProjectId={initialProjectId} onCancel={onClose} onSaved={onSaved}/> : <ProjectCreateFlow data={data} onCancel={onClose} onSaved={onSaved}/>}
  </div></div>;
}
