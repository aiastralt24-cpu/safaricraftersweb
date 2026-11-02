'use client';
import {useEffect} from 'react';
import {requiresDocumentNavigation} from '../lib/cms/localized-request';
/** Root layouts persist in Next.js. These boundaries need a fresh document and language. */
export function LocalizedDocumentNavigation(){
 useEffect(()=>{
  const navigate=(event:MouseEvent)=>{
   if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   const link=event.target instanceof Element?event.target.closest('a'):null;
   if(!link||link.hasAttribute('download')||(link.target&&link.target!=='_self'))return;
   const url=new URL(link.href,location.href);
   if(url.origin!==location.origin||!requiresDocumentNavigation(location.pathname,url.pathname))return;
   if(url.pathname===location.pathname&&url.search===location.search&&url.hash)return;
   event.preventDefault();event.stopPropagation();location.assign(url.href);
  };
  document.addEventListener('click',navigate,true);return()=>document.removeEventListener('click',navigate,true);
 },[]);
 return null;
}
