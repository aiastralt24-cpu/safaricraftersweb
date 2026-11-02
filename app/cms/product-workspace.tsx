'use client';
import {useEffect,useRef,useState} from 'react';
import {DraftRecoveryPanel} from './draft-recovery-panel';
import {NewDraftRecoveryPanel} from './new-draft-recovery-panel';
import {DraftConflictPanel} from './draft-conflict-panel';
import {resolveDraftConflict,type ConflictChoice} from '../../lib/cms/draft-conflict';
import {prepareProductConflict} from '../../lib/cms/product-conflict';
import {recoverNewProduct,recoverProductCheckpoint} from '../../lib/cms/product-recovery';
import {reconcileProductUpdate} from '../../lib/cms/product-update-recovery';
import type {DraftCheckpoint} from '../../lib/cms/draft-checkpoints';
import type {NewDraftCheckpoint} from '../../lib/cms/new-draft-checkpoints';
import {z} from 'zod';
import {newProduct,productSchema,productSaveCommand,productPath,type ProductDraft} from '../../lib/cms/products';
import {verifiedProductLibrary} from '../../lib/cms/product-library';
import {ProductWorkflow} from './product-workflow';
import {ProductValidationPanel} from './product-validation-panel';
import {ProductPreview} from './product-preview';
import {ProductEditor} from './product-editor';
import {useDraftHistory} from './use-draft-history';
import type {LoadMediaPreview} from './media-image';
const uuid=z.string().uuid(),receipt=z.object({recordId:uuid,revisionId:uuid}).strict();
const detail=z.object({id:uuid,type:z.literal('product'),path:z.string(),locale:z.string(),currentRevision:uuid,payload:productSchema,history:z.array(z.object({id:uuid,createdAt:z.string()})),reviewStatus:z.string(),publishedRevision:uuid.nullable(),permissions:z.object({edit:z.boolean(),submit:z.boolean(),approve:z.boolean(),publish:z.boolean()}).passthrough()}).passthrough();
type Detail=z.infer<typeof detail>;
type Row=ReturnType<typeof verifiedProductLibrary>['records'][number];
type Props={site:string;actorId:string;api:(path:string,options?:RequestInit)=>Promise<any>;loadPreview:LoadMediaPreview;busy:boolean;run:(fn:()=>Promise<void>)=>Promise<void>;onDirty:(v:boolean)=>void};
export function ProductWorkspace({site,actorId,api,loadPreview,busy,run,onDirty}:Props){
 const [uncertain,setUncertain]=useState(false);
 const [preview,setPreview]=useState(false);
 const [rows,setRows]=useState<Row[]>([]),[record,setRecord]=useState<Detail|null>(null),[draft,setDraft]=useState<ProductDraft|null>(null),[dirty,setDirty]=useState(false),[locale,setLocale]=useState('en'),[search,setSearch]=useState(''),[next,setNext]=useState<string|null>(null),[message,setMessage]=useState(''),[ready,setReady]=useState(false),[storageError,setStorageError]=useState(false),[conflict,setConflict]=useState<(ReturnType<typeof prepareProductConflict>&{latest:Detail})|null>(null);
 const [choices,setChoices]=useState<Partial<Record<string,ConflictChoice>>>({}),[recoveryEpoch,setRecoveryEpoch]=useState(0);
 const [pending,setPending]=useState<z.infer<typeof productSaveCommand>|null>(null);
 const alive=useRef(true),apiRef=useRef(api),ticket=useRef(0),lastSearch=useRef('');apiRef.current=api;
 const key=`cms-product-create:${actorId}:${site}`,locked=busy||!ready||storageError||Boolean(pending)||Boolean(conflict),history=useDraftHistory(draft,value=>{setDraft(value);setDirty(true);},locked||Boolean(record&&!record.permissions.edit),`${record?.id??'new'}:${record?.currentRevision??''}:${recoveryEpoch}`);
 useEffect(()=>onDirty(dirty||Boolean(pending)||storageError),[dirty,pending,storageError,onDirty]);
 function stored(){const raw=localStorage.getItem(key);if(raw===null)return null;if(raw.length>2_000_000)throw Error('Recovery is too large.');const c=productSaveCommand.parse(JSON.parse(raw));if(c.site!==site||c.record!==null)throw Error('Recovery identity mismatch.');return c;}
 function sync(){try{setPending(stored());setStorageError(false);}catch{setStorageError(true);setMessage('Product recovery cannot be read. Preserve browser data before continuing.');}setReady(true);}
 async function list(append=false){const t=++ticket.current;const after=append?next:null,q=append?lastSearch.current:search;const data=verifiedProductLibrary(await apiRef.current(`/api/cms/products?${new URLSearchParams({site,search:q,limit:'50',...(after?{after}:{})})}`),'product',50,after??undefined);if(alive.current&&t===ticket.current){lastSearch.current=q;setRows(old=>append?[...old,...data.records]:data.records);setNext(data.next);}}
 useEffect(()=>{alive.current=true;sync();void run(()=>list());const changed=(e:StorageEvent)=>{if(e.key===key||e.key===null)sync();};window.addEventListener('storage',changed);return()=>{alive.current=false;ticket.current++;window.removeEventListener('storage',changed);};},[site,actorId]); // eslint-disable-line react-hooks/exhaustive-deps
 async function read(id:string){const d=detail.parse((await apiRef.current(`/api/cms/content?site=${site}&record=${id}`)).record);if(d.id!==id||d.path!==productPath(d.payload.slug))throw Error('Product identity mismatch.');return d;}
 function adopt(d:Detail){if(!alive.current)return;setUncertain(false);setPreview(false);setRecord(d);setDraft(d.payload);setLocale(d.locale);setDirty(false);setConflict(null);setChoices({});}
 async function load(id:string){adopt(await read(id));}
 const send=(body:unknown)=>apiRef.current('/api/cms/products',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const leave=()=>!dirty||window.confirm('Discard unsaved product edits?');
 async function finish(raw:unknown){const r=receipt.parse(raw);await load(r.recordId);await list();}
 async function create(recover=false){if(!navigator.locks)throw Error('Web Locks support is required for recoverable creation.');await navigator.locks.request(key,async()=>{
 let c=stored();if(recover){if(!c)throw Error('No pending request remains.');}else{if(c){setPending(c);throw Error('Recover the pending product first.');}c=productSaveCommand.parse({action:'save',site,record:null,expectedRevision:null,requestKey:crypto.randomUUID(),locale,payload:draft});localStorage.setItem(key,JSON.stringify(c));if(stored()?.requestKey!==c.requestKey)throw Error('Recovery could not be stored.');}setPending(c);
 const result=await send(c);if(result.site!==site||result.requestKey!==c.requestKey)throw Error('Product receipt mismatch.');await finish(result.result);if(stored()?.requestKey!==c.requestKey)throw Error('Recovery changed in another tab.');localStorage.removeItem(key);setPending(null);setMessage('Product draft saved. Nothing was published.');});}
 async function save(){if(!draft||locked||conflict)return;if(!record)return create();if(!record.permissions.edit)return;
 try{const response=await send(productSaveCommand.parse({action:'save',site,record:record.id,expectedRevision:record.currentRevision,locale,payload:draft}));const r=receipt.parse(response.result);if(r.recordId!==record.id)throw Error('Product save identity mismatch.');await finish(r);setMessage('Product draft saved.');}
 catch(error){try{const latest=await read(record.id),result=reconcileProductUpdate(record,draft,latest);if(!alive.current)return;
 if(result.status==='matching'){adopt(latest);setMessage('The server already saved these edits. No repeat write was sent.');return;}
 if(result.status==='compare'){setConflict({...result.conflict,latest});setChoices({});setMessage('The server has a different revision. Compare it with your preserved edits.');}
 else setMessage('The server still has the original revision. Your edits remain open for retry.');
 }catch{setMessage('The save could not be verified. Keep this tab open or preserve a browser recovery copy.');}throw error;}

 }
 async function cancel(){if(!navigator.locks)throw Error('Web Locks support is required.');await navigator.locks.request(key,async()=>{const c=stored();if(!c)throw Error('No pending creation remains.');const result=await send({action:'cancel_create',site,requestKey:c.requestKey});if(result.site!==site||result.requestKey!==c.requestKey)throw Error('Cancellation identity mismatch.');if(result.result?.status==='created')await finish(result.result.result);else if(result.result?.status!=='cancelled')throw Error('Cancellation cannot be verified.');if(stored()?.requestKey!==c.requestKey)throw Error('Recovery changed in another tab.');localStorage.removeItem(key);setPending(null);setMessage('Product creation resolved.');});}
 async function recoverSaved(value:DraftCheckpoint){if(!record||locked)return;const latest=await read(record.id);if(!alive.current)return;const restored=recoverProductCheckpoint(value,actorId,site,record,latest);if(restored.conflict)setConflict({...restored.conflict,latest});else{setRecord(latest);setConflict(null);}setChoices({});setDraft(restored.payload);setLocale(restored.locale);setDirty(true);setRecoveryEpoch(v=>v+1);setMessage('Browser copy restored locally. Review it before saving.');}
 async function action(name:string,revision?:string){
  if(!record||locked||dirty||uncertain)return;
  const expected=revision??record.currentRevision;
  try{
   await apiRef.current('/api/cms/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:name,site,record:record.id,revision:expected})});
   const updated=await read(record.id);
   if(updated.currentRevision!==record.currentRevision||name==='publish'&&updated.publishedRevision!==expected||name==='unpublish'&&updated.publishedRevision!==null||['submit','approve','request_changes'].includes(name)&&updated.reviewStatus!==({submit:'in_review',approve:'approved',request_changes:'changes_requested'} as Record<string,string>)[name])throw Error('Product workflow result changed. Reload to verify the current status.');
   adopt(updated);await list();setMessage(name==='publish'?'Product publication recorded. Visitor delivery must be enabled for this website.':name==='unpublish'?'Product withdrawn. Dependent products may also become unavailable. Drafts and history are retained.':'Product review status updated.');
  }catch(error){setUncertain(true);setMessage('The workflow result could not be verified. Reload product before another review or publication action.');throw error;}
 }
 async function recoverNew(value:NewDraftCheckpoint){if(locked||stored())throw Error('Resolve pending creation first.');const restored=recoverNewProduct(value,actorId,site),response=await apiRef.current('/api/cms/content');if(!z.array(z.object({id:uuid}).passthrough()).parse(response.sites).some(row=>row.id===site))throw Error('Website access changed.');if(!alive.current)return;if(stored())throw Error('Another tab started creation. Recover that request first.');setRecord(null);setDraft(restored.payload);setLocale(restored.locale);setDirty(true);setConflict(null);setChoices({});setRecoveryEpoch(v=>v+1);setMessage('New draft restored locally. Save explicitly to create a server draft.');}
 function reconcile(){if(!conflict)return;const resolved=productSchema.parse(resolveDraftConflict(conflict.base,conflict.mine,conflict.remote,choices));setRecord(conflict.latest);setDraft(resolved);setDirty(true);setConflict(null);setChoices({});setRecoveryEpoch(v=>v+1);}
 const errors=draft?productSchema.safeParse(draft):null;
 return <section><NewDraftRecoveryPanel key={`new:${actorId}:${site}:${record?.id??'new'}:${recoveryEpoch}`} scope={{actor:actorId,site,kind:'product'}} draft={record?null:draft} locale={locale} valid={!record&&productSchema.safeParse(draft).success&&/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(locale)} dirty={!record&&dirty} disabled={locked} onRestore={value=>run(()=>recoverNew(value))}/>{conflict&&<DraftConflictPanel subject='product' {...conflict} choices={choices} onChoice={(key,value)=>setChoices(old=>({...old,[key]:value}))} onApply={reconcile} onCancel={()=>setConflict(null)}/>}<h2>Products</h2><p>Manage product content and saved specification values. Submit saved drafts for review; publishing requires approval and current trusted checks. Visitor delivery is not enabled yet.</p>{message&&<p role='status'>{message}</p>}
 {pending&&<aside role='alert'><p>A product creation needs recovery. Retry uses the original request.</p><button disabled={busy||storageError} onClick={()=>void run(()=>create(true))}>Recover product creation</button><button disabled={busy||storageError} onClick={()=>{if(window.confirm('Cancel unresolved product creation? Any already-saved result will be recovered.'))void run(cancel);}}>Cancel product creation</button></aside>}
 <button disabled={locked} onClick={()=>{if(leave()){setPreview(false);setRecord(null);setDraft(newProduct());setLocale('en');setDirty(true);setConflict(null);setChoices({});}}}>New product</button>
 <div className='cms-content'><aside className='cms-list'><label>Search products<input maxLength={120} value={search} onChange={e=>setSearch(e.target.value)}/></label><button disabled={busy} onClick={()=>void run(()=>list())}>Search product records</button>{rows.map(row=><button key={row.id} disabled={locked} onClick={()=>{if(leave())void run(()=>load(row.id));}}>{row.title}<small>{row.locale} · {row.reviewStatus}</small></button>)}{next&&<button disabled={busy} onClick={()=>void run(()=>list(true))}>Load more products</button>}</aside>
 <div className='cms-editor'>{draft?<><label>Product language<input disabled={locked||Boolean(record)} value={locale} onChange={e=>{setLocale(e.target.value);setDirty(true);}}/></label><div className='cms-actions'><button disabled={locked||!errors?.success} onClick={()=>setPreview(v=>!v)}>{preview?'Edit product':'Preview product'}</button><button disabled={locked||!history.canUndo} onClick={history.undo}>Undo product edit</button><button disabled={locked||!history.canRedo} onClick={history.redo}>Redo product edit</button><button disabled={locked||Boolean(conflict)||!dirty||!errors?.success||Boolean(record&&!record.permissions.edit)} onClick={()=>void run(save)}>Save product draft</button>{record&&<button disabled={locked} onClick={()=>{if(leave())void run(()=>load(record.id));}}>Reload product</button>}</div>

 {preview?<ProductPreview value={draft} site={site} locale={locale} api={api} loadPreview={loadPreview}/>:<ProductEditor locale={locale} run={run} value={draft} existing={Boolean(record)} context={{site,api,loadPreview,disabled:locked||Boolean(record&&!record.permissions.edit)}} onChange={history.change}/>}
 {errors&&!errors.success&&<ul aria-label='Product field errors'>{errors.error.issues.map((error,i)=><li key={i}>{error.path.join('.')}: {error.message}</li>)}</ul>}
 {record&&<DraftRecoveryPanel key={`saved:${actorId}:${site}:${record.id}:${record.currentRevision}:${recoveryEpoch}`} scope={{actor:actorId,site,record:record.id,kind:'product',locale:record.locale}} baseRevision={record.currentRevision} base={record.payload} draft={draft} valid={productSchema.safeParse(draft).success&&locale===record.locale} dirty={dirty} disabled={locked||!record.permissions.edit} onRestore={value=>run(()=>recoverSaved(value))}/>}
 {record&&<><p>Review: {record.reviewStatus.replaceAll('_',' ')} · {record.publishedRevision?'Published revision available':'Not published'}</p><ProductWorkflow record={record} disabled={locked||dirty||uncertain} onAction={(name,revision)=>void run(()=>action(name,revision))}/></>}
 {record&&<ProductValidationPanel key={`checks:${actorId}:${site}:${record.id}:${record.currentRevision}`} site={site} record={record.id} revision={record.currentRevision} disabled={locked||dirty} canRequest={record.permissions.edit} api={api}/>}
 {record&&<details><summary>Product revision history</summary>{record.history.map(revision=><p key={revision.id}>{new Date(revision.createdAt).toLocaleString()}{revision.id!==record.currentRevision&&<button disabled={locked||dirty||!record.permissions.edit} onClick={()=>{if(window.confirm('Restore this revision as a new product draft?'))void run(async()=>{const result=await api('/api/cms/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'restore',site,record:record.id,revision:revision.id,expectedRevision:record.currentRevision})});const r=receipt.parse(result.result);if(r.recordId!==record.id)throw Error('Restore identity mismatch.');await finish(r);});}}>Restore product revision</button>}</p>)}</details>}
 </>:<p>Select a product or create a new draft.</p>}</div></div></section>;
}
