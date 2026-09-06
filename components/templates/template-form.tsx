'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import type { AppData, ProjectTemplate } from '../../lib/planning/types';
import { supabase } from '../../lib/supabase';
import { FormActions } from '../shared/form-actions';
import { RequiredMark } from '../shared/form-validation';

export function TemplateForm({ initial, data, onCancel, onSaved }: {
  initial?: ProjectTemplate;
  data: AppData;
  onCancel: () => void;
  onSaved: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    const result = await supabase.rpc('save_project_template', { p_template: {
      id: initial?.id || null,
      name: String(form.get('name')),
      project_type_id: String(form.get('type')),
    }});
    setBusy(false);
    if (result.error) setError(result.error.message); else onSaved(result.data);
  }
  return <form className="edit-form structured-form" onSubmit={submit}>
    <fieldset className="form-section"><legend>Template details</legend><p>Name the reusable plan and choose the project type inherited by new projects.</p>
      <label htmlFor="template-name">Name<RequiredMark/><input id="template-name" name="name" required defaultValue={initial?.name}/></label>
      <label htmlFor="template-type">Project type<RequiredMark/><select id="template-type" name="type" required defaultValue={initial?.project_type_id || data.projectTypes[0]?.id}>{data.projectTypes.map(type=><option value={type.id} key={type.id}>{type.name}</option>)}</select></label>
    </fieldset>
    {error&&<p className="form-error" role="alert">{error}</p>}<FormActions busy={busy} onCancel={onCancel}/>
  </form>;
}

