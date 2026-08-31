'use client';

import type { ActivityLink } from '../../lib/planning/types';

export function LinkEditor({ links, onChange }: { links: ActivityLink[]; onChange: (links: ActivityLink[]) => void }) {
  return <fieldset className="form-section link-editor"><legend>External links</legend><p>Add reference documents, menus, vendor pages, or other URLs needed for the work.</p>{links.map((link,index)=><div className="link-edit-row" key={link.id||index}><input aria-label={`Link ${index+1} label`} placeholder="Label (optional)" value={link.label||''} onChange={event=>onChange(links.map((item,itemIndex)=>itemIndex===index?{...item,label:event.target.value}:item))}/><input aria-label={`Link ${index+1} URL`} type="url" placeholder="https://" value={link.url} onChange={event=>onChange(links.map((item,itemIndex)=>itemIndex===index?{...item,url:event.target.value}:item))}/><button type="button" onClick={()=>onChange(links.filter((_,itemIndex)=>itemIndex!==index))}>Remove</button></div>)}<button type="button" className="secondary-btn add-link" onClick={()=>onChange([...links,{label:'',url:''}])}>＋ Add link</button></fieldset>;
}
