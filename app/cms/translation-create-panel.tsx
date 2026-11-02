'use client';
import {useEffect,useRef,useState} from 'react';
import {translationCreateInput,submitTranslationCreation,retryTranslationCreation,cancelTranslationCreation,readPendingTranslation,acknowledgeTranslationCreation,type PendingTranslationCreation} from '../../lib/cms/translation-creation';
type Props={actor:string;site:string;source:string;revision:string;sourceLocale:string;path:string|null;type:string;disabled:boolean;api:(path:string,options?:RequestInit)=>Promise<any>;onLoaded:(record:any)=>void|Promise<void>;onWorking:(busy:boolean)=>void};
/** Key by actor/site/source/revision. Receipts survive failed opening and reloads. */
export function TranslationCreatePanel({actor,site,source,revision,sourceLocale,path,type,disabled,api,onLoaded,onWorking}:Props){
 const [locale,setLocale]=useState(''),[pending,setPending]=useState<PendingTranslationCreation|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[ready,setReady]=useState(false),[cancelConfirm,setCancelConfirm]=useState(false);
 const alive=useRef(true),lock=useRef(false),work=useRef(onWorking);work.current=onWorking;
 function refresh(){const p=readPendingTranslation(localStorage,actor,site,source);if(alive.current){setPending(p);setReady(true);}return p;}
 useEffect(()=>{alive.current=true;try{refresh();}catch(e){setMessage(e instanceof Error?e.message:'Recovery unavailable.');}const changed=()=>{try{refresh();}catch{setReady(false);setMessage('Recovery changed. Reload before continuing.');}};window.addEventListener('storage',changed);return()=>{alive.current=false;window.removeEventListener('storage',changed);if(lock.current)work.current(false);};},[]);
 function options(){return {storage:localStorage,locks:navigator.locks,actor,site,source,send:(request:unknown)=>api('/api/cms/translations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request)})};}
 async function open(result:{recordId:string;revisionId:string}){
  if(!alive.current)return;
  const saved=readPendingTranslation(localStorage,actor,site,source);if(!saved?.confirmed||saved.confirmed.recordId!==result.recordId)throw Error('Translation recovery changed. Reload before opening.');
  const response=await api(`/api/cms/content?site=${encodeURIComponent(site)}&record=${encodeURIComponent(result.recordId)}`),value=response.record;
  if(!alive.current)return;
  if(!value||value.id!==result.recordId||value.type!==type||value.locale!==saved.request.locale||value.path!==saved.request.path||typeof value.currentRevision!=='string'||!value.payload||!value.permissions||!Array.isArray(value.history))throw Error('The created translation could not be loaded safely. Its recovery request is retained.');
  await onLoaded(value);
  await acknowledgeTranslationCreation({...options(),record:result.recordId});
 }
 async function run(action:'create'|'retry'|'cancel'){
  if(disabled||lock.current||!ready)return;lock.current=true;setBusy(true);onWorking(true);setMessage('');setCancelConfirm(false);
  try{
   if(action==='cancel'){
    const result=await cancelTranslationCreation(options());
    if(result.status==='created')await open(result.result);else if(alive.current){setMessage('Creation cancelled. A delayed request cannot create this draft.');setLocale('');}
   }else if(action==='retry')await open(await retryTranslationCreation(options()));
   else{
    const input=translationCreateInput.parse({action:'create',site,source,sourceRevision:revision,locale,path});
    if(locale===sourceLocale)throw Error('Choose a language different from the source.');
    const current=await api('/api/cms/translations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'read',site,record:source})});
    if(!alive.current)return;if(current.result!==null)throw Error('Create translations from the primary source record.');
    await open(await submitTranslationCreation({...options(),input,now:()=>new Date(),newId:()=>crypto.randomUUID()}));
   }
  }catch(e){if(alive.current)setMessage(e instanceof Error?e.message:'Translation creation failed. Recover the stored request before retrying.');}
  finally{lock.current=false;if(alive.current){setBusy(false);try{refresh();}catch{setReady(false);}work.current(false);}}
 }
 const valid=translationCreateInput.safeParse({action:'create',site,source,sourceRevision:revision,locale,path}).success&&locale!==sourceLocale;
 return <details className='cms-history'><summary>Create a translation draft</summary><p>Copy this saved source into another language. You must translate its text and review its links and images. This does not publish anything; public delivery for the language may still be unavailable.</p>
  <p>{path===null?'This content uses a stable record reference and has no page URL.':`The draft keeps the source URL within its own language: ${path}.`} Recovery references stay in this browser until the draft opens or cancellation is confirmed.</p>{(type==='page'||type==='homepage')&&<p>Source-language section filters will follow the new language. An explicit source canonical URL is cleared; review SEO and linked content for the translation.</p>}{type==='document'&&<p>The source PDF is not copied. Upload the translated PDF before submitting the document for publication.</p>}
  {message&&<p role='status'>{message}</p>}
  {pending?<section aria-label='Pending translation creation'><p>{pending.confirmed?'Translation created — open the saved draft':'Translation request needs recovery'} · {pending.request.locale}</p><button type='button' disabled={disabled||busy||!ready} onClick={()=>void run('retry')}>Recover and open translation</button><button type='button' disabled={disabled||busy||!ready} onClick={()=>setCancelConfirm(true)}>Resolve or cancel creation</button>{cancelConfirm&&<><p>If creation already succeeded, this opens the existing draft. Otherwise it cancels the request permanently.</p><button type='button' disabled={disabled||busy} onClick={()=>void run('cancel')}>Confirm creation cancellation</button><button type='button' disabled={busy} onClick={()=>setCancelConfirm(false)}>Keep request</button></>}</section>:<fieldset disabled={disabled||busy||!ready}><legend>New translation</legend><label>Translation language code<input value={locale} onChange={e=>setLocale(e.target.value)} placeholder='fr or pt-BR' autoComplete='off'/></label><p>Source language: {sourceLocale}. Use a two- or three-letter language code, optionally followed by an uppercase country code.</p><button type='button' disabled={!valid} onClick={()=>void run('create')}>Create and open translation draft</button></fieldset>}
 </details>;
}
