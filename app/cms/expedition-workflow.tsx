'use client';
import {useEffect,useState} from 'react';
type RecordState={currentRevision:string;reviewStatus:string;publishedRevision:string|null;permissions:{submit:boolean;approve:boolean;publish:boolean}};
export function ExpeditionWorkflow({record,disabled,onAction,subject='expedition',rollout='expedition'}:{record:RecordState;subject?:'expedition'|'listing page'|'specialist'|'legal page'|'About page'|'testimonial'|'homepage'|'custom page'|'localized custom page'|'conservation page'|'contact page'|'Private Aviation page'|'Bespoke Safaris page'|'Concept page'|'MICE page'|'Kenya page'|'Tanzania page';rollout?:'expedition'|'specialist'|'legal page'|'About page'|'testimonial'|'homepage'|'custom page'|'localized custom page'|'conservation page'|'contact page'|'Private Aviation page'|'Bespoke Safaris page'|'Concept page'|'MICE page'|'Kenya page'|'Tanzania page';disabled:boolean;onAction:(action:string,revision?:string)=>void}){
 const [pending,setPending]=useState<{action:'publish'|'unpublish';revision:string}|null>(null);
 useEffect(()=>setPending(null),[record.currentRevision,record.reviewStatus,record.publishedRevision,record.permissions.publish,disabled]);
 function confirm(){
  if(!pending||disabled||!record.permissions.publish)return;
  if(pending.action==='publish'&&(record.reviewStatus!=='approved'||record.currentRevision!==pending.revision))return;
  if(pending.action==='unpublish'&&record.publishedRevision!==pending.revision)return;
  setPending(null);onAction(pending.action,pending.revision);
 }
 return <div className='cms-actions'>
 {record.permissions.submit&&<button disabled={disabled||Boolean(pending)||!['draft','changes_requested'].includes(record.reviewStatus)} onClick={()=>onAction('submit')}>Submit for review</button>}
 {record.permissions.approve&&record.reviewStatus==='in_review'&&<><button disabled={disabled||Boolean(pending)} onClick={()=>onAction('approve')}>Approve revision</button><button disabled={disabled||Boolean(pending)} onClick={()=>onAction('request_changes')}>Request changes</button></>}
 {record.permissions.publish&&<><button disabled={disabled||Boolean(pending)||record.reviewStatus!=='approved'} onClick={()=>setPending({action:'publish',revision:record.currentRevision})}>{`Publish approved ${subject}`}</button>{record.publishedRevision&&<button disabled={disabled||Boolean(pending)} onClick={()=>setPending({action:'unpublish',revision:record.publishedRevision!})}>{`Unpublish ${subject}`}</button>}</>}
 {pending&&<section className='cms-confirmation' aria-label={`Confirm ${subject} publication change`}><h3>{pending.action==='publish'?`Publish this approved ${subject}?`:`Withdraw this ${subject}?`}</h3><p>{pending.action==='publish'?subject==='testimonial'?'A current trusted validation receipt and granted consent are required. Published reviews appear only on pages configured to use them.':`A current trusted validation receipt is required. Visitor delivery also requires the configured ${rollout} rollout.`:`The published ${subject} will be withdrawn. Drafts and revision history will be retained.`}</p><p>Revision: <code>{pending.revision}</code></p><button disabled={disabled} onClick={confirm}>{pending.action==='publish'?'Confirm publication':'Confirm withdrawal'}</button><button onClick={()=>setPending(null)}>Cancel</button></section>}
 </div>;
}
