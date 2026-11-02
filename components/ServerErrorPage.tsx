'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import type {GlobalSettings} from '../lib/cms/global-settings';
import {fetchServerErrorMessage} from '../lib/cms/error-message-client';
export function ServerErrorPage({reset}:{reset:()=>void}){
 const [message,setMessage]=useState<GlobalSettings['errors']['serverError']>();
 useEffect(()=>{const controller=new AbortController();void fetchServerErrorMessage(controller.signal).then(value=>{if(!controller.signal.aborted)setMessage(value);});return()=>controller.abort();},[]);
 const button=message?message.button:{label:'Return Home',href:'/',newWindow:false};
 return <section className="section" style={{minHeight:'70vh',paddingTop:150,textAlign:'center',overflowWrap:'anywhere'}}>
  <div className="container"><p className="eyebrow">500</p>
   <h1 className="h1">{message?.title??'This page couldn’t load.'}</h1>
   <p className="intro" style={{whiteSpace:'pre-wrap'}}>{message?.body??'Please try again. If the problem continues, contact info@safaricrafters.com.'}</p>
   <button className="button button-solid" onClick={reset} type="button">Try again</button>{' '}
   {button&&<Link className="button" href={button.href} target={button.newWindow?'_blank':undefined} rel={button.newWindow?'noopener noreferrer':undefined}>{button.label}</Link>}
  </div>
 </section>;
}
