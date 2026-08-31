'use client';

import Link from 'next/link';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export function MobileNav() {
  const [more, setMore] = useState(false);
  return <>{more&&<div className="mobile-more"><button aria-label="Close menu" onClick={()=>setMore(false)}>×</button><Link href="/administration">Administration</Link><button onClick={()=>supabase.auth.signOut().then(()=>location.href='/sign-in')}>Sign out</button></div>}<nav className="bottom-nav"><Link href="/"><span>⌂</span>Overview</Link><Link href="/projects"><span>◇</span>Projects</Link><Link href="/activities"><span>✓</span>Activities</Link><button type="button" onClick={()=>setMore(true)}><span>•••</span>More</button></nav></>;
}
