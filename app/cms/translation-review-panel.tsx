'use client';
import {useEffect,useRef,useState} from 'react';
import {loadTranslationComparison,type TranslationComparison} from '../../lib/cms/translation-comparison';
import {verifiedTranslationStatus,type TranslationStatus} from '../../lib/cms/translation-status';
type Props={site:string;record:string;revision:string;canApprove:boolean;disabled:boolean;api:(path:string,options?:RequestInit)=>Promise<any>};
const labels={unreviewed:'Translation has not been reviewed',source_changed:'Source changed — translation needs review',translation_changed:'Translation changed — review needed',current:'Translation review is current'};
/** Mount with an account/site/record/revision key, like the surrounding saved-revision tools. */
export function TranslationReviewPanel({site,record,revision,canApprove,disabled,api}:Props){
 const [status,setStatus]=useState<TranslationStatus|null>(null),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[confirmed,setConfirmed]=useState(false);
 const [comparison,setComparison]=useState<TranslationComparison|null>(null),[offset,setOffset]=useState(0);
 const epoch=useRef(0),pending=useRef(false),comparisonHeading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{if(comparison){comparisonHeading.current?.focus({preventScroll:true});comparisonHeading.current?.scrollIntoView({block:'start'});}},[comparison,offset]);
 useEffect(()=>{epoch.current++;setConfirmed(false);setComparison(null);setOffset(0);return()=>{epoch.current++;};},[site,record,revision,disabled,canApprove]);
 async function run(action:'read'|'review'|'compare'){
  if(pending.current||disabled||(action==='review'&&(!canApprove||!confirmed||!comparison||!status||status.status==='current')))return;
  pending.current=true;setBusy(true);setMessage('');setConfirmed(false);const ticket=epoch.current;setComparison(null);setOffset(0);
  try{
   if(action==='compare'){if(!status)throw Error('Refresh translation status first.');const result=await loadTranslationComparison(api,site,status);if(epoch.current===ticket)setComparison(result);return;}

   const body=await api('/api/cms/translations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(action==='read'?{action,site,record}:{action,site,record,revision,sourceRevision:status!.currentSourceRevisionId})});
   const next=verifiedTranslationStatus(body.result,record,revision);
   if(action==='review'&&(!next||next.status!=='current'||next.currentSourceRevisionId!==status!.currentSourceRevisionId))throw Error('Translation review could not be verified. Refresh the status before retrying.');
   if(epoch.current!==ticket)return;
   setStatus(next);setLoaded(true);if(action==='review')setMessage('Translation review recorded. Normal approval, validation and publication are still required.');
  }catch(error){if(epoch.current===ticket){setStatus(null);setLoaded(false);setMessage(error instanceof Error?error.message:'Translation request failed. Refresh its status before retrying.');}}
  finally{pending.current=false;setBusy(false);}
 }
 return <details className='cms-history'><summary>Translation review</summary>
  <p>Check whether this saved translation still matches its source. Copying a source draft does not translate its text.</p>
  <button type='button' disabled={disabled||busy} onClick={()=>void run('read')}>Refresh translation status</button>
  {disabled&&<p>Save or discard your changes and finish the current operation before checking translation review.</p>}
  {message&&<p role='status'>{message}</p>}
  {loaded&&!status&&<p>This record has no linked translation source.</p>}
  {status&&<><p role='status'>{labels[status.status]}</p><p>Source language: {status.sourceLocale}. Translation language: {status.locale}.</p>
   <details><summary>Source and revision references</summary><p>Source record: <code>{status.sourceRecordId}</code></p><p>Current source revision: <code>{status.currentSourceRevisionId}</code></p><p>Source revision used at the last review or creation: <code>{status.sourceRevisionId}</code></p><p>Saved translation revision: <code>{status.revisionId}</code></p></details>
   <button type='button' disabled={disabled||busy} onClick={()=>void run('compare')}>Compare saved source and translation</button>
   {comparison&&<section aria-label='Saved translation comparison'><h3 ref={comparisonHeading} tabIndex={-1}>Saved content comparison</h3><p>{comparison.sourceTitle} ({status.sourceLocale}) → {comparison.translationTitle} ({status.locale}). Lists are compared in their saved order. Asset and linked-record references are shown as IDs; inspect the media and links in the editor too.</p><p>Fields {offset+1}–{Math.min(offset+40,comparison.fields.length)} of {comparison.fields.length}. Matching values are included.</p><div className='cms-translation-comparison'>{comparison.fields.slice(offset,offset+40).map(field=><section key={field.id}><h4>{field.label}{field.equal?' · Same value':''}</h4><div><div><strong>Source · {status.sourceLocale}</strong><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{field.source.text}</p><small>{field.source.kind}</small></div><div><strong>Translation · {status.locale}</strong><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{field.translation.text}</p><small>{field.translation.kind}</small></div></div></section>)}</div><button type='button' disabled={offset===0} onClick={()=>setOffset(Math.max(0,offset-40))}>Previous comparison fields</button><button type='button' disabled={offset+40>=comparison.fields.length} onClick={()=>setOffset(offset+40)}>Next comparison fields</button></section>}
   {canApprove&&status.status!=='current'&&<fieldset disabled={disabled||busy}><legend>Review this saved translation</legend><p>Compare the saved translation with the current source before confirming. A separate reviewer is required when configured for this website. Publication may still be unavailable for this language.</p>{!comparison&&<p>Load the saved comparison before confirming this review.</p>}<label><input type='checkbox' disabled={!comparison} checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I checked the translated content against the current source, including links, images and language-specific details.</label><button type='button' disabled={!confirmed} onClick={()=>void run('review')}>Confirm translation review</button></fieldset>}
  </>}
 </details>;
}
