'use client';
import {useEffect,useState} from 'react';
export type SettingsReleaseAction='publish'|'unpublish';
type State={currentRevision:string;publishedRevision:string|null;reviewStatus:string;permissions:{publish:boolean}};
export function SettingsRelease({record,disabled,onAction}:{record:State;disabled:boolean;onAction:(action:SettingsReleaseAction,revision:string)=>void}){
 const [pending,setPending]=useState<{action:SettingsReleaseAction;revision:string}|null>(null);
 useEffect(()=>setPending(null),[record.currentRevision,record.publishedRevision,record.reviewStatus,record.permissions.publish,disabled]);
 function confirm(){
  if(!pending||disabled||!record.permissions.publish)return;
  if(pending.action==='publish'&&(record.reviewStatus!=='approved'||pending.revision!==record.currentRevision))return;
  if(pending.action==='unpublish'&&pending.revision!==record.publishedRevision)return;
  setPending(null);onAction(pending.action,pending.revision);
 }
 return <section aria-label='Settings publication'><h3>Settings publication</h3><p>{record.publishedRevision?'A published settings revision exists.':'No settings revision is published.'} Website changes appear only where CMS settings delivery is enabled.</p>
 {record.permissions.publish&&<div className='cms-actions'><button type='button' disabled={disabled||Boolean(pending)||record.reviewStatus!=='approved'||record.currentRevision===record.publishedRevision} onClick={()=>setPending({action:'publish',revision:record.currentRevision})}>Publish approved settings</button>{record.publishedRevision&&<button type='button' disabled={disabled||Boolean(pending)} onClick={()=>setPending({action:'unpublish',revision:record.publishedRevision!})}>Withdraw published settings</button>}</div>}
 {pending&&<section aria-label='Confirm settings publication change'><h4>{pending.action==='publish'?'Publish these website settings?':'Withdraw website settings?'}</h4><p>{pending.action==='publish'?'This changes shared website content. Current trusted checks, approval and configuration permission for sensitive changes are required.':'Website areas using CMS settings may become unavailable until settings are published again. For a correction, prefer restoring an earlier revision as a draft and publishing it. Drafts and history will be retained.'}</p><p>Revision: <code>{pending.revision}</code></p><button type='button' disabled={disabled} onClick={confirm}>{pending.action==='publish'?'Confirm settings publication':'Confirm settings withdrawal'}</button><button type='button' onClick={()=>setPending(null)}>Cancel settings release</button></section>}
 </section>;
}
