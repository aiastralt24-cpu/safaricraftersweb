'use client';
import {useEffect,useState} from 'react';
type RecordState={currentRevision:string;reviewStatus:string;publishedRevision:string|null;permissions:{submit:boolean;approve:boolean;publish:boolean}};
export function ProjectWorkflow({record,disabled,onAction}:{record:RecordState;disabled:boolean;onAction:(action:string,revision?:string)=>void}){
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
 {record.permissions.publish&&<><button disabled={disabled||Boolean(pending)||record.reviewStatus!=='approved'} onClick={()=>setPending({action:'publish',revision:record.currentRevision})}>Publish approved project</button>{record.publishedRevision&&<button disabled={disabled||Boolean(pending)} onClick={()=>setPending({action:'unpublish',revision:record.publishedRevision!})}>Unpublish project</button>}</>}
 {pending&&<section className='cms-confirmation' aria-label='Confirm project publication change'><h3>{pending.action==='publish'?'Publish this approved project?':'Withdraw this project?'}</h3><p>{pending.action==='publish'?'A current trusted validation receipt is required. Visitor delivery also requires the configured project rollout.':'The published project will be withdrawn. Drafts and revision history will be retained.'}</p><p>Revision: <code>{pending.revision}</code></p><button disabled={disabled} onClick={confirm}>{pending.action==='publish'?'Confirm publication':'Confirm withdrawal'}</button><button onClick={()=>setPending(null)}>Cancel</button></section>}
 </div>;
}
