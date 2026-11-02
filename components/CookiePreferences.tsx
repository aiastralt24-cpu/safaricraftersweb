'use client';
import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import type {GlobalSettings} from '../lib/cms/global-settings';
import {consentChangedEvent,consentStorageKey,readCookieConsent,saveCookieConsent} from '../lib/cookie-consent';
import './CookiePreferences.css';
const fallback:GlobalSettings['cookies']={title:'Cookie preferences',description:'Essential storage supports the website and shopping cart. With your permission, optional analytics helps us understand how visitors use the website.',acceptLabel:'Accept analytics',rejectLabel:'Reject analytics',preferencesLabel:'Cookie preferences',policy:{label:'Cookie policy',href:'/legal/cookies',newWindow:false}};
export function CookiePreferences({settings=fallback,saveError='Your preference could not be saved. Optional analytics is off for this visit. Allow website storage and try again.'}:{settings?:GlobalSettings['cookies'];saveError?:string}){
 const pathname=usePathname();const [ready,setReady]=useState(false),[open,setOpen]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const update=()=>{setReady(true);setOpen(!readCookieConsent());};const storage=(event:StorageEvent)=>{if(event.key===consentStorageKey||event.key===null)update();};update();window.addEventListener('storage',storage);window.addEventListener(consentChangedEvent,update);return()=>{window.removeEventListener('storage',storage);window.removeEventListener(consentChangedEvent,update);};},[]);
 if(!ready||['/cms','/studio','/preview'].some(prefix=>pathname===prefix||pathname.startsWith(`${prefix}/`)))return null;
 function choose(analytics:boolean){if(saveCookieConsent(analytics)){setError('');setOpen(false);}else setError(saveError);}
 return <div className="cookie-preferences">
  <button className="cookie-reopen" type="button" aria-expanded={open} aria-controls="cookie-preference-panel" onClick={()=>setOpen(!open)}>{settings.preferencesLabel}</button>
  {open&&<section id="cookie-preference-panel" className="cookie-panel" aria-labelledby="cookie-preference-title">
   <h2 id="cookie-preference-title">{settings.title}</h2><p>{settings.description}</p>
   {settings.policy&&<Link href={settings.policy.href} target={settings.policy.newWindow?'_blank':undefined} rel={settings.policy.newWindow?'noopener noreferrer':undefined}>{settings.policy.label}</Link>}
   <div className="cookie-actions"><button type="button" onClick={()=>choose(false)}>{settings.rejectLabel}</button><button type="button" onClick={()=>choose(true)}>{settings.acceptLabel}</button></div>
   {error&&<p role="alert">{error}</p>}
  </section>}
 </div>;
}
