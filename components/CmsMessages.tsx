'use client';
import type {ReactNode} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import type {GlobalSettings} from '../lib/cms/global-settings';
import './CmsMessages.css';

export function CmsMessages({settings,children}:{settings:Pick<GlobalSettings,'announcement'|'stickyCta'>;children:ReactNode}){
 const pathname=usePathname();
 // Administration and preview surfaces must not inherit public promotional controls.
 if(['/cms','/studio','/preview'].some(prefix=>pathname===prefix||pathname.startsWith(`${prefix}/`)))return <>{children}</>;
 const {announcement,stickyCta}=settings;
 const button=stickyCta.enabled?stickyCta.button:undefined;
 return <>
  {announcement.enabled&&<aside className="cms-announcement" aria-label={announcement.title||'Website announcement'}>
   {announcement.title&&<h2>{announcement.title}</h2>}
   {announcement.body&&<p>{announcement.body}</p>}
   {announcement.button&&<Link href={announcement.button.href} target={announcement.button.newWindow?'_blank':undefined} rel={announcement.button.newWindow?'noopener noreferrer':undefined}>{announcement.button.label}</Link>}
  </aside>}
  {children}
  {button&&<div className="cms-sticky-cta-space"><Link className="cms-sticky-cta" href={button.href} target={button.newWindow?'_blank':undefined} rel={button.newWindow?'noopener noreferrer':undefined}>{button.label}</Link></div>}
 </>;
}
