'use client';

import {useEffect, useRef, useState} from 'react';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import {ArrowUpRight, Facebook, Instagram, Share2, X} from 'lucide-react';
import {quickActionLinks, showQuickActions, socialLinks} from '@/lib/quick-actions';
import './QuickActions.css';

export function QuickActions() {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const setOpen = (value: boolean) => setOpenPath(value ? pathname : null);
  const [page, setPage] = useState({pathname: '', title: ''});
  const root = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const previousPath = useRef(pathname);

  useEffect(() => {
    if (previousPath.current !== pathname) setOpenPath(null);
    previousPath.current = pathname;
    const frame = requestAnimationFrame(() => setPage({pathname, title: document.querySelector('main h1')?.textContent || ''}));
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLAnchorElement>('.quick-actions-social a')?.focus({preventScroll:true});
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); toggle.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  if (!showQuickActions(pathname)) return null;
  const links = quickActionLinks(pathname, page.pathname === pathname ? page.title : '');
  return <nav className="quick-actions" data-ready={page.pathname === pathname} aria-label="Quick contact and social links" ref={root}
    onBlur={event => {
      // Safari can blur the focused link with no next target on pointer-down.
      // Keep the panel mounted until the anchor's click has opened its destination.
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
    }}>
    {open && <div className="quick-actions-social" id="quick-actions-social">
      <p>Follow the journey</p>
      <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram (opens in a new tab)"><Instagram size={19} aria-hidden="true"/>Instagram<ArrowUpRight size={15} aria-hidden="true"/></a>
      <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook (opens in a new tab)"><Facebook size={19} aria-hidden="true"/>Facebook<ArrowUpRight size={15} aria-hidden="true"/></a>
    </div>}
    <div className="quick-actions-bar">
      <button ref={toggle} type="button" aria-expanded={open} aria-controls="quick-actions-social" onClick={() => setOpen(!open)}>
        {open ? <X size={19} aria-hidden="true"/> : <Share2 size={19} aria-hidden="true"/>}<span>Social</span>
      </button>
      <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp with Safari Crafters (opens in a new tab)">
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.6-4.8a8.5 8.5 0 1 1 15.9-4.2Z"/><path d="m8 7 2 3-1.2 1.2a8 8 0 0 0 4 4L14 14l3 2c-1 3-4 1.5-6.5-1S6.5 10 8 7Z"/></svg><span>WhatsApp</span>
      </a>
      <Link href={links.enquiry} className="quick-actions-enquire" onClick={() => setOpen(false)}><ArrowUpRight size={20} aria-hidden="true"/><span>Enquire</span></Link>
    </div>
  </nav>;
}
