'use client';
import {useEffect,useState} from 'react';
export type DocumentReleaseAction='publish'|'unpublish';
type State={id:string;currentRevision:string;publishedRevision:string|null;reviewStatus:string;permissions:{publish:boolean}};
export function DocumentRelease({record,disabled,onAction}:{record:State;disabled:boolean;onAction:(action:DocumentReleaseAction,revision:string)=>void}){
 const [pending,setPending]=useState<{action:DocumentReleaseAction;revision:string}|null>(null);
 useEffect(()=>setPending(null),[record.currentRevision,record.publishedRevision,record.reviewStatus,record.permissions.publish,disabled]);
 function confirm(){
  if(!pending||disabled||!record.permissions.publish)return;
  if(pending.action==='publish'&&(record.reviewStatus!=='approved'||pending.revision!==record.currentRevision))return;
  if(pending.action==='unpublish'&&pending.revision!==record.publishedRevision)return;
  setPending(null);onAction(pending.action,pending.revision);
 }
 return <section aria-label='Document publication'><h3>Document publication</h3><p>{record.publishedRevision?'A published document revision exists.':'No document revision is published.'} Downloads are available only where document delivery is enabled.</p>
 {record.publishedRevision&&<p><a href={`/documents/${record.id}`} target='_blank' rel='noopener noreferrer'>Open visitor download page</a></p>}
 {record.permissions.publish&&<div className='cms-actions'><button type='button' disabled={disabled||Boolean(pending)||record.reviewStatus!=='approved'||record.currentRevision===record.publishedRevision} onClick={()=>setPending({action:'publish',revision:record.currentRevision})}>Publish approved document</button>{record.publishedRevision&&<button type='button' disabled={disabled||Boolean(pending)} onClick={()=>setPending({action:'unpublish',revision:record.publishedRevision!})}>Withdraw published document</button>}</div>}
 {pending&&<section aria-label='Confirm document publication change'><h4>{pending.action==='publish'?'Publish this document?':'Withdraw this document?'}</h4><p>{pending.action==='publish'?'This makes the approved document available for download when delivery is enabled. Current trusted checks and PDF eligibility are required.':'Links to this document will stop serving downloads. For a correction, prefer restoring an earlier revision as a draft and publishing it. Drafts and history will be retained.'}</p><p>Revision: <code>{pending.revision}</code></p><button type='button' disabled={disabled} onClick={confirm}>{pending.action==='publish'?'Confirm document publication':'Confirm document withdrawal'}</button><button type='button' onClick={()=>setPending(null)}>Cancel document release</button></section>}
 </section>;
}
