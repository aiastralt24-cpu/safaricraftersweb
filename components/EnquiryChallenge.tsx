'use client';
import Script from 'next/script';
import {useEffect,useRef,useState} from 'react';
type Turnstile={render:(element:HTMLElement,options:Record<string,unknown>)=>string;remove:(id:string)=>void};
declare global{interface Window{turnstile?:Turnstile}}
export function EnquiryChallenge({siteKey,attempt,onToken,onError,action='cms_enquiry'}:{siteKey:string;attempt:number;action?:'cms_enquiry'|'cms_enquiry_upload';onToken:(token:string)=>void;onError:(message:string)=>void}){
 const element=useRef<HTMLDivElement>(null),callbacks=useRef({onToken,onError});callbacks.current={onToken,onError};const [ready,setReady]=useState(false);
 useEffect(()=>{if(!ready||!element.current||!window.turnstile)return;let active=true;let widget:string;try{widget=window.turnstile.render(element.current,{sitekey:siteKey,action,size:'flexible',callback:(token:string)=>{if(active)callbacks.current.onToken(token);},'expired-callback':()=>{if(active)callbacks.current.onToken('');},'error-callback':()=>{if(active){callbacks.current.onToken('');callbacks.current.onError('The verification check could not load. Please retry.');}}});}catch{callbacks.current.onToken('');callbacks.current.onError('The verification check could not load. Please retry.');return;}return()=>{active=false;try{window.turnstile?.remove(widget);}catch{/* Widget may already have been removed by the provider. */}};},[ready,siteKey,attempt,action]);
 return <><Script id='cms-turnstile' src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit' strategy='afterInteractive' onReady={()=>setReady(true)} onError={()=>onError('The verification check could not load. Please retry.')}/><div ref={element} aria-label='Submission verification'/></>;
}
