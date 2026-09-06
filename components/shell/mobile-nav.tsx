'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

const destinations = [
  ['/', '⌂', 'Overview'],
  ['/projects', '◇', 'Projects'],
  ['/activities', '✓', 'Activities'],
  ['/administration', '⚙', 'Administration'],
] as const;

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const closeMenu = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) requestAnimationFrame(() => menuButtonRef.current?.focus());
  };

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
      } else if (event.key === 'Tab') {
        const drawer = document.getElementById('mobile-navigation-drawer');
        const focusable = [...(drawer?.querySelectorAll<HTMLElement>('a[href],button:not([disabled])') || [])];
        const first = focusable[0], last = focusable.at(-1);
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const current = (href: string) => href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  return <>
    <header className="mobile-header">
      <Link className="mobile-header-brand" href="/" aria-label="Threshold overview">
        <Image src="/threshold-logo.png" alt="" width={150} height={54} priority/>
      </Link>
      <button ref={menuButtonRef} className="mobile-menu-button" type="button" aria-label="Open menu" aria-expanded={open} aria-haspopup="dialog" aria-controls="mobile-navigation-drawer" onClick={() => setOpen(true)}>
        <span aria-hidden="true"/><span aria-hidden="true"/><span aria-hidden="true"/>
      </button>
    </header>
    {open && <div className="mobile-menu-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) closeMenu();
    }}>
      <section id="mobile-navigation-drawer" className="mobile-menu-drawer" role="dialog" aria-modal="true" aria-label="Main menu">
        <div className="mobile-menu-heading"><span>Menu</span><button ref={closeButtonRef} type="button" aria-label="Close menu" onClick={() => closeMenu()}>×</button></div>
        <nav aria-label="Primary navigation">
          {destinations.map(([href, icon, label]) => <Link href={href} key={href} aria-current={current(href) ? 'page' : undefined} onClick={() => closeMenu(false)}><span aria-hidden="true">{icon}</span>{label}</Link>)}
        </nav>
        <button className="mobile-menu-signout" type="button" onClick={() => supabase.auth.signOut().then(() => location.href = '/sign-in')}>Sign out</button>
      </section>
    </div>}
  </>;
}
