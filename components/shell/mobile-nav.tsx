'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

export function MobileNav() {
  const [more, setMore] = useState(false);
  const pathname = usePathname();
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!more) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMore(false);
        requestAnimationFrame(() => moreButtonRef.current?.focus());
      } else if (event.key === 'Tab') {
        const menu = document.getElementById('mobile-more-menu');
        const focusable = [...(menu?.querySelectorAll<HTMLElement>('a[href],button:not([disabled])') || [])];
        const first = focusable[0], last = focusable.at(-1);
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [more]);

  const closeMore = () => {
    setMore(false);
    requestAnimationFrame(() => moreButtonRef.current?.focus());
  };
  const isOverview = pathname === '/';
  const isProjects = pathname === '/projects' || pathname.startsWith('/projects/');
  const isActivities = pathname === '/activities' || pathname.startsWith('/activities/');
  const isMoreDestination = pathname === '/administration';

  return <>
    {more && <div className="mobile-more-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) closeMore();
    }}>
      <div id="mobile-more-menu" className="mobile-more" role="dialog" aria-modal="true" aria-label="More navigation">
        <button ref={closeButtonRef} aria-label="Close menu" onClick={closeMore}>×</button>
        <Link href="/administration" aria-current={isMoreDestination ? 'page' : undefined} onClick={() => setMore(false)}>Administration</Link>
        <button onClick={() => supabase.auth.signOut().then(() => location.href = '/sign-in')}>Sign out</button>
      </div>
    </div>}
    <nav className="bottom-nav" aria-label="Primary navigation">
      <Link href="/" aria-current={isOverview ? 'page' : undefined}><span aria-hidden="true">⌂</span>Overview</Link>
      <Link href="/projects" aria-current={isProjects ? 'page' : undefined}><span aria-hidden="true">◇</span>Projects</Link>
      <Link href="/activities" aria-current={isActivities ? 'page' : undefined}><span aria-hidden="true">✓</span>Activities</Link>
      <button ref={moreButtonRef} type="button" aria-expanded={more} aria-haspopup="dialog" aria-controls="mobile-more-menu" aria-current={isMoreDestination ? 'page' : undefined} onClick={() => setMore(true)}><span aria-hidden="true">•••</span>More</button>
    </nav>
  </>;
}
