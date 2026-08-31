'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type View = 'overview' | 'projects' | 'activities' | 'administration' | 'project' | 'activity';

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
  return <aside className="sidebar"><div className="brand"><Image src="/threshold-logo-white.png" alt="Threshold" width={142} height={44} priority/><span>Projects</span></div><nav>{[['overview','/','⌂','Overview'],['projects','/projects','◇','Projects'],['activities','/activities','✓','Activities'],['administration','/administration','⚙','Administration']].map(([key,to,icon,label])=><Link key={key} href={to} className={`nav-item ${(view===key||(view==='project'&&key==='projects')||(view==='activity'&&key==='activities'))?'active':''}`}><span>{icon}</span>{label}</Link>)}</nav><div className="sidebar-foot"><div className="avatar">{initials}</div><div><strong>{name}</strong><small>Management team</small></div><button onClick={()=>supabase.auth.signOut().then(()=>location.href='/sign-in')}>Sign out</button></div></aside>;
}
