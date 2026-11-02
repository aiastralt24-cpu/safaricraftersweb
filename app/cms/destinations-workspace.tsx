'use client';
import type {RequestedEditorRecord} from '../../lib/cms/editor-target';
import {useEffect,useRef,useState} from 'react';
import {destinationSchema,newDestination} from '../../lib/cms/destinations';
import type {DestinationDraft} from '../../lib/cms/destinations';
import type {LoadMediaPreview} from './media-image';
import {ValidationPanel} from './validation-panel';
import {TranslationCreatePanel} from './translation-create-panel';
import {TranslationFamilyPanel} from './translation-family-panel';
import {TranslationReviewPanel} from './translation-review-panel';
import {PublicationSchedulePanel} from './publication-schedule-panel';
import {DestinationPreview} from './destination-preview';
import {PreviewSharing} from './preview-sharing';
import {DestinationEditor} from './destination-editor';
import {DestinationWorkflow} from './destination-workflow';
import {DestinationMigrationPanel} from './destination-migration-panel';
import {DestinationImportPanel} from './destination-import-panel';
import {NewDraftRecoveryPanel} from './new-draft-recovery-panel';
import {checkNewDraft,type NewDraftCheckpoint} from '../../lib/cms/new-draft-checkpoints';
import {DraftRecoveryPanel} from './draft-recovery-panel';
import {checkpointRecoveryMode,type DraftCheckpoint} from '../../lib/cms/draft-checkpoints';
import {useDraftHistory} from './use-draft-history';
import {prepareDestinationConflict} from '../../lib/cms/destination-conflict';
import {resolveDraftConflict,type ConflictChoice} from '../../lib/cms/draft-conflict';
import {DraftConflictPanel} from './draft-conflict-panel';
type RecordDetail={id:string;type:string;path:string|null;title:string;locale:string;currentRevision:string;payload:unknown;reviewStatus:string;publishedRevision:string|null;permissions:{edit:boolean;submit:boolean;approve:boolean;publish:boolean};history:{id:string;createdAt:string}[]};
type Props={initialRecord?:RequestedEditorRecord;actorId:string;site:string;api:(path:string,options?:RequestInit)=>Promise<any>;loadPreview:LoadMediaPreview;busy:boolean;run:(work:()=>Promise<void>)=>Promise<void>;onDirty:(value:boolean)=>void};
export function DestinationsWorkspace({initialRecord,actorId,site,api,loadPreview,busy:externalBusy,run,onDirty}:Props){
 const [rows,setRows]=useState<RecordDetail[]>([]),[more,setMore]=useState(false),[record,setRecord]=useState<RecordDetail|null>(null),[draft,setDraft]=useState<DestinationDraft|null>(null),[dirty,setDirty]=useState(false),[locale,setLocale]=useState('en'),[message,setMessage]=useState('');
 const [migrationPending,setMigrationPending]=useState(false);
 const [importPending,setImportPending]=useState(false);
 const [historyEpoch,setHistoryEpoch]=useState(0);
 const [conflict,setConflict]=useState<(ReturnType<typeof prepareDestinationConflict>&{latest:RecordDetail})|null>(null),[choices,setChoices]=useState<Partial<Record<string,ConflictChoice>>>({});
 const [autosaveEnabled,setAutosaveEnabled]=useState(false),[autosaveSaving,setAutosaveSaving]=useState(false),[autosaveStatus,setAutosaveStatus]=useState('');
 const autosaveAttempt=useRef('');
 const [translationWorking,setTranslationWorking]=useState(false);
 const busy=translationWorking||externalBusy||Boolean(conflict)||autosaveSaving;
 const alive=useRef(true),apiRef=useRef(api);apiRef.current=api;
 useEffect(()=>onDirty(dirty||migrationPending||importPending||autosaveSaving),[dirty,migrationPending,importPending,autosaveSaving,onDirty]);
 async function list(append=false){const result=await apiRef.current(`/api/cms/content?site=${site}&type=destination&limit=50${append?`&after=${rows.at(-1)?.id}`:''}`);if(alive.current){setRows(current=>append?[...new Map([...current,...result.records].map(row=>[row.id,row])).values()]:result.records);setMore(result.records.length===50);}}
 useEffect(()=>{alive.current=true;run(async()=>{await list();if(initialRecord&&alive.current)await load(initialRecord.id);});return()=>{alive.current=false;};},[site]); // eslint-disable-line react-hooks/exhaustive-deps
 function leave(){return !dirty||window.confirm('Discard unsaved destination changes?');}
 function populateTranslatedRecord(value:RecordDetail,keepAutosave=false){if(!keepAutosave){setAutosaveEnabled(false);setAutosaveStatus('');autosaveAttempt.current='';}setConflict(null);setChoices({});const parsed=destinationSchema.safeParse(value.payload);setHistoryEpoch(epoch=>epoch+1);setRecord(value);setDraft(parsed.success?parsed.data:null);setLocale(value.locale);setDirty(false);setMessage(parsed.success?'':'This destination needs migration before editing. Existing content has been preserved.');}
 function openTranslation(value:RecordDetail){populateTranslatedRecord(value);setRows(current=>current.some(row=>row.id===value.id)?current.map(row=>row.id===value.id?value:row):[value,...current]);}
 async function load(id:string,keepAutosave=false){const value=(await apiRef.current(`/api/cms/content?site=${site}&record=${id}`)).record;if(!alive.current)return;if(!value||value.id!==id||value.type!=='destination')throw Error('The requested destination is unavailable.');return populateTranslatedRecord(value,keepAutosave);}
 async function save(){
  if(!draft||busy||migrationPending||importPending||record&&!record.permissions.edit)return;
  const payload=destinationSchema.parse(draft);let response;
  try{response=await apiRef.current('/api/cms/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save',site,record:record?.id??null,expectedRevision:record?.currentRevision??null,type:'destination',path:`/destinations/${payload.slug}`,title:payload.title,locale,payload})});}
  catch(error){
   if(record&&typeof error==='object'&&error!==null&&'status' in error&&error.status===409){
    const latest:RecordDetail=(await apiRef.current(`/api/cms/content?site=${site}&record=${record.id}`)).record;
    if(!alive.current)return;
    setAutosaveEnabled(false);setConflict({...prepareDestinationConflict(record,payload,latest),latest});setChoices({});setMessage('Another editor saved a newer revision. Your unsaved destination is preserved.');return false;
   }
   throw error;
  }
  if(!alive.current)return;await load(response.result.recordId,true);await list();if(alive.current){setAutosaveStatus('');setMessage('Destination saved as a draft. It has not been published.');}return true;
 }
 async function recoverNewDraft(value:NewDraftCheckpoint){
  if(busy||migrationPending||importPending)return;
  const checked=checkNewDraft(value,{actor:actorId,site,kind:'destination'}),recovered=destinationSchema.parse(checked.draft);
  // Recheck authenticated site access; creation permission is enforced on save.
  await apiRef.current(`/api/cms/content?site=${site}&type=destination&limit=1`);
  if(!alive.current)return;
  setRecord(null);setDraft(recovered);setLocale(checked.locale);setAutosaveEnabled(false);setAutosaveStatus('');setConflict(null);setChoices({});setDirty(true);setHistoryEpoch(epoch=>epoch+1);setMessage('New destination restored locally. Review it and save explicitly to create a server draft.');
 }
 async function recoverBrowserCopy(checkpoint:DraftCheckpoint){
  if(!record||busy||migrationPending||importPending)return;
  const latest:RecordDetail=(await apiRef.current(`/api/cms/content?site=${site}&record=${record.id}`)).record;
  if(!alive.current)return;
  if(!latest||latest.id!==record.id||latest.type!=='destination'||latest.path!==record.path||latest.locale!==record.locale)throw Error('The current destination identity could not be verified.');
  const mode=checkpointRecoveryMode(checkpoint,{scope:{actor:actorId,site,record:latest.id,kind:'destination',locale:latest.locale},revision:latest.currentRevision,canEdit:latest.permissions?.edit===true});
  const recovered=destinationSchema.parse(checkpoint.draft),baseline=destinationSchema.parse(checkpoint.base),remote=destinationSchema.parse(latest.payload);
  if([recovered,baseline,remote].some(value=>`/destinations/${value.slug}`!==latest.path))throw Error('Recovered destination URL does not match this record.');
  setAutosaveEnabled(false);setAutosaveStatus('');setChoices({});
  if(mode==='compare')setConflict({...prepareDestinationConflict({...latest,currentRevision:checkpoint.baseRevision,payload:baseline},recovered,latest),latest});
  else{setRecord(latest);setConflict(null);}
  setDraft(recovered);setLocale(latest.locale);setDirty(true);setHistoryEpoch(epoch=>epoch+1);
  setMessage(mode==='compare'?'Browser copy loaded for comparison with a newer destination. Nothing was saved.':'Browser copy restored locally. Review the destination before saving.');
 }
 function reconcile(){
  if(!conflict||externalBusy)return;
  const merged=destinationSchema.parse(resolveDraftConflict(conflict.base,conflict.mine,conflict.remote,choices));
  setRecord(conflict.latest);setDraft(merged);setHistoryEpoch(epoch=>epoch+1);setConflict(null);setChoices({});setDirty(true);setMessage('Your choices are ready to review. Save the destination draft to create a new revision. Nothing was published.');
 }
 async function action(name:string,revision=record?.currentRevision){if(!record||dirty||busy||migrationPending||importPending)return;await apiRef.current('/api/cms/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:name,site,record:record.id,revision})});await load(record.id);await list();setMessage(name==='publish'?'Destination published. Visitor delivery requires the configured destination rollout.':name==='unpublish'?'Destination withdrawn. Drafts and history are retained.':'Review status updated.');}
 const valid=destinationSchema.safeParse(draft),editable=!record||record.permissions.edit;
 const draftHistory=useDraftHistory({draft,locale},value=>{setDraft(value.draft);setLocale(value.locale);setDirty(true);setMessage('');},busy||importPending||migrationPending||!editable||!draft,`${site}:${historyEpoch}`);
 const autosaveReady=Boolean(autosaveEnabled&&record&&dirty&&editable&&!busy&&!migrationPending&&!importPending&&valid.success&&/^([a-z]{2,3})(-[A-Z]{2})?$/.test(locale));
 const autosaveSignature=JSON.stringify({site,record:record?.id,revision:record?.currentRevision,historyEpoch,draft,locale});
 const autosaveContext=useRef({signature:autosaveSignature,ready:autosaveReady});autosaveContext.current={signature:autosaveSignature,ready:autosaveReady};
 useEffect(()=>{
  if(!autosaveReady||autosaveAttempt.current===autosaveSignature)return;
  const timer=setTimeout(async()=>{
   if(!alive.current||!autosaveContext.current.ready||autosaveContext.current.signature!==autosaveSignature)return;
   autosaveAttempt.current=autosaveSignature;setAutosaveSaving(true);setAutosaveStatus('Saving destination draft…');
   try{const saved=await save();if(alive.current)setAutosaveStatus(saved?'Destination autosaved. Nothing was published.':'Autosave paused. Resolve the save conflict before saving.');}
   catch(error){if(alive.current){setAutosaveEnabled(false);setAutosaveStatus(`Autosave stopped. Your unsaved destination is still open. ${error instanceof Error?error.message:'Try saving manually.'}`);}}
   finally{if(alive.current)setAutosaveSaving(false);}
  },3000);
  return()=>clearTimeout(timer);
 },[autosaveReady,autosaveSignature]); // Save uses this exact captured draft and revision.
 return <section className='cms-destinations'><NewDraftRecoveryPanel key={`new-recovery:${actorId}:${site}:${record?.id??'new'}:${historyEpoch}`} scope={{actor:actorId,site,kind:'destination'}} draft={record?null:draft} locale={locale} valid={!record&&valid.success&&/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(locale)} dirty={!record&&dirty} disabled={busy||migrationPending||importPending} onRestore={value=>run(()=>recoverNewDraft(value))}/><DestinationImportPanel key={`office:${site}`} site={site} api={api} loadPreview={loadPreview} disabled={busy||dirty||migrationPending} onPending={setImportPending} onApplied={()=>list()}/><DestinationMigrationPanel key={site} site={site} api={api} disabled={busy||dirty||importPending} onPending={setMigrationPending} onApplied={()=>list()}/><button disabled={busy||importPending||migrationPending} onClick={()=>{if(leave()){setAutosaveEnabled(false);setAutosaveStatus('');autosaveAttempt.current='';setHistoryEpoch(epoch=>epoch+1);setRecord(null);setDraft(newDestination());setLocale('en');setDirty(true);setMessage('');}}}>New destination</button><div className='cms-library-grid'><aside aria-label='Destinations'>{rows.map(row=><button key={row.id} disabled={busy||importPending||migrationPending} onClick={()=>{if(leave())run(()=>load(row.id));}}>{row.title}<small>{row.locale}</small></button>)}{more&&<button disabled={busy||importPending||migrationPending} onClick={()=>run(()=>list(true))}>Load more destinations</button>}</aside><div>{message&&<p role='status'>{message}</p>}{conflict&&<DraftConflictPanel subject='destination' {...conflict} choices={choices} onChoice={(key,value)=>setChoices({...choices,[key]:value})} onApply={reconcile} onCancel={()=>{setConflict(null);setChoices({});setMessage('Your unsaved destination is preserved. Saving again rechecks the latest revision.');}}/>}{draft?<><p>{dirty?'Unsaved destination changes':record?.reviewStatus.replaceAll('_',' ')||'New draft'} · {record?.publishedRevision?'A published version is available. Draft edits are not live.':'This destination is not published.'}</p><label><input type='checkbox' checked={autosaveEnabled} disabled={busy||migrationPending||importPending||!record||!editable} onChange={e=>{setAutosaveEnabled(e.target.checked);autosaveAttempt.current='';setAutosaveStatus('');}}/>Autosave this destination after a short pause</label>{!record&&<p>Save the new destination once before enabling autosave.</p>}{autosaveEnabled&&dirty&&!valid.success&&<p>Autosave is waiting for complete, valid destination fields.</p>}{autosaveStatus&&<p role='status'>{autosaveStatus}</p>}{record&&<DraftRecoveryPanel key={`recovery:${actorId}:${site}:${record.id}:${record.currentRevision}`} scope={{actor:actorId,site,record:record.id,kind:'destination',locale:record.locale}} baseRevision={record.currentRevision} base={record.payload} draft={draft} valid={valid.success&&locale===record.locale} dirty={dirty} disabled={busy||migrationPending||importPending||!editable} onRestore={value=>run(()=>recoverBrowserCopy(value))}/>}<div className='cms-actions' aria-label='Destination draft history'><button type='button' disabled={!draftHistory.canUndo} onClick={draftHistory.undo}>Undo destination change</button><button type='button' disabled={!draftHistory.canRedo} onClick={draftHistory.redo}>Redo destination change</button></div><p>Undo and redo cover unsaved destination and locale edits. Saving or loading a destination clears this history.</p><label>Locale<input value={locale} disabled={busy||importPending||migrationPending||!editable||Boolean(record)} onChange={e=>draftHistory.change({draft,locale:e.target.value})}/></label><DestinationEditor existing={Boolean(record)} value={draft} onChange={value=>draftHistory.change({draft:value,locale})} context={{site,api,loadPreview,disabled:busy||importPending||migrationPending||!editable}}/>{!valid.success&&<ul role='alert'>{valid.error.issues.map((issue,index)=><li key={index}>{issue.path.join('.')}: {issue.message}</li>)}</ul>}<button className='primary' disabled={busy||importPending||migrationPending||!editable||!dirty||!valid.success||!/^([a-z]{2,3})(-[A-Z]{2})?$/.test(locale)} onClick={()=>run(async()=>{await save();})}>Save destination draft</button>{valid.success&&<details><summary>Preview {dirty?'unsaved changes':'saved draft'}</summary><DestinationPreview value={valid.data} loadPreview={loadPreview}/></details>}{record&&<><TranslationFamilyPanel key={`family:${actorId}:${site}:${record.id}:${record.currentRevision}`} site={site} record={record.id} type='destination' disabled={busy||dirty||migrationPending||importPending} api={api} onLoaded={openTranslation} onWorking={setTranslationWorking}/><TranslationCreatePanel key={`create:${actorId}:${site}:${record.id}:${record.currentRevision}`} actor={actorId} site={site} source={record.id} revision={record.currentRevision} sourceLocale={record.locale} path={record.path} type='destination' disabled={busy||dirty||migrationPending||importPending} api={api} onLoaded={openTranslation} onWorking={setTranslationWorking}/><TranslationReviewPanel key={`translation:${site}:${record.id}:${record.currentRevision}`} site={site} record={record.id} revision={record.currentRevision} canApprove={Boolean(record.permissions.approve)} disabled={busy||dirty||migrationPending||importPending} api={api}/><PublicationSchedulePanel key={`schedule:${site}:${record.id}:${record.currentRevision}`} site={site} record={record.id} revision={record.currentRevision} publishedRevision={record.publishedRevision} approved={record.reviewStatus==='approved'} canPublish={Boolean(record.permissions.publish)} disabled={busy||dirty||migrationPending||importPending} api={api}/><ValidationPanel key={record.currentRevision} revision={record.currentRevision} dirty={dirty} disabled={busy||importPending||migrationPending} canRequest={Object.values(record.permissions).some(Boolean)} check={action=>api('/api/cms/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,site,record:record.id,revision:record.currentRevision})})}/></>}{record&&<DestinationWorkflow record={record} disabled={busy||dirty||importPending||migrationPending} onAction={(name,revision)=>{run(()=>action(name,revision));}}/>}{record&&<PreviewSharing key={record.currentRevision} site={site} record={record.id} revision={record.currentRevision} dirty={dirty} busy={busy} api={api} run={run}/>}{record&&<details><summary>Revision history</summary>{record.history.map(revision=><div key={revision.id}><p>{new Date(revision.createdAt).toLocaleString()}{revision.id===record.currentRevision?' · Current':''}</p>{editable&&revision.id!==record.currentRevision&&<button disabled={busy||dirty||importPending||migrationPending} onClick={()=>{if(window.confirm('Restore this destination revision as a new draft?'))run(async()=>{await apiRef.current('/api/cms/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'restore',site,record:record.id,revision:revision.id,expectedRevision:record.currentRevision})});await load(record.id);await list();});}}>Restore destination draft</button>}</div>)}</details>}</>:<p>Select a destination or create a new draft.</p>}</div></div></section>;
}
