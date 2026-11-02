'use client';
import {useEffect,useRef,useState} from 'react';
import {z} from 'zod';
import {documentFileSchema,documentFileUsageSchema} from '../../lib/cms/document-files';
import type {DocumentFile,DocumentFileUsage} from '../../lib/cms/document-files';
type Props={manageOnly?:boolean;initialFile?:string;site:string;api:(path:string,options?:RequestInit)=>Promise<any>;disabled:boolean;selected?:string;onSelect:(value:{assetId:string;downloadName:string})=>void;onDirty:(value:boolean)=>void};
export function DocumentFilePicker({site,api,disabled,selected,onSelect,onDirty,manageOnly=false,initialFile}:Props){
 const [rows,setRows]=useState<DocumentFile[]>([]),[more,setMore]=useState(false),[search,setSearch]=useState(''),[appliedSearch,setAppliedSearch]=useState(''),[file,setFile]=useState<DocumentFile|null>(null),[status,setStatus]=useState<DocumentFile['rightsStatus']>('pending'),[evidence,setEvidence]=useState(''),[expires,setExpires]=useState(''),[dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const [usage,setUsage]=useState<DocumentFileUsage[]>([]),[usageLoaded,setUsageLoaded]=useState(false),[usageMore,setUsageMore]=useState(false);
 const generation=useRef(0),working=useRef(false),apiRef=useRef(api);apiRef.current=api;
 useEffect(()=>onDirty(dirty),[dirty,onDirty]);
 async function command(body:Record<string,unknown>){return apiRef.current('/api/cms/document-files',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({site,...body})});}
 async function task(work:()=>Promise<unknown>){if(working.current)return;working.current=true;const current=generation.current;setBusy(true);setError('');try{await work();}catch(e){if(current===generation.current)setError(e instanceof Error?e.message:'Document files could not be loaded.');}finally{working.current=false;if(current===generation.current)setBusy(false);}}
 async function list(append=false){const current=generation.current,query=append?appliedSearch:search;const response=await command({action:'list',search:query,after:append?rows.at(-1)?.id??null:null});const values=z.array(documentFileSchema).max(50).parse(response.result);if(current!==generation.current)return;setRows(previous=>append?[...previous,...values]:values);setMore(values.length===50);setAppliedSearch(query);}
 useEffect(()=>{const current=++generation.current;setBusy(true);setError('');void list().then(async()=>{if(initialFile&&current===generation.current)await load(initialFile);}).catch(e=>{if(current===generation.current)setError(e instanceof Error?e.message:'Document files could not be loaded.');}).finally(()=>{if(current===generation.current)setBusy(false);});return()=>{generation.current++;};},[site]); // eslint-disable-line react-hooks/exhaustive-deps
 function apply(value:DocumentFile){setUsage([]);setUsageLoaded(false);setUsageMore(false);setFile(value);setStatus(value.rightsStatus);setEvidence(value.rightsEvidence??'');setExpires(value.rightsExpiresAt?new Date(value.rightsExpiresAt).toISOString().slice(0,19):'');setDirty(false);}
 function leave(){return !dirty||window.confirm('Discard unsaved file rights changes?');}
 async function get(id:string){const response=await command({action:'get',asset:id}),value=documentFileSchema.parse(response.result);if(value.id!==id)throw Error('File identity changed. Reload the catalogue.');return value;}
 async function load(id:string){setFile(null);const current=generation.current,value=await get(id);if(current!==generation.current)return;apply(value);setMessage('');return value;}
 async function choose(){if(!file||dirty)return;const current=generation.current,value=await get(file.id);if(current!==generation.current)return;apply(value);if(!value.eligible)throw Error('This file is no longer eligible. Review its processing and rights status.');onSelect({assetId:value.id,downloadName:value.filename});setMessage('File selected for this draft. Save the document to keep this selection.');}
 async function loadUsage(append=false){
  if(!file)return;const current=generation.current;
  const response=await command({action:'usage',asset:file.id,after:append?usage.at(-1)?.recordId??null:null});
  const values=z.array(documentFileUsageSchema).max(50).parse(response.result);if(current!==generation.current)return;
  setUsage(previous=>append?[...previous,...values]:values);setUsageLoaded(true);setUsageMore(values.length===50);
 }
 async function archiveFile(){
  if(!file?.canArchive||dirty||disabled)return;const archived=!file.archivedAt;
  if(archived&&selected===file.id)return;
  if(!window.confirm(archived?'Archive this PDF? Saved history is retained. Current content and active previews may prevent this change.':'Restore this PDF to the catalogue? Usage rights will still be checked before selection.'))return;
  const current=generation.current,id=file.id,expected=file.revision;
  const response=await command({action:'archive',asset:id,revision:expected,archived});if(current!==generation.current)return;
  if(![expected,expected+1].includes(response.result))throw Error('Archive update could not be confirmed. Refresh file details before retrying.');
  const latest=await load(id);if(current!==generation.current)return;
  if(!latest||Boolean(latest.archivedAt)!==archived)throw Error('The file status changed during this action. Review the refreshed details.');
  await list();if(current!==generation.current)return;setMessage(archived?'PDF archived. Its saved history is retained.':'PDF restored. Selection still requires current usage rights.');
 }
 async function saveRights(){if(!file?.canManageRights||!dirty)return;const current=generation.current;const response=await command({action:'rights',asset:file.id,revision:file.revision,status,evidence,expires:expires?new Date(`${expires}Z`).toISOString():null});if(current!==generation.current)return;if(response.result!==file.revision+1)throw Error('Rights update could not be confirmed. Reload before retrying.');await load(file.id);await list();setMessage('File rights saved. No document was published.');}
 const expiresValid=!expires||Number.isFinite(Date.parse(`${expires}Z`));
 const rightsValid=expiresValid&&(status!=='approved'||Boolean(evidence.trim())&&(!expires||Date.parse(`${expires}Z`)>Date.now()));
 return <section aria-label='PDF file catalogue'>
  <h3>PDF file catalogue</h3><p>{manageOnly?'Inspect files, usage and permissions. No file is attached to a draft from this view.':'Select an inspected file with approved usage rights.'} Upload PDFs in the upload area when document uploads are enabled, then refresh this catalogue after processing.</p>
  <div className='cms-actions'><label>Search PDF filenames<input maxLength={200} value={search} onChange={e=>setSearch(e.target.value)} disabled={busy||disabled}/></label><button disabled={busy||disabled} onClick={()=>void task(()=>list())}>Search files</button></div>
  {error&&<p role='alert'>{error}</p>}{message&&<p role='status'>{message}</p>}
  <div className='cms-actions'>{rows.map(row=><button key={row.id} disabled={busy||disabled} onClick={()=>{if(leave())void task(()=>load(row.id));}}>{row.filename}<small>{row.pages} pages · {row.archivedAt?'Archived':row.rightsStatus}{selected===row.id?' · Selected for draft':''}</small></button>)}</div>
  {!busy&&!rows.length&&<p>No processed files match this search.</p>}{more&&<button disabled={busy||disabled} onClick={()=>void task(()=>list(true))}>Load more PDF files</button>}
  {file&&<><h4>{file.filename}</h4><p>{file.pages} pages · {(file.bytes/1000000).toFixed(2)} MB · {file.eligible?'Eligible for selection':'Not eligible for selection'}.</p>
   <div className='cms-actions'>{!manageOnly&&<button disabled={busy||disabled||dirty||!file.eligible} onClick={()=>void task(choose)}>Use this PDF</button>}
    <button disabled={busy||disabled} onClick={()=>{if(leave())void task(()=>load(file.id));}}>Refresh file details</button>
    {file.canArchive&&<button disabled={busy||disabled||dirty||!file.archivedAt&&selected===file.id} onClick={()=>void task(archiveFile)}>{file.archivedAt?'Restore PDF file':'Archive PDF file'}</button>}
   </div>
   {file.archivedAt&&<p role='status'>This PDF is archived. Its saved history is retained.</p>}
   {file.canArchive&&!file.archivedAt&&selected===file.id&&<p>Choose another PDF for this draft before archiving this file.</p>}
   <div><button disabled={busy||disabled} onClick={()=>void task(()=>loadUsage())}>{usageLoaded?'Refresh file usage':'Show file usage'}</button>
    {usageLoaded&&<><p>Saved locations you can view, including older revisions and pinned download sections.</p>{usage.length?<ul>{usage.map(item=><li key={item.recordId}><strong>{item.title}</strong> · {item.type}{item.path?` · ${item.path}`:''}<small>{[item.draft?'Current draft':'',item.published?'Published version':'',item.historical?'Earlier revision':''].filter(Boolean).join(' · ')}</small></li>)}</ul>:<p>No saved usage is visible to your account. Unsaved selections are not included.</p>}{usageMore&&<button disabled={busy||disabled} onClick={()=>void task(()=>loadUsage(true))}>Load more file usage</button>}</>}
   </div>
   {file.canManageRights&&<fieldset disabled={busy||disabled}><legend>Usage rights</legend>
    <p>Rights changes apply to this file everywhere it is used. They do not publish a document.</p>
    <label>Rights status<select value={status} onChange={e=>{setStatus(e.target.value as DocumentFile['rightsStatus']);setDirty(true);}}><option value='pending'>Pending</option><option value='approved'>Approved</option><option value='revoked'>Revoked</option></select></label>
    <label>License or permission evidence<textarea rows={3} maxLength={5000} value={evidence} onChange={e=>{setEvidence(e.target.value);setDirty(true);}}/></label>
    <label>Rights expiry (UTC, optional)<input type='datetime-local' step='1' value={expires} onChange={e=>{setExpires(e.target.value);setDirty(true);}}/></label>
    {!rightsValid&&<p>Approval needs evidence and a valid future expiry, if specified. Expiry times use UTC.</p>}
    <div className='cms-actions'><button disabled={!dirty||!rightsValid} onClick={()=>void task(saveRights)}>Save file rights</button><button onClick={()=>{if(leave())void task(()=>load(file.id));}}>Reload file rights</button></div>
   </fieldset>}
  </>}
 </section>;
}
