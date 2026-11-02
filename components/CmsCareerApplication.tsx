'use client';
import {PublicEnquiryForm} from './PublicEnquiryForm';
import type {CareerFormOptions} from '@/lib/cms/career-form-client';
import {useEffect,useState} from 'react';
import {careerStateLabels,careerWindowState} from '@/lib/cms/career-display';
import type {PublishedCareer} from '@/lib/cms/published-career';
export function CmsCareerApplication({content,now,career}:{career?:CareerFormOptions;content:Pick<PublishedCareer['content'],'status'|'statusNote'|'opensAt'|'closesAt'|'application'>;now:number}){
 const [clock,setClock]=useState(now),[activated,setActivated]=useState(()=>careerWindowState(content,now)==='open');
 useEffect(()=>{const update=()=>setClock(Date.now());update();const timer=setInterval(update,1000);window.addEventListener('focus',update);return()=>{clearInterval(timer);window.removeEventListener('focus',update);};},[]);
 const state=careerWindowState(content,clock),application=content.application;
 useEffect(()=>{if(state==='open')setActivated(true);},[state]);
 return <section aria-label='Applications'><h2 className='h2'>Apply for this role</h2><p role='status'>{careerStateLabels[state]}</p>{content.statusNote&&<p>{content.statusNote}</p>}{content.opensAt&&<p>Opens: <time dateTime={content.opensAt}>{content.opensAt}</time></p>}{content.closesAt&&<p>Closes: <time dateTime={content.closesAt}>{content.closesAt}</time></p>}{application.mode==='form'&&career&&activated?<PublicEnquiryForm formId={application.formId} career={career} canStart={state==='open'}/>:state==='open'&&(application.mode==='external'?<a className='btn btn-primary' href={application.url}>{application.label}</a>:<p>Online applications are unavailable for this role.</p>)}</section>;
}
