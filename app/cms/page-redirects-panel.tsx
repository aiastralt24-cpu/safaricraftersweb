'use client';
import {collectPageRedirectExport} from '../../lib/cms/page-redirect-export';
import {useEffect,useRef,useState} from 'react';
import {parseRedirectList,parseRedirectChange,parseSavedRedirectChange,redirectChangeStorageKey,type SavedRedirectChange} from '../../lib/cms/page-redirect-management';
type Props={site:string;record:string;actor:string;canPublish:boolean;canExport:boolean;disabled:boolean;api:(path:string,options?:RequestInit)=>Promise<any>};
type Listing=ReturnType<typeof parseRedirectList>;
type Row=Listing['items'][number];
export function PageRedirectsPanel({site,record,actor,canPublish,canExport,disabled,api}:Props){
 const [listing,setListing]=useState<Listing|null>(null),[review,setReview]=useState<Row|null>(null),[pending,setPending]=useState<SavedRedirectChange|null>(null),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const alive=useRef(true),lock=useRef(false),storageKey=redirectChangeStorageKey({actor,site,record});
 useEffect(()=>{alive.current=true;try{const raw=sessionStorage.getItem(storageKey);if(raw)setPending(parseSavedRedirectChange(raw,{actor,site,record}));setReady(true);}catch{setError('The saved redirect request cannot be read. Keep this tab open and restore browser storage access before changing redirects.');}return()=>{alive.current=false;};},[actor,site,record,storageKey]);
 async function send(body:unknown){return api('/api/cms/page-redirects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});}
 async function read(after:string|null=null,snapshot:string|null=null){const raw=await send({action:'list',site,record,after,snapshot});return parseRedirectList(raw.result,{site,record,after,snapshot});}
 async function run(work:()=>Promise<void>){if(lock.current||disabled)return;lock.current=true;setBusy(true);setError('');setMessage('');try{await work();}catch(e){if(alive.current)setError(e instanceof Error?e.message:'Redirects are unavailable.');}finally{lock.current=false;if(alive.current)setBusy(false);}}
 async function load(more=false){if(pending)return;setReview(null);await run(async()=>{try{const fresh=await read(more?listing?.nextCursor??null:null,more?listing?.snapshot??null:null);if(alive.current)setListing(old=>more&&old?{...fresh,items:[...old.items,...fresh.items]}:fresh);}catch(e){if(alive.current)setListing(null);throw e;}});}
 async function apply(command:SavedRedirectChange){await run(async()=>{
  let confirmed=false;
  try{
   const {actor:storedActor,...body}=command;
   const raw=await send({action:'set_enabled',...body});parseRedirectChange(raw.result,command);confirmed=true;
   const fresh=await read();
   sessionStorage.removeItem(storageKey);
   if(alive.current){setListing(fresh);setPending(null);setMessage('Redirect decision saved. The latest inventory is shown; another publisher may have made a newer change. Published-page cache refresh is queued separately.');}
  }catch(e){
   if(!confirmed&&e!==null&&typeof e==='object'&&'status' in e&&[409,422].includes(Number(e.status))){sessionStorage.removeItem(storageKey);if(alive.current){setPending(null);setListing(null);}}
   throw e;
  }
 });}
 async function download(){if(pending||!ready||!canExport)return;setReview(null);await run(async()=>{
  const exported=await collectPageRedirectExport({site,record},async(after,snapshot)=>(await send({action:'export',site,record,after,snapshot})).result);
  if(!alive.current)return;
  const url=URL.createObjectURL(new Blob([JSON.stringify(exported,null,2)+'\n'],{type:'application/json'})),link=document.createElement('a');
  try{link.href=url;link.download=`page-redirects-${record}.json`;document.body.appendChild(link);link.click();setMessage(`Export prepared with ${exported.redirects.length} redirects. Paused addresses and publication state are included.`);}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 });}
 function confirm(){if(lock.current||!review||pending||!ready||disabled||busy||!canPublish)return;const command:SavedRedirectChange={site,record,actor,sourcePath:review.sourcePath,version:review.version,enabled:!review.enabled,requestKey:crypto.randomUUID()};
  try{sessionStorage.setItem(storageKey,JSON.stringify(command));setPending(command);setReview(null);void apply(command);}catch{setError('Browser storage is unavailable. No redirect change was sent.');}
 }
 return <details className='cms-history'><summary>Page redirects</summary>
  <p>Old addresses point directly to this page. Pausing a redirect keeps its address reserved. Restoring it serves visitors only while the destination page is published.</p>
  <p>Unconfirmed changes are kept in this browser tab for reload recovery. Closing the tab removes that local copy; the saved inventory remains on the server.</p>
  {busy&&<p role='status'>Checking redirects…</p>}{error&&<p role='alert'>{error}</p>}{message&&<p role='status'>{message}</p>}
  {pending?<section aria-label='Pending redirect change'><p>{pending.enabled?'Restore':'Pause'} {pending.sourcePath}: the outcome is not yet confirmed. Retry the same request to recover its result and refresh the inventory.</p><button type='button' disabled={disabled||busy||!ready||!canPublish} onClick={()=>void apply(pending)}>Retry redirect change</button>{!canPublish&&<p>Publish permission is required to recover this request. Its details remain in this tab.</p>}</section>:<button type='button' disabled={disabled||busy||!ready} onClick={()=>void load()}>Load page redirects</button>}
  {canExport&&<button type='button' disabled={disabled||busy||!ready||Boolean(pending)||Boolean(review)} onClick={()=>void download()}>Export page redirects (JSON)</button>}
  {listing&&<section aria-label='Page redirect inventory'><p>Destination: {listing.path??'No current path'} · {listing.locale} · {listing.published?'Published':'Unpublished; enabled redirects are not served'}</p>{!listing.items.length&&<p>No redirects have been created for this page.</p>}
   <ul>{listing.items.map(row=><li key={row.sourcePath}><span style={{overflowWrap:'anywhere'}}>{row.sourcePath}</span><span> · {row.enabled?'Enabled':'Paused'} · Address reserved</span>{canPublish&&<button type='button' aria-label={`${row.enabled?'Pause':'Restore'} redirect ${row.sourcePath}`} disabled={disabled||busy||Boolean(pending)||Boolean(review)||!ready} onClick={()=>setReview(row)}>{row.enabled?'Pause':'Restore'}</button>}</li>)}</ul>
   {listing.nextCursor&&<button type='button' disabled={disabled||busy||Boolean(pending)||Boolean(review)} onClick={()=>void load(true)}>Load more redirects</button>}
  </section>}
  {review&&<section aria-label='Confirm redirect change'><p>{review.enabled?'Pause':'Restore'} the redirect from {review.sourcePath} to {listing?.path}? The old address will remain reserved.</p><button type='button' disabled={disabled||busy||!canPublish} onClick={confirm}>Confirm {review.enabled?'pause':'restore'} redirect</button><button type='button' disabled={busy} onClick={()=>setReview(null)}>Back to redirects</button></section>}
 </details>;
}
