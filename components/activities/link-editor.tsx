'use client';

import { useEffect, useRef, useState } from 'react';
import type { ActivityLink } from '../../lib/planning/types';

export function LinkEditor({ links, onChange }: { links: ActivityLink[]; onChange: (links: ActivityLink[]) => void }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const urlInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  function showEditor() {
    setLabel('');
    setUrl('');
    setOpen(true);
  }

  function closeEditor() {
    setOpen(false);
    setLabel('');
    setUrl('');
  }

  function save() {
    if (!urlInput.current?.reportValidity()) return;
    onChange([...links, { label: label.trim(), url: url.trim() }]);
    closeEditor();
  }

  return <fieldset className="form-section link-editor"><legend>External links</legend><p>Add reference documents, menus, vendor pages, or other URLs needed for the work.</p>{links.length?<div className="link-tiles">{links.map((link,index)=><div className="link-tile" key={link.id||`${link.url}-${index}`}><a href={link.url} target="_blank" rel="noopener noreferrer"><strong>{link.label||link.url}</strong><small>{link.url}</small></a><button type="button" onClick={()=>onChange(links.filter((_,itemIndex)=>itemIndex!==index))} aria-label={`Remove ${link.label||link.url}`}>Remove</button></div>)}</div>:null}<button type="button" className="secondary-btn add-link" onClick={showEditor}>＋ Add link</button>{open&&<div className="picker-backdrop" data-editor-child-modal="true" onClick={event=>{if(event.target===event.currentTarget)closeEditor()}}><section className="member-picker-modal link-picker-modal" role="dialog" aria-modal="true" aria-labelledby="link-picker-title"><div className="section-head"><div><p className="eyebrow">External reference</p><h2 id="link-picker-title">Add link</h2></div><button type="button" className="modal-close" onClick={closeEditor} aria-label="Close link editor">×</button></div><div className="link-picker-fields"><label>Label<input autoFocus value={label} onChange={event=>setLabel(event.target.value)} placeholder="Link label (optional)"/></label><label>URL<input ref={urlInput} type="url" required value={url} onChange={event=>setUrl(event.target.value)} placeholder="https://"/></label><div className="form-actions"><button type="button" className="secondary-btn" onClick={closeEditor}>Cancel</button><button type="button" className="create-btn" onClick={save}>Save link</button></div></div></section></div>}</fieldset>;
}
