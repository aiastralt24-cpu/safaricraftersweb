'use client';
import type {RequestedEditorRecord} from '../../lib/cms/editor-target';
import {useEffect,useRef,useState} from 'react';
import {z} from 'zod';
import {DocumentPreviewPanel} from './document-preview-panel';
import type {LoadDocumentPreview} from './document-preview-panel';
import {prepareDocumentConflict} from '../../lib/cms/document-conflict';
import {resolveDraftConflict,type ConflictChoice} from '../../lib/cms/draft-conflict';
import {DraftConflictPanel} from './draft-conflict-panel';
import {NewDraftRecoveryPanel} from './new-draft-recovery-panel';
import {checkNewDraft,type NewDraftCheckpoint} from '../../lib/cms/new-draft-checkpoints';
import {DraftRecoveryPanel} from './draft-recovery-panel';
import {checkpointRecoveryMode,type DraftCheckpoint} from '../../lib/cms/draft-checkpoints';
import {useDraftHistory} from './use-draft-history';
import {DocumentFilePicker} from './document-file-picker';
import {ValidationPanel} from './validation-panel';
import {TranslationCreatePanel} from './translation-create-panel';
import {TranslationFamilyPanel} from './translation-family-panel';
import {TranslationReviewPanel} from './translation-review-panel';
import {PublicationSchedulePanel} from './publication-schedule-panel';
import {DocumentReview,type DocumentReviewAction} from './document-review';
import {DocumentRelease,type DocumentReleaseAction} from './document-release';
import {documentSchema,documentDateState,newDocument} from '../../lib/cms/documents';
import type {DocumentDraft} from '../../lib/cms/documents';
const uuid=z.string().uuid();
const rowSchema=z.object({id:uuid,title:z.string(),locale:z.string(),currentRevision:uuid,reviewStatus:z.string(),publishedRevision:uuid.nullable()}).passthrough();
const detailSchema=rowSchema.extend({type:z.literal('document'),path:z.null(),payload:z.unknown(),permissions:z.object({edit:z.boolean(),submit:z.boolean().default(false),approve:z.boolean().default(false),publish:z.boolean().default(false)}).passthrough(),history:z.array(z.object({id:uuid,createdAt:z.string()}).passthrough()).max(100)});
type Row=z.infer<typeof rowSchema>;type Detail=z.infer<typeof detailSchema>;
type Props={initialRecord?:RequestedEditorRecord;actorId:string;loadPreview?:LoadDocumentPreview;site:string;api:(path:string,options?:RequestInit)=>Promise<any>;busy:boolean;run:(work:()=>Promise<void>)=>Promise<void>;onDirty:(value:boolean)=>void};
const types={brochure:'Brochure',catalogue:'Catalogue',technicalDataSheet:'Technical data sheet',safetyDocument:'Safety document',certificate:'Certificate',manual:'Manual',resource:'Other resource'};
const policies={warn:'Warn after expiry',blockPublication:'Block new publication after expiry',removeAvailability:'Remove download availability after expiry'};
export function DocumentsWorkspace({initialRecord,actorId,site,api,busy:externalBusy,run,onDirty,loadPreview}:Props){
 const [rows,setRows]=useState<Row[]>([]),[more,setMore]=useState(false),[query,setQuery]=useState(''),[record,setRecord]=useState<Detail|null>(null),[draft,setDraft]=useState<DocumentDraft|null>(null),[regions,setRegions]=useState(''),[dirty,setDirty]=useState(false),[message,setMessage]=useState('');
 const [fileDirty,setFileDirty]=useState(false);
 const [historyEpoch,setHistoryEpoch]=useState(0);
 const [conflict,setConflict]=useState<(ReturnType<typeof prepareDocumentConflict>&{latest:Detail})|null>(null),[choices,setChoices]=useState<Partial<Record<string,ConflictChoice>>>({});
 const [autosaveEnabled,setAutosaveEnabled]=useState(false),[autosaveSaving,setAutosaveSaving]=useState(false),[autosaveStatus,setAutosaveStatus]=useState('');
 const autosaveAttempt=useRef(''),alive=useRef(true);
 const [translationWorking,setTranslationWorking]=useState(false);
 const busy=externalBusy||Boolean(conflict)||autosaveSaving||translationWorking;
 const generation=useRef(0),working=useRef(false),apiRef=useRef(api);apiRef.current=api;
 useEffect(()=>onDirty(dirty||fileDirty||autosaveSaving),[dirty,fileDirty,autosaveSaving,onDirty]);
 async function command(action:string,extra:Record<string,unknown>){return apiRef.current('/api/cms/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,site,...extra})});}
 async function list(append=false){const current=generation.current;const response=await apiRef.current(`/api/cms/content?site=${site}&type=document&limit=50${append?`&after=${rows.at(-1)?.id}`:''}`);const values=z.array(rowSchema).max(50).parse(response.records);if(current!==generation.current)return;setRows(previous=>append?[...new Map([...previous,...values].map(row=>[row.id,row])).values()]:values);setMore(values.length===50);}
 useEffect(()=>{alive.current=true;setAutosaveEnabled(false);setAutosaveStatus('');generation.current++;setRows([]);setRecord(null);setDraft(null);setDirty(false);setMessage('');run(async()=>{await list();if(initialRecord&&alive.current)await load(initialRecord.id);});return()=>{alive.current=false;generation.current++;};},[site]); // eslint-disable-line react-hooks/exhaustive-deps
 function leave(){return !(dirty||fileDirty)||window.confirm('Discard unsaved document changes?');}
 function change(patch:Partial<DocumentDraft>,regionText=regions){if(draft)draftHistory.change({draft:{...draft,...patch},regions:regionText});}
 function populateDocument(value:Detail,keepAutosave=false){if(!keepAutosave){setAutosaveEnabled(false);setAutosaveStatus('');autosaveAttempt.current='';}const parsed=documentSchema.safeParse(value.payload);const valid=parsed.success&&parsed.data.language===value.locale;setConflict(null);setChoices({});setHistoryEpoch(epoch=>epoch+1);setRecord(value);setDraft(valid?parsed.data:null);setRegions(valid?parsed.data.regions.join('\n'):'');setDirty(false);setFileDirty(false);setMessage(valid?'':'This document needs a metadata migration before editing. Its saved content is preserved.');return value;}
 function openTranslatedDocument(raw:unknown){const value=detailSchema.parse(raw);generation.current++;populateDocument(value);setRows(current=>current.some(row=>row.id===value.id)?current.map(row=>row.id===value.id?value:row):[value,...current]);}
 async function load(id:string,keepAutosave=false){const current=++generation.current,response=await apiRef.current(`/api/cms/content?site=${site}&record=${id}`);if(current!==generation.current)return;const value=detailSchema.parse(response.record);if(value.id!==id)throw Error('Document identity mismatch. Reload the document list.');return populateDocument(value,keepAutosave);}
 async function save(){
  if(busy||working.current||fileDirty||!draft||record&&!record.permissions.edit)return;working.current=true;const current=generation.current;
  try{const value=documentSchema.parse(draft),response=await command('save',{record:record?.id??null,expectedRevision:record?.currentRevision??null,type:'document',path:null,title:value.title,locale:record?.locale??value.language,payload:value});if(current!==generation.current)return;const result=z.object({recordId:uuid,revisionId:uuid}).parse(response.result);if(record&&result.recordId!==record.id)throw Error('Unexpected saved document. Refresh the document list.');await load(result.recordId,true);await list();if(alive.current){setAutosaveStatus('');setMessage('Document details saved as a draft. Nothing was published.');}return true;}
  catch(error){if(record&&typeof error==='object'&&error!==null&&'status' in error&&error.status===409){const response=await apiRef.current(`/api/cms/content?site=${site}&record=${record.id}`);if(current!==generation.current)return;const latest=detailSchema.parse(response.record);setAutosaveEnabled(false);setConflict({...prepareDocumentConflict(record,draft,latest),latest});setChoices({});setMessage('Another editor saved newer document details. Your unsaved metadata is preserved.');return false;}throw error;}finally{working.current=false;}
 }
 function reconcile(){
  if(!conflict||externalBusy||fileDirty)return;
  try{const merged=documentSchema.parse(resolveDraftConflict(conflict.base,conflict.mine,conflict.remote,choices));setRecord(conflict.latest);setDraft(merged);setRegions(merged.regions.join('\n'));setHistoryEpoch(epoch=>epoch+1);setConflict(null);setChoices({});setDirty(true);setMessage('Review the resolved document and file selection, then save again. Nothing was published.');}
  catch{setMessage('These choices do not form valid document details. Review dates and file settings.');}
 }
 async function recoverNewDraft(value:NewDraftCheckpoint){
  if(busy||fileDirty||working.current)return;
  const current=generation.current,checked=checkNewDraft(value,{actor:actorId,site,kind:'document'}),recovered=documentSchema.parse(checked.draft);
  if(recovered.language!==checked.locale)throw Error('Recovered document language does not match its copy.');
  await apiRef.current(`/api/cms/content?site=${site}&type=document&limit=1`);
  if(!alive.current||current!==generation.current)return;
  setRecord(null);setDraft(recovered);setRegions(recovered.regions.join('\n'));setFileDirty(false);setAutosaveEnabled(false);setAutosaveStatus('');setConflict(null);setChoices({});setDirty(true);setHistoryEpoch(epoch=>epoch+1);setMessage('New document restored locally. Review file eligibility before saving and publication.');
 }
 async function recoverBrowserCopy(checkpoint:DraftCheckpoint){
  if(!record||busy||fileDirty||working.current)return;
  const current=generation.current;
  const response=await apiRef.current(`/api/cms/content?site=${site}&record=${record.id}`);
  if(current!==generation.current)return;
  const latest=detailSchema.parse(response.record);
  if(latest.id!==record.id||latest.locale!==record.locale)throw Error('The current document identity could not be verified.');
  const scope={actor:actorId,site,record:latest.id,kind:'document',locale:latest.locale};
  const mode=checkpointRecoveryMode(checkpoint,{scope,revision:latest.currentRevision,canEdit:latest.permissions.edit});
  const recovered=documentSchema.parse(checkpoint.draft),baseline=documentSchema.parse(checkpoint.base),remote=documentSchema.parse(latest.payload);
  if([recovered,baseline,remote].some(value=>value.language!==latest.locale))throw Error('Recovered document language does not match this record.');
  setAutosaveEnabled(false);setAutosaveStatus('');setChoices({});
  if(mode==='compare')setConflict({...prepareDocumentConflict({...latest,currentRevision:checkpoint.baseRevision,payload:baseline},recovered,latest),latest});
  else{setRecord(latest);setConflict(null);}
  setDraft(recovered);setRegions(recovered.regions.join('\n'));setDirty(true);setHistoryEpoch(epoch=>epoch+1);
  setMessage(mode==='compare'?'Browser copy loaded for comparison with newer document details. Nothing was saved.':'Browser copy restored locally. Review file eligibility before saving and publication.');
 }
 async function restore(revision:string){
  if(busy||working.current||dirty||fileDirty||!record?.permissions.edit)return;if(!window.confirm('Restore this document revision as a new draft? The published version will stay unchanged.'))return;
  working.current=true;const current=generation.current,id=record.id;
  try{await command('restore',{record:id,revision,expectedRevision:record.currentRevision});if(current!==generation.current)return;await load(id);await list();setMessage('Earlier document details restored as a new draft. The published version is unchanged.');}finally{working.current=false;}
 }
 async function workflow(action:DocumentReviewAction|DocumentReleaseAction,revision:string){
  if(busy||working.current||dirty||fileDirty||!record)return;
  const permission=action==='submit'?'submit':action==='approve'||action==='request_changes'?'approve':'publish';
  if(!record.permissions[permission]||revision!==(action==='unpublish'?record.publishedRevision:record.currentRevision))return;
  if(action==='publish'&&(record.reviewStatus!=='approved'||record.publishedRevision===revision))return;
  working.current=true;const current=generation.current,id=record.id;
  try{
   await command(action,{record:id,revision});if(current!==generation.current)return;
   const updated=await load(id);if(!updated)return;const loaded=generation.current;await list();if(loaded!==generation.current)return;
   const matches=action==='publish'?updated.publishedRevision===revision:action==='unpublish'?updated.publishedRevision===null:updated.currentRevision===revision&&updated.reviewStatus===({submit:'in_review',approve:'approved',request_changes:'changes_requested'} as const)[action];
   if(!matches)throw Error('The document changed during this operation. Review its current status before continuing.');
   setMessage(({submit:'Document submitted for review.',approve:'Document revision approved. Nothing was published.',request_changes:'Changes requested for this document.',publish:'Document revision published. Downloads depend on delivery being enabled.',unpublish:'Document withdrawn. Drafts and revision history are preserved.'})[action]);
  }finally{working.current=false;}
 }
 const editable=!record||record.permissions.edit,parsed=documentSchema.safeParse(draft),dates=parsed.success?documentDateState(parsed.data):null;
 const draftHistory=useDraftHistory({draft,regions},value=>{setDraft(value.draft);setRegions(value.regions);setDirty(true);setMessage('');},busy||!editable||!draft,`${site}:${record?.id??'new'}:${historyEpoch}`);
 const autosaveReady=Boolean(autosaveEnabled&&record&&dirty&&editable&&!busy&&!fileDirty&&parsed.success&&draft?.language===record?.locale);
 const autosaveSignature=JSON.stringify({site,record:record?.id,revision:record?.currentRevision,historyEpoch,draft,regions});
 const autosaveContext=useRef({signature:autosaveSignature,ready:autosaveReady});autosaveContext.current={signature:autosaveSignature,ready:autosaveReady};
 useEffect(()=>{
  if(!autosaveReady||autosaveAttempt.current===autosaveSignature)return;
  const timer=setTimeout(async()=>{
   if(!alive.current||!autosaveContext.current.ready||autosaveContext.current.signature!==autosaveSignature)return;
   autosaveAttempt.current=autosaveSignature;setAutosaveSaving(true);setAutosaveStatus('Saving document draft…');
   try{const saved=await save();if(alive.current)setAutosaveStatus(saved?'Document autosaved. Nothing was published.':'Autosave paused. Resolve the save conflict before saving.');}
   catch(error){if(alive.current){setAutosaveEnabled(false);setAutosaveStatus(`Autosave stopped. Your unsaved document is still open. ${error instanceof Error?error.message:'Try saving manually.'}`);}}
   finally{if(alive.current)setAutosaveSaving(false);}
  },3000);
  return()=>clearTimeout(timer);
 },[autosaveReady,autosaveSignature]); // Save uses this exact captured draft and revision.
 return <section className='cms-documents cms-library'><NewDraftRecoveryPanel key={`new-recovery:${actorId}:${site}:${record?.id??'new'}:${historyEpoch}`} scope={{actor:actorId,site,kind:'document'}} draft={record?null:draft} locale={draft?.language??'en'} valid={!record&&parsed.success} dirty={!record&&dirty} disabled={busy||fileDirty} onRestore={value=>run(()=>recoverNewDraft(value))}/>
  <p>Manage document details, review, publication and revision history. Downloads require document delivery to be enabled.</p>
  <div className='cms-actions'><button disabled={busy} onClick={()=>{if(leave()){setAutosaveEnabled(false);setAutosaveStatus('');autosaveAttempt.current='';generation.current++;setHistoryEpoch(epoch=>epoch+1);setRecord(null);setDraft(newDocument());setFileDirty(false);setRegions('');setDirty(true);setMessage('');}}}>New document</button><button disabled={busy} onClick={()=>run(()=>list())}>Refresh documents</button></div>
  <div className='cms-library-grid'><aside aria-label='Documents'><label>Search loaded documents<input value={query} onChange={e=>setQuery(e.target.value)}/></label>{rows.filter(row=>row.title.toLowerCase().includes(query.toLowerCase())).map(row=><button key={row.id} disabled={busy} className={record?.id===row.id?'selected':''} onClick={()=>{if(leave())run(async()=>{await load(row.id);});}}>{row.title}<small>{row.locale} · {row.reviewStatus.replaceAll('_',' ')}{row.publishedRevision?' · Published version exists':''}</small></button>)}{!rows.length&&<p>No documents yet.</p>}{more&&<button disabled={busy} onClick={()=>run(()=>list(true))}>Load more documents</button>}</aside>
  <div className='cms-library-detail'>{message&&<p role='status'>{message}</p>}{conflict&&<DraftConflictPanel subject='document' {...conflict} choices={choices} onChoice={(key,value)=>setChoices({...choices,[key]:value})} onApply={reconcile} onCancel={()=>{setConflict(null);setChoices({});setMessage('Your unsaved document remains open. Saving again checks the latest revision.');}}/>}{draft?<><h2>{draft.title||'Untitled document'}</h2><p>{dirty?'Unsaved changes':'Draft loaded'} · {record?.reviewStatus.replaceAll('_',' ')??'New draft'}. Saving details does not change published content.</p>
   <label><input type='checkbox' checked={autosaveEnabled} disabled={busy||fileDirty||!record||!editable} onChange={e=>{setAutosaveEnabled(e.target.checked);autosaveAttempt.current='';setAutosaveStatus('');}}/>Autosave this document after a short pause</label>{!record&&<p>Save the new document once before enabling autosave.</p>}{autosaveEnabled&&dirty&&(!parsed.success||fileDirty)&&<p>Autosave is waiting for valid metadata and completed file-rights edits.</p>}{autosaveStatus&&<p role='status'>{autosaveStatus}</p>}{record&&<DraftRecoveryPanel key={`recovery:${actorId}:${site}:${record.id}:${record.currentRevision}`} scope={{actor:actorId,site,record:record.id,kind:'document',locale:record.locale}} baseRevision={record.currentRevision} base={record.payload} draft={draft} valid={parsed.success&&draft.language===record.locale} dirty={dirty} disabled={busy||fileDirty||!editable} onRestore={value=>run(()=>recoverBrowserCopy(value))}/>}<div className='cms-actions' aria-label='Document draft history'><button disabled={fileDirty||!draftHistory.canUndo} onClick={draftHistory.undo}>Undo document change</button><button disabled={fileDirty||!draftHistory.canRedo} onClick={draftHistory.redo}>Redo document change</button></div><p>History restores unsaved metadata and file selections. It does not upload or delete files. Finish or cancel pending file work before using history. Saving or loading clears history.</p>
   <fieldset disabled={busy||!editable}><legend>Document details</legend>
    <label>Document title<input maxLength={200} value={draft.title} onChange={e=>change({title:e.target.value})}/></label>
    <label>Description<textarea rows={4} maxLength={10000} value={draft.description} onChange={e=>change({description:e.target.value})}/></label>
    <label>Document type<select value={draft.documentType} onChange={e=>change({documentType:e.target.value as DocumentDraft['documentType']})}>{Object.entries(types).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    <label>Version label<input maxLength={80} value={draft.versionLabel} onChange={e=>change({versionLabel:e.target.value})}/></label>
    <label>Language code<input disabled={Boolean(record)} value={draft.language} onChange={e=>change({language:e.target.value})} placeholder='en'/></label>
    <label>Regions — one per line<textarea rows={3} value={regions} onChange={e=>change({regions:e.target.value.split('\n').map(value=>value.trim()).filter(Boolean)},e.target.value)}/></label>
    {(['effectiveOn','expiresOn','reviewOn'] as const).map(field=><label key={field}>{({effectiveOn:'Effective date',expiresOn:'Expiry date',reviewOn:'Review date'})[field]}<input type='date' value={draft[field]??''} onChange={e=>change({[field]:e.target.value||undefined})}/></label>)}
    <p>Dates include the full day in UTC.</p><label>Expiry policy<select value={draft.expiryPolicy} onChange={e=>change({expiryPolicy:e.target.value as DocumentDraft['expiryPolicy']})}>{Object.entries(policies).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    <label>Download button label<input maxLength={100} value={draft.downloadLabel} onChange={e=>change({downloadLabel:e.target.value})}/></label>
    <label>Intended download access<select value={draft.access} onChange={e=>change({access:e.target.value as DocumentDraft['access']})}><option value='public'>Public</option><option value='authenticated'>Authenticated users</option></select></label>
    {draft.file?<label>Download filename<input maxLength={200} value={draft.file.downloadName} onChange={e=>change({file:{...draft.file!,downloadName:e.target.value}})}/></label>:<p>No PDF is selected. Choose an eligible file from the catalogue below.</p>}
   </fieldset>
   <DocumentFilePicker key={`${site}:${record?.id??'new'}:${record?.currentRevision??''}:${generation.current}`} site={site} api={api} disabled={busy||!editable} selected={draft.file?.assetId} onDirty={setFileDirty} onSelect={file=>change({file})}/>
   {record&&draft.file&&loadPreview&&<DocumentPreviewPanel key={`${record.id}:${record.currentRevision}:${draft.file.assetId}`} record={record.id} revision={record.currentRevision} asset={draft.file.assetId} disabled={busy||dirty||fileDirty} load={loadPreview}/>}
   {dates&&<div aria-label='Document date checks'>{dates.notYetEffective&&<p role='status'>This document is not effective yet.</p>}{dates.expired&&<p role='status'>This document has expired. Selected policy: {policies[draft.expiryPolicy]}.</p>}{dates.reviewOverdue&&<p role='status'>This document is overdue for review.</p>}</div>}
   {(draft.products.length>0||draft.categories.length>0)&&<p>{draft.products.length} product and {draft.categories.length} category relationships are retained. Relationship editing is still being connected.</p>}
   {!parsed.success&&<ul aria-label='Document field errors'>{parsed.error.issues.map((issue,index)=><li key={index}>{issue.path.join('.')}: {issue.message}</li>)}</ul>}
   <button disabled={busy||fileDirty||!editable||!dirty||!parsed.success} onClick={()=>run(async()=>{await save();})}>Save document draft</button>
  </>:!record&&<p>Select a document or create a new draft.</p>}
  {record&&<><><TranslationFamilyPanel key={`family:${actorId}:${site}:${record.id}:${record.currentRevision}`} site={site} record={record.id} type='document' disabled={busy||dirty||fileDirty} api={api} onLoaded={openTranslatedDocument} onWorking={setTranslationWorking}/><TranslationCreatePanel key={`create:${actorId}:${site}:${record.id}:${record.currentRevision}`} actor={actorId} site={site} source={record.id} revision={record.currentRevision} sourceLocale={record.locale} path={null} type='document' disabled={busy||dirty||fileDirty} api={api} onLoaded={openTranslatedDocument} onWorking={setTranslationWorking}/><TranslationReviewPanel key={`translation:${site}:${record.id}:${record.currentRevision}`} site={site} record={record.id} revision={record.currentRevision} canApprove={Boolean(record.permissions.approve)} disabled={busy||dirty||fileDirty} api={api}/><PublicationSchedulePanel key={`schedule:${site}:${record.id}:${record.currentRevision}`} site={site} record={record.id} revision={record.currentRevision} publishedRevision={record.publishedRevision} approved={record.reviewStatus==='approved'} canPublish={Boolean(record.permissions.publish)} disabled={busy||dirty||fileDirty} api={api}/><ValidationPanel key={`${site}:${record.id}:${record.currentRevision}`} revision={record.currentRevision} dirty={dirty||fileDirty} disabled={busy} canRequest={record.permissions.edit||record.permissions.submit||record.permissions.approve||record.permissions.publish} check={action=>command(action,{record:record.id,revision:record.currentRevision})}/></><DocumentReview record={record} disabled={busy||dirty||fileDirty} onAction={(action,revision)=>run(()=>workflow(action,revision))}/><DocumentRelease key={`${site}:${record.id}`} record={record} disabled={busy||dirty||fileDirty} onAction={(action,revision)=>run(()=>workflow(action,revision))}/></>}
  {record&&<details className='cms-history'><summary>Recent revision history</summary><p>Restoring creates a new draft. Publication and file eligibility must be checked separately.</p>{record.history.map(revision=><div key={revision.id}><span>{new Date(revision.createdAt).toLocaleString()}{revision.id===record.currentRevision?' · Current draft':''}{revision.id===record.publishedRevision?' · Published version':''}</span>{revision.id!==record.currentRevision&&record.permissions.edit&&<button disabled={busy||dirty||fileDirty} onClick={()=>run(()=>restore(revision.id))}>Restore document draft</button>}</div>)}</details>}
  </div></div>
 </section>;
}
