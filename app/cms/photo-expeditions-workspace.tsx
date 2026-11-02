'use client';
import type {RequestedEditorRecord} from '../../lib/cms/editor-target';
import {useEffect,useRef,useState} from 'react';
import {newPhotoExpedition,photoExpeditionSchema,type PhotoExpeditionDraft} from '../../lib/cms/photo-expeditions';
import {ExpeditionImportPanel} from './photo-expedition-import-panel';
import {PhotoExpeditionMigrationPanel} from './photo-expedition-migration-panel';
import {PhotoExpeditionEditor} from './photo-expedition-editor';
import {PhotoExpeditionPreview} from './photo-expedition-preview';
import {PreviewSharing} from './preview-sharing';
import {NewDraftRecoveryPanel} from './new-draft-recovery-panel';
import {checkNewDraft,type NewDraftCheckpoint} from '../../lib/cms/new-draft-checkpoints';
import {DraftRecoveryPanel} from './draft-recovery-panel';
import {checkpointRecoveryMode,type DraftCheckpoint} from '../../lib/cms/draft-checkpoints';
import {useDraftHistory} from './use-draft-history';
import {prepareExpeditionConflict} from '../../lib/cms/expedition-conflict';
import {resolveDraftConflict,type ConflictChoice} from '../../lib/cms/draft-conflict';
import {DraftConflictPanel} from './draft-conflict-panel';
import {ExpeditionWorkflow} from './expedition-workflow';
import {ValidationPanel} from './validation-panel';
import {TranslationCreatePanel} from './translation-create-panel';
import {TranslationFamilyPanel} from './translation-family-panel';
import {TranslationReviewPanel} from './translation-review-panel';
import {PublicationSchedulePanel} from './publication-schedule-panel';
import type {LoadMediaPreview} from './media-image';
type Row={id:string;title:string;locale:string};
type Detail=Row&{type:string;path:string;currentRevision:string;payload:unknown;reviewStatus:string;publishedRevision:string|null;permissions:{edit:boolean;submit:boolean;approve:boolean;publish:boolean};history:{id:string;createdAt:string}[]};
type Props={initialRecord?:RequestedEditorRecord;site:string;actorId:string;api:(path:string,options?:RequestInit)=>Promise<any>;loadPreview:LoadMediaPreview;busy:boolean;run:(work:()=>Promise<void>)=>Promise<void>;onDirty:(value:boolean)=>void};
export function PhotoExpeditionsWorkspace({initialRecord,site,actorId,api,loadPreview,busy:externalBusy,run,onDirty}:Props){
 const [rows,setRows]=useState<Row[]>([]),[more,setMore]=useState(false),[record,setRecord]=useState<Detail|null>(null),[draft,setDraft]=useState<PhotoExpeditionDraft|null>(null),[dirty,setDirty]=useState(false),[locale,setLocale]=useState('en'),[message,setMessage]=useState(''),[preview,setPreview]=useState(false);
 const [migrationPending,setMigrationPending]=useState(false),[officePending,setOfficePending]=useState(false);const importPending=migrationPending||officePending;
 const [historyEpoch,setHistoryEpoch]=useState(0);
 const [conflict,setConflict]=useState<(ReturnType<typeof prepareExpeditionConflict>&{latest:Detail})|null>(null),[choices,setChoices]=useState<Partial<Record<string,ConflictChoice>>>({});
 const [autosaveEnabled,setAutosaveEnabled]=useState(false),[autosaveSaving,setAutosaveSaving]=useState(false),[autosaveStatus,setAutosaveStatus]=useState('');
 const autosaveAttempt=useRef('');
 const [translationWorking,setTranslationWorking]=useState(false);
 const busy=translationWorking||externalBusy||importPending||Boolean(conflict)||autosaveSaving;
 const alive=useRef(true),generation=useRef(0),listGeneration=useRef(0),apiRef=useRef(api);apiRef.current=api;
 useEffect(()=>onDirty(dirty||importPending||autosaveSaving),[dirty,importPending,autosaveSaving,onDirty]);
 async function list(append=false){const current=++listGeneration.current;const result=await apiRef.current(`/api/cms/content?site=${site}&type=photoExpedition&limit=50${append?`&after=${rows.at(-1)?.id}`:''}`);if(alive.current&&current===listGeneration.current){setRows(current=>append?[...new Map([...current,...result.records].map(row=>[row.id,row])).values()]:result.records);setMore(result.records.length===50);}}
 useEffect(()=>{alive.current=true;run(async()=>{await list();if(initialRecord&&alive.current)await load(initialRecord.id);});return()=>{alive.current=false;generation.current++;listGeneration.current++;};},[site]); // eslint-disable-line react-hooks/exhaustive-deps
 function leave(){return !dirty||window.confirm('Discard unsaved expedition changes?');}
 function populateTranslatedRecord(value:Detail,keepAutosave=false){if(!keepAutosave){setAutosaveEnabled(false);setAutosaveStatus('');autosaveAttempt.current='';}setConflict(null);setChoices({});const parsed=photoExpeditionSchema.safeParse(value.payload);const valid=parsed.success&&value.path===`/photo-expeditions/${parsed.data.slug}`&&value.title===parsed.data.title;setHistoryEpoch(epoch=>epoch+1);setRecord(value);setDraft(valid?parsed.data:null);setLocale(value.locale);setDirty(false);setPreview(false);setMessage(valid?'':'This expedition needs migration before editing. Its existing content has been preserved.');}
 function openTranslation(value:Detail){generation.current++;populateTranslatedRecord(value);setRows(current=>current.some(row=>row.id===value.id)?current.map(row=>row.id===value.id?value:row):[value,...current]);}
 async function load(id:string,keepAutosave=false){const current=++generation.current;const value=(await apiRef.current(`/api/cms/content?site=${site}&record=${id}`)).record;if(!alive.current||current!==generation.current)return;if(!value||value.id!==id||value.type!=='photoExpedition')throw Error('The requested expedition is unavailable.');return populateTranslatedRecord(value,keepAutosave);}
 async function command(action:string,extra:Record<string,unknown>){return apiRef.current('/api/cms/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,site,...extra})});}
 async function save(){
  if(!draft||busy||migrationPending||importPending||record&&!record.permissions.edit)return;
  const payload=photoExpeditionSchema.parse(draft),current=generation.current;let response;
  try{response=await apiRef.current('/api/cms/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save',site,record:record?.id??null,expectedRevision:record?.currentRevision??null,type:'photoExpedition',path:`/photo-expeditions/${payload.slug}`,title:payload.title,locale,payload})});}
  catch(error){
   if(record&&typeof error==='object'&&error!==null&&'status' in error&&error.status===409){
    const latest:Detail=(await apiRef.current(`/api/cms/content?site=${site}&record=${record.id}`)).record;
    if(!alive.current||generation.current!==current)return;
    setAutosaveEnabled(false);setConflict({...prepareExpeditionConflict(record,payload,latest),latest});setChoices({});setMessage('Another editor saved a newer revision. Your unsaved expedition is preserved.');return false;
   }
   throw error;
  }
  if(!alive.current||generation.current!==current)return;await load(response.result.recordId,true);await list();if(alive.current){setAutosaveStatus('');setMessage('Expedition saved as a draft. Nothing was published.');}return true;
 }
 async function recoverNewDraft(value:NewDraftCheckpoint){
  if(busy||migrationPending||importPending)return;
  const version=generation.current;
  const checked=checkNewDraft(value,{actor:actorId,site,kind:'photoExpedition'}),recovered=photoExpeditionSchema.parse(checked.draft);
  // Recheck authenticated site access; creation permission is enforced on save.
  await apiRef.current(`/api/cms/content?site=${site}&type=photoExpedition&limit=1`);
  if(!alive.current||version!==generation.current)return;
  setPreview(false);setRecord(null);setDraft(recovered);setLocale(checked.locale);setAutosaveEnabled(false);setAutosaveStatus('');setConflict(null);setChoices({});setDirty(true);setHistoryEpoch(epoch=>epoch+1);setMessage('New expedition restored locally. Review it and save explicitly to create a server draft.');
 }
 async function recoverBrowserCopy(checkpoint:DraftCheckpoint){
  if(!record||busy||migrationPending||importPending)return;
  const current=generation.current;
  const latest:Detail=(await apiRef.current(`/api/cms/content?site=${site}&record=${record.id}`)).record;
  if(!alive.current||current!==generation.current)return;
  if(!latest||latest.id!==record.id||latest.type!=='photoExpedition'||latest.path!==record.path||latest.locale!==record.locale)throw Error('The current expedition identity could not be verified.');
  const mode=checkpointRecoveryMode(checkpoint,{scope:{actor:actorId,site,record:latest.id,kind:'photoExpedition',locale:latest.locale},revision:latest.currentRevision,canEdit:latest.permissions?.edit===true});
  const recovered=photoExpeditionSchema.parse(checkpoint.draft),baseline=photoExpeditionSchema.parse(checkpoint.base),remote=photoExpeditionSchema.parse(latest.payload);
  if([recovered,baseline,remote].some(value=>`/photo-expeditions/${value.slug}`!==latest.path))throw Error('Recovered expedition URL does not match this record.');
  setAutosaveEnabled(false);setAutosaveStatus('');setChoices({});
  if(mode==='compare')setConflict({...prepareExpeditionConflict({...latest,currentRevision:checkpoint.baseRevision,payload:baseline},recovered,latest),latest});
  else{setRecord(latest);setConflict(null);}
  setDraft(recovered);setLocale(latest.locale);setDirty(true);setHistoryEpoch(epoch=>epoch+1);
  setMessage(mode==='compare'?'Browser copy loaded for comparison with a newer expedition. Nothing was saved.':'Browser copy restored locally. Review the expedition before saving.');
 }
 function reconcile(){
  if(!conflict||externalBusy)return;
  const merged=photoExpeditionSchema.parse(resolveDraftConflict(conflict.base,conflict.mine,conflict.remote,choices));
  setRecord(conflict.latest);setDraft(merged);setHistoryEpoch(epoch=>epoch+1);setConflict(null);setChoices({});setDirty(true);setMessage('Your choices are ready to review. Save the expedition draft to create a new revision. Nothing was published.');
 }
 async function action(name:string,revision=record?.currentRevision){
  if(!record||dirty||busy)return;
  await command(name,{record:record.id,revision});if(!alive.current)return;
  await load(record.id);await list();
  if(alive.current)setMessage(name==='publish'?'Expedition publication recorded. Visitor delivery requires the configured expedition rollout.':name==='unpublish'?'Expedition withdrawn. Drafts and history are retained.':'Expedition review status updated.');
 }
 const editable=!record||Boolean(record.permissions?.edit),valid=photoExpeditionSchema.safeParse(draft);
 const draftHistory=useDraftHistory({draft,locale},value=>{setDraft(value.draft);setLocale(value.locale);setDirty(true);setMessage('');},busy||!editable||!draft,`${site}:${actorId}:${historyEpoch}`);
 const autosaveReady=Boolean(autosaveEnabled&&record&&dirty&&editable&&!busy&&!migrationPending&&!importPending&&valid.success&&/^([a-z]{2,3})(-[A-Z]{2})?$/.test(locale));
 const autosaveSignature=JSON.stringify({site,actorId,record:record?.id,revision:record?.currentRevision,historyEpoch,draft,locale});
 const autosaveContext=useRef({signature:autosaveSignature,ready:autosaveReady});autosaveContext.current={signature:autosaveSignature,ready:autosaveReady};
 useEffect(()=>{
  if(!autosaveReady||autosaveAttempt.current===autosaveSignature)return;
  const timer=setTimeout(async()=>{
   if(!alive.current||!autosaveContext.current.ready||autosaveContext.current.signature!==autosaveSignature)return;
   autosaveAttempt.current=autosaveSignature;setAutosaveSaving(true);setAutosaveStatus('Saving expedition draft…');
   try{const saved=await save();if(alive.current)setAutosaveStatus(saved?'Expedition autosaved. Nothing was published.':'Autosave paused. Resolve the save conflict before saving.');}
   catch(error){if(alive.current){setAutosaveEnabled(false);setAutosaveStatus(`Autosave stopped. Your unsaved expedition is still open. ${error instanceof Error?error.message:'Try saving manually.'}`);}}
   finally{if(alive.current)setAutosaveSaving(false);}
  },3000);
  return()=>clearTimeout(timer);
 },[autosaveReady,autosaveSignature]); // Save uses this exact captured draft and revision.
 return <section className='cms-expeditions'><NewDraftRecoveryPanel key={`new-recovery:${actorId}:${site}:${record?.id??'new'}:${historyEpoch}`} scope={{actor:actorId,site,kind:'photoExpedition'}} draft={record?null:draft} locale={locale} valid={!record&&valid.success&&/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(locale)} dirty={!record&&dirty} disabled={busy||migrationPending||importPending} onRestore={value=>run(()=>recoverNewDraft(value))}/><h2>Photography expeditions</h2><p>Edit expedition drafts and check saved content. Preview drafts and share saved revisions privately. Import reviewed legacy content as new drafts. Submit saved revisions for review and publish approved content after trusted validation. Website delivery requires the configured expedition rollout.</p><PhotoExpeditionMigrationPanel key={`${site}:${actorId}`} site={site} actorId={actorId} api={api} loadPreview={loadPreview} disabled={externalBusy||autosaveSaving||Boolean(conflict)||dirty||officePending} onPending={setMigrationPending} onApplied={()=>list()}/><ExpeditionImportPanel key={`office:${site}:${actorId}`} site={site} actorId={actorId} api={api} loadPreview={loadPreview} disabled={externalBusy||autosaveSaving||Boolean(conflict)||dirty||migrationPending} onPending={setOfficePending} onApplied={()=>list()}/><div className='cms-actions'><button type='button' disabled={busy} onClick={()=>{if(leave()){setAutosaveEnabled(false);setAutosaveStatus('');autosaveAttempt.current='';generation.current++;setHistoryEpoch(epoch=>epoch+1);setRecord(null);setDraft(newPhotoExpedition());setLocale('en');setDirty(true);setPreview(false);setMessage('');}}}>New photography expedition</button><button type='button' disabled={busy} onClick={()=>run(()=>list())}>Refresh expeditions</button></div>
 <div className='cms-library-grid'><aside aria-label='Photography expeditions'>{rows.map(row=><button type='button' key={row.id} disabled={busy} onClick={()=>{if(leave())run(()=>load(row.id));}}>{row.title}<small>{row.locale}</small></button>)}{!rows.length&&<p>No expedition records loaded.</p>}{more&&<button type='button' disabled={busy} onClick={()=>run(()=>list(true))}>Load more expeditions</button>}</aside><div>{message&&<p role='status'>{message}</p>}{conflict&&<DraftConflictPanel subject='expedition' {...conflict} choices={choices} onChoice={(key,value)=>setChoices({...choices,[key]:value})} onApply={reconcile} onCancel={()=>{setConflict(null);setChoices({});setMessage('Your unsaved expedition is preserved. Saving again rechecks the latest revision.');}}/>}{draft?<>
 <p>{dirty?'Unsaved expedition changes':record?.reviewStatus.replaceAll('_',' ')||'New draft'} · {record?.publishedRevision?'Draft edits do not change the published revision.':'This expedition is not published.'}</p>
 <label><input type='checkbox' checked={autosaveEnabled} disabled={busy||migrationPending||importPending||!record||!editable} onChange={e=>{setAutosaveEnabled(e.target.checked);autosaveAttempt.current='';setAutosaveStatus('');}}/>Autosave this expedition after a short pause</label>{!record&&<p>Save the new expedition once before enabling autosave.</p>}{autosaveEnabled&&dirty&&!valid.success&&<p>Autosave is waiting for complete, valid expedition fields.</p>}{autosaveStatus&&<p role='status'>{autosaveStatus}</p>}{record&&<DraftRecoveryPanel key={`recovery:${actorId}:${site}:${record.id}:${record.currentRevision}`} scope={{actor:actorId,site,record:record.id,kind:'photoExpedition',locale:record.locale}} baseRevision={record.currentRevision} base={record.payload} draft={draft} valid={valid.success&&locale===record.locale} dirty={dirty} disabled={busy||!editable} onRestore={value=>run(()=>recoverBrowserCopy(value))}/>}<div className='cms-actions' aria-label='Expedition draft history'><button type='button' disabled={!draftHistory.canUndo} onClick={draftHistory.undo}>Undo expedition change</button><button type='button' disabled={!draftHistory.canRedo} onClick={draftHistory.redo}>Redo expedition change</button></div><p>Undo and redo cover unsaved expedition and locale edits. Saving or loading an expedition clears this history.</p><label>Expedition locale<input disabled={busy||!editable||Boolean(record)} value={locale} onChange={e=>draftHistory.change({draft,locale:e.target.value})}/></label>
 <PhotoExpeditionEditor value={draft} existing={Boolean(record)} context={{site,api,loadPreview,disabled:busy||!editable}} onChange={value=>draftHistory.change({draft:value,locale})}/>
 {!valid.success&&<ul role='alert'>{valid.error.issues.map((issue,index)=><li key={index}>{issue.path.join('.')}: {issue.message}</li>)}</ul>}
 <button type='button' disabled={busy||!editable||!dirty||!valid.success||!/^([a-z]{2,3})(-[A-Z]{2})?$/.test(locale)} onClick={()=>run(async()=>{await save();})}>Save expedition draft</button>
 <button type='button' disabled={!valid.success} aria-expanded={preview} onClick={()=>setPreview(value=>!value)}>{preview?'Close expedition preview':'Preview expedition'}</button>{preview&&valid.success&&<PhotoExpeditionPreview value={valid.data} loadPreview={loadPreview} loadRecord={async(id,signal)=>(await api(`/api/cms/content?site=${site}&record=${id}`,{signal})).record}/>}
 {record&&<><PreviewSharing key={`sharing:${site}:${record.id}:${record.currentRevision}`} site={site} record={record.id} revision={record.currentRevision} dirty={dirty} busy={busy} api={api} run={run}/><><TranslationFamilyPanel key={`family:${actorId}:${site}:${record.id}:${record.currentRevision}`} site={site} record={record.id} type='photoExpedition' disabled={busy||dirty} api={api} onLoaded={openTranslation} onWorking={setTranslationWorking}/><TranslationCreatePanel key={`create:${actorId}:${site}:${record.id}:${record.currentRevision}`} actor={actorId} site={site} source={record.id} revision={record.currentRevision} sourceLocale={record.locale} path={record.path} type='photoExpedition' disabled={busy||dirty} api={api} onLoaded={openTranslation} onWorking={setTranslationWorking}/><TranslationReviewPanel key={`translation:${site}:${record.id}:${record.currentRevision}`} site={site} record={record.id} revision={record.currentRevision} canApprove={Boolean(record.permissions.approve)} disabled={busy||dirty} api={api}/><PublicationSchedulePanel key={`schedule:${site}:${record.id}:${record.currentRevision}`} site={site} record={record.id} revision={record.currentRevision} publishedRevision={record.publishedRevision} approved={record.reviewStatus==='approved'} canPublish={Boolean(record.permissions.publish)} disabled={busy||dirty} api={api}/><ValidationPanel key={`validation:${site}:${record.id}:${record.currentRevision}`} revision={record.currentRevision} dirty={dirty} disabled={busy} canRequest={Object.values(record.permissions).some(Boolean)} check={action=>command(action,{record:record.id,revision:record.currentRevision})}/></><ExpeditionWorkflow key={record.id} record={record} disabled={busy||dirty} onAction={(name,revision)=>{run(()=>action(name,revision));}}/><details><summary>Revision history</summary>{record.history.map(revision=><div key={revision.id}><p>{new Date(revision.createdAt).toLocaleString()}{revision.id===record.currentRevision?' · Current':''}</p>{editable&&revision.id!==record.currentRevision&&<button type='button' disabled={busy||dirty} onClick={()=>{if(window.confirm('Restore this expedition revision as a new draft?'))run(async()=>{await command('restore',{record:record.id,revision:revision.id,expectedRevision:record.currentRevision});await load(record.id);await list();});}}>Restore expedition draft</button>}</div>)}</details></>}
 </>:!message&&<p>Select an expedition or create a new draft.</p>}</div></div></section>;
}
