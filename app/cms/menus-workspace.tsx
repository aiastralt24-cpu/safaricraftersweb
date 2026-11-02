'use client';
import type {RequestedEditorRecord} from '../../lib/cms/editor-target';
import {useEffect,useRef,useState} from 'react';
import {navigationSchema} from '../../lib/cms/navigation';
import type {Navigation} from '../../lib/cms/navigation';
import {MenuWorkflow} from './menu-workflow';
import {ValidationPanel} from './validation-panel';
import {TranslationCreatePanel} from './translation-create-panel';
import {TranslationFamilyPanel} from './translation-family-panel';
import {TranslationReviewPanel} from './translation-review-panel';
import {PublicationSchedulePanel} from './publication-schedule-panel';
import {NewDraftRecoveryPanel} from './new-draft-recovery-panel';
import {checkNewDraft,type NewDraftCheckpoint} from '../../lib/cms/new-draft-checkpoints';
import {DraftRecoveryPanel} from './draft-recovery-panel';
import {checkpointRecoveryMode,type DraftCheckpoint} from '../../lib/cms/draft-checkpoints';
import {useDraftHistory} from './use-draft-history';
import {prepareMenuConflict} from '../../lib/cms/menu-conflict';
import {resolveDraftConflict,type ConflictChoice} from '../../lib/cms/draft-conflict';
import {DraftConflictPanel} from './draft-conflict-panel';
import {NavigationEditor} from './navigation-editor';
type RecordDetail={id:string;type:string;path:string|null;title:string;locale:string;currentRevision:string;payload:unknown;reviewStatus:string;publishedRevision:string|null;permissions:{edit:boolean;submit:boolean;approve:boolean;publish:boolean};history:{id:string;createdAt:string}[]};
type Props={initialRecord?:RequestedEditorRecord;actorId:string;site:string;api:(path:string,options?:RequestInit)=>Promise<any>;busy:boolean;run:(work:()=>Promise<void>)=>Promise<void>;onDirty:(dirty:boolean)=>void};
export function MenusWorkspace({initialRecord,site,actorId,api,busy:externalBusy,run,onDirty}:Props){
 const [rows,setRows]=useState<RecordDetail[]>([]),[more,setMore]=useState(false),[record,setRecord]=useState<RecordDetail|null>(null),[draft,setDraft]=useState<Navigation|null>(null),[dirty,setDirty]=useState(false),[locale,setLocale]=useState('en'),[message,setMessage]=useState('');const alive=useRef(true),apiRef=useRef(api);apiRef.current=api;
 const [historyEpoch,setHistoryEpoch]=useState(0),[conflict,setConflict]=useState<(ReturnType<typeof prepareMenuConflict>&{latest:RecordDetail})|null>(null),[choices,setChoices]=useState<Partial<Record<string,ConflictChoice>>>({});
 const [autosaveEnabled,setAutosaveEnabled]=useState(false),[autosaveSaving,setAutosaveSaving]=useState(false),[autosaveStatus,setAutosaveStatus]=useState('');
 const autosaveAttempt=useRef('');
 const [translationWorking,setTranslationWorking]=useState(false);
 const busy=translationWorking||externalBusy||Boolean(conflict)||autosaveSaving;
 useEffect(()=>{onDirty(dirty||autosaveSaving);},[dirty,autosaveSaving,onDirty]);
 async function list(append=false){const result=await apiRef.current(`/api/cms/content?site=${site}&type=navigation&limit=50${append?`&after=${rows.at(-1)?.id}`:''}`);if(alive.current){setRows(current=>append?[...new Map([...current,...result.records].map(row=>[row.id,row])).values()]:result.records);setMore(result.records.length===50);}}
 useEffect(()=>{alive.current=true;setAutosaveEnabled(false);setAutosaveStatus('');run(async()=>{await list();if(initialRecord&&alive.current)await load(initialRecord.id);});return()=>{alive.current=false;};},[site]); // eslint-disable-line react-hooks/exhaustive-deps
 function leave(){return !dirty||window.confirm('Discard unsaved menu changes?');}
 function populateTranslatedRecord(value:RecordDetail,keepAutosave=false){if(!keepAutosave){setAutosaveEnabled(false);setAutosaveStatus('');autosaveAttempt.current='';}const parsed=navigationSchema.safeParse(value.payload);setConflict(null);setChoices({});setHistoryEpoch(epoch=>epoch+1);setRecord(value);setDraft(parsed.success?parsed.data:null);setLocale(value.locale);setDirty(false);setMessage(parsed.success?'':'This menu needs migration before editing. Existing data is preserved.');}
 function openTranslation(value:RecordDetail){populateTranslatedRecord(value);setRows(current=>current.some(row=>row.id===value.id)?current.map(row=>row.id===value.id?value:row):[value,...current]);}
 async function load(id:string,keepAutosave=false){const value=(await apiRef.current(`/api/cms/content?site=${site}&record=${id}`)).record;if(!alive.current)return;if(!value||value.id!==id||value.type!=='navigation'||value.path!==null)throw Error('The requested menu is unavailable.');return populateTranslatedRecord(value,keepAutosave);}
 async function save(){
  if(!draft||busy||record&&!record.permissions.edit)return;
  const payload=navigationSchema.parse(draft);let response;
  try{response=await apiRef.current('/api/cms/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save',site,record:record?.id??null,expectedRevision:record?.currentRevision??null,type:'navigation',path:null,title:payload.title,locale,payload})});}
  catch(error){
   if(record&&typeof error==='object'&&error!==null&&'status' in error&&error.status===409){
    const latest:RecordDetail=(await apiRef.current(`/api/cms/content?site=${site}&record=${record.id}`)).record;
    if(!alive.current)return;setAutosaveEnabled(false);setConflict({...prepareMenuConflict(record,payload,latest),latest});setChoices({});setMessage('Another editor saved a newer menu. Your unsaved structure is preserved.');return false;
   }throw error;
  }
  if(!alive.current)return;await load(response.result.recordId,true);await list();if(alive.current){setAutosaveStatus('');setMessage('Menu draft saved. Live navigation is unchanged.');}return true;
 }
 function reconcile(){
  if(!conflict||externalBusy)return;
  try{const merged=navigationSchema.parse(resolveDraftConflict(conflict.base,conflict.mine,conflict.remote,choices));setRecord(conflict.latest);setDraft(merged);setHistoryEpoch(epoch=>epoch+1);setConflict(null);setChoices({});setDirty(true);setMessage('Review the resolved menu structure and save again. Nothing was published.');}
  catch{setMessage('The selected versions do not form a valid menu. Review the menu structure before applying.');}
 }
 async function recoverNewDraft(value:NewDraftCheckpoint){
  if(busy)return;
  const checked=checkNewDraft(value,{actor:actorId,site,kind:'navigation'}),recovered=navigationSchema.parse(checked.draft);
  // Recheck authenticated site access; creation permission is enforced on save.
  await apiRef.current(`/api/cms/content?site=${site}&type=navigation&limit=1`);
  if(!alive.current)return;
  setRecord(null);setDraft(recovered);setLocale(checked.locale);setAutosaveEnabled(false);setAutosaveStatus('');setConflict(null);setChoices({});setDirty(true);setHistoryEpoch(epoch=>epoch+1);setMessage('New menu restored locally. Review it and save explicitly to create a server draft.');
 }
 async function recoverBrowserCopy(checkpoint:DraftCheckpoint){
  if(!record||busy)return;
  const latest:RecordDetail=(await apiRef.current(`/api/cms/content?site=${site}&record=${record.id}`)).record;
  if(!alive.current)return;
  if(!latest||latest.id!==record.id||latest.type!=='navigation'||latest.path!==null||latest.locale!==record.locale)throw Error('The current menu identity could not be verified.');
  const scope={actor:actorId,site,record:latest.id,kind:'navigation',locale:latest.locale};
  const mode=checkpointRecoveryMode(checkpoint,{scope,revision:latest.currentRevision,canEdit:latest.permissions?.edit===true});
  const recovered=navigationSchema.parse(checkpoint.draft),baseline=navigationSchema.parse(checkpoint.base);navigationSchema.parse(latest.payload);
  setAutosaveEnabled(false);setAutosaveStatus('');setChoices({});
  if(mode==='compare')setConflict({...prepareMenuConflict({...latest,currentRevision:checkpoint.baseRevision,payload:baseline},recovered,latest),latest});
  else{setRecord(latest);setConflict(null);}
  setDraft(recovered);setLocale(latest.locale);setDirty(true);setHistoryEpoch(epoch=>epoch+1);setMessage(mode==='compare'?'Browser copy loaded for comparison with newer server changes. Nothing was saved.':'Browser copy restored locally. Review it before saving. Nothing was published.');
 }
 async function action(name:string,revision=record?.currentRevision){
  if(!record||dirty||busy)return;
  await apiRef.current('/api/cms/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:name,site,record:record.id,revision})});
  if(!alive.current)return;await load(record.id);await list();
  if(alive.current)setMessage(name==='publish'?'Menu publication recorded. Visitor delivery requires this menu to be selected in the configured navigation rollout.':name==='unpublish'?'Menu withdrawn. Drafts and revision history are retained.':'Menu review status updated.');
 }
 const editable=!record||record.permissions.edit,parsed=navigationSchema.safeParse(draft);
 const draftHistory=useDraftHistory({draft,locale},value=>{setDraft(value.draft);setLocale(value.locale);setDirty(true);setMessage('');},busy||!editable||!draft,`${site}:${record?.id??'new'}:${historyEpoch}`);
 const autosaveReady=Boolean(autosaveEnabled&&record&&dirty&&editable&&!busy&&parsed.success&&/^([a-z]{2,3})(-[A-Z]{2})?$/.test(locale));
 const autosaveSignature=JSON.stringify({site,record:record?.id,revision:record?.currentRevision,historyEpoch,draft,locale});
 const autosaveContext=useRef({signature:autosaveSignature,ready:autosaveReady});autosaveContext.current={signature:autosaveSignature,ready:autosaveReady};
 useEffect(()=>{
  if(!autosaveReady||autosaveAttempt.current===autosaveSignature)return;
  const timer=setTimeout(async()=>{
   if(!alive.current||!autosaveContext.current.ready||autosaveContext.current.signature!==autosaveSignature)return;
   autosaveAttempt.current=autosaveSignature;setAutosaveSaving(true);setAutosaveStatus('Saving menu draft…');
   try{const saved=await save();if(alive.current)setAutosaveStatus(saved?'Menu autosaved. Nothing was published.':'Autosave paused. Resolve the save conflict before saving.');}
   catch(error){if(alive.current){setAutosaveEnabled(false);setAutosaveStatus(`Autosave stopped. Your unsaved menu is still open. ${error instanceof Error?error.message:'Try saving manually.'}`);}}
   finally{if(alive.current)setAutosaveSaving(false);}
  },3000);
  return()=>clearTimeout(timer);
 },[autosaveReady,autosaveSignature]); // Save uses this exact captured draft and revision.
 return <section className='cms-menus'><NewDraftRecoveryPanel key={`new-recovery:${actorId}:${site}:${record?.id??'new'}:${historyEpoch}`} scope={{actor:actorId,site,kind:'navigation'}} draft={record?null:draft} locale={locale} valid={!record&&parsed.success&&/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(locale)} dirty={!record&&dirty} disabled={busy} onRestore={value=>run(()=>recoverNewDraft(value))}/><button disabled={busy} onClick={()=>{if(leave()){setAutosaveEnabled(false);setAutosaveStatus('');autosaveAttempt.current='';setHistoryEpoch(epoch=>epoch+1);setRecord(null);setDraft({schemaVersion:1,title:'New menu',items:[]});setLocale('en');setDirty(true);setMessage('');}}}>New menu</button><div className='cms-library-grid'><aside aria-label='Menus'>{rows.map(row=><button disabled={busy} key={row.id} onClick={()=>{if(leave())run(()=>load(row.id));}}>{row.title}<small>{row.locale}</small></button>)}{more&&<button disabled={busy} onClick={()=>run(()=>list(true))}>Load more menus</button>}</aside><div>{message&&<p role='status'>{message}</p>}{conflict&&<DraftConflictPanel subject='menu' {...conflict} choices={choices} onChoice={(key,value)=>setChoices({...choices,[key]:value})} onApply={reconcile} onCancel={()=>{setConflict(null);setChoices({});setMessage('Your unsaved menu is preserved. Saving again checks the latest revision.');}}/>}{draft?<><p>{dirty?'Unsaved changes':record?.reviewStatus.replaceAll('_',' ')||'New draft'} · {record?.publishedRevision?'A published version is available. Draft edits are not live.':'This menu is not published.'}</p><label><input type='checkbox' checked={autosaveEnabled} disabled={busy||!record||!editable} onChange={e=>{setAutosaveEnabled(e.target.checked);autosaveAttempt.current='';setAutosaveStatus('');}}/>Autosave this menu after a short pause</label>{!record&&<p>Save the new menu once before enabling autosave.</p>}{autosaveEnabled&&dirty&&!parsed.success&&<p>Autosave is waiting for a valid menu structure and fields.</p>}{autosaveStatus&&<p role='status'>{autosaveStatus}</p>}{record&&<DraftRecoveryPanel key={`recovery:${actorId}:${site}:${record.id}:${record.currentRevision}`} scope={{actor:actorId,site,record:record.id,kind:'navigation',locale:record.locale}} baseRevision={record.currentRevision} base={record.payload} draft={draft} valid={parsed.success} dirty={dirty} disabled={busy||!editable} onRestore={value=>run(()=>recoverBrowserCopy(value))}/>}<div className='cms-actions' aria-label='Menu draft history'><button disabled={!draftHistory.canUndo} onClick={draftHistory.undo}>Undo menu change</button><button disabled={!draftHistory.canRedo} onClick={draftHistory.redo}>Redo menu change</button></div><p>History covers the complete unsaved menu tree and locale. Saving or loading resets history.</p><fieldset disabled={busy||!editable}><label>Menu title<input maxLength={200} value={draft.title} onChange={e=>draftHistory.change({draft:{...draft,title:e.target.value},locale})}/></label><label>Menu locale<input disabled={Boolean(record)} value={locale} onChange={e=>draftHistory.change({draft,locale:e.target.value})}/></label><NavigationEditor key={record?.currentRevision??'new'} value={draft} onChange={value=>draftHistory.change({draft:value,locale})} context={{site,api,disabled:busy||!editable}}/></fieldset><button disabled={busy||!editable||!dirty} onClick={()=>run(async()=>{await save();})}>Save menu draft</button>{record&&<>
 <><TranslationFamilyPanel key={`family:${actorId}:${site}:${record.id}:${record.currentRevision}`} site={site} record={record.id} type='navigation' disabled={busy||dirty} api={api} onLoaded={openTranslation} onWorking={setTranslationWorking}/><TranslationCreatePanel key={`create:${actorId}:${site}:${record.id}:${record.currentRevision}`} actor={actorId} site={site} source={record.id} revision={record.currentRevision} sourceLocale={record.locale} path={record.path} type='navigation' disabled={busy||dirty} api={api} onLoaded={openTranslation} onWorking={setTranslationWorking}/><TranslationReviewPanel key={`translation:${site}:${record.id}:${record.currentRevision}`} site={site} record={record.id} revision={record.currentRevision} canApprove={Boolean(record.permissions.approve)} disabled={busy||dirty} api={api}/><PublicationSchedulePanel key={`schedule:${site}:${record.id}:${record.currentRevision}`} site={site} record={record.id} revision={record.currentRevision} publishedRevision={record.publishedRevision} approved={record.reviewStatus==='approved'} canPublish={Boolean(record.permissions.publish)} disabled={busy||dirty} api={api}/><ValidationPanel key={`validation:${record.currentRevision}`} revision={record.currentRevision} dirty={dirty} disabled={busy} canRequest={Object.values(record.permissions).some(Boolean)} check={name=>api('/api/cms/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:name,site,record:record.id,revision:record.currentRevision})})}/></>
 <MenuWorkflow key={`workflow:${record.id}`} record={record} disabled={busy||dirty} onAction={(name,revision)=>run(()=>action(name,revision))}/>
 <details><summary>Menu revision history</summary>{record.history.map(revision=><div key={revision.id}><p>{new Date(revision.createdAt).toLocaleString()}{revision.id===record.currentRevision?' · Current':''}</p>{editable&&revision.id!==record.currentRevision&&<button disabled={busy||dirty} onClick={()=>{if(window.confirm('Restore this menu revision as a new draft? The published menu will stay unchanged.'))run(async()=>{await apiRef.current('/api/cms/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'restore',site,record:record.id,revision:revision.id,expectedRevision:record.currentRevision})});if(!alive.current)return;await load(record.id);await list();setMessage('Menu revision restored as a new draft. The published menu is unchanged.');});}}>Restore menu draft</button>}</div>)}</details>
 </>}</>:<p>Select a menu or create a draft.</p>}</div></div></section>;
}
