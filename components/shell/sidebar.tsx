'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type View = 'overview' | 'projects' | 'activities' | 'templates' | 'administration' | 'project' | 'activity' | 'template';

export function Sidebar({ view }: { view: View }) {
  const [name, setName] = useState('Management user');
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const profile = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      setName(profile.data?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Management user');
    });
  }, []);
  const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return <aside className="sidebar"><div className="brand"><div className="brand-logo-crop"><Image src="/threshold-logo-white.png" alt="Threshold" width={178} height={178} priority/></div><span>Projects</span></div><nav>{[['overview','/','⌂','Overview'],['projects','/projects','◇','Projects'],['activities','/activities','✓','Activities'],['templates','/templates','▤','Templates'],['administration','/administration','⚙','Administration']].map(([key,to,icon,label])=><Link key={key} href={to} className={`nav-item ${(view===key||(view==='project'&&key==='projects')||(view==='activity'&&key==='activities')||(view==='template'&&key==='templates'))?'active':''}`}><span>{icon}</span>{label}</Link>)}</nav><div className="sidebar-foot"><div className="avatar">{initials}</div><div><strong>{name}</strong><small>Management team</small></div><button onClick={()=>supabase.auth.signOut().then(()=>location.href='/sign-in')}>Sign out</button></div></aside>;
}
