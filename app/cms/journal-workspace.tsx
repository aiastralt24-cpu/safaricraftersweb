'use client';
import type {RequestedEditorRecord} from '../../lib/cms/editor-target';
import {useEffect,useRef,useState} from 'react';
import {journalArticleSchema,newJournalArticle,type JournalArticleDraft} from '../../lib/cms/journal';
import {JournalImportPanel} from './journal-import-panel';
import {JournalMigrationPanel} from './journal-migration-panel';
import {JournalWorkflow} from './journal-workflow';
import {ValidationPanel} from './validation-panel';
import {TranslationCreatePanel} from './translation-create-panel';
import {TranslationFamilyPanel} from './translation-family-panel';
import {TranslationReviewPanel} from './translation-review-panel';
import {PublicationSchedulePanel} from './publication-schedule-panel';
import {JournalEditor} from './journal-editor';
import {JournalPreview} from './journal-preview';
import type {LoadMediaPreview} from './media-image';
import {PreviewSharing} from './preview-sharing';
import {NewDraftRecoveryPanel} from './new-draft-recovery-panel';
import {checkNewDraft,type NewDraftCheckpoint} from '../../lib/cms/new-draft-checkpoints';
import {DraftRecoveryPanel} from './draft-recovery-panel';
import {checkpointRecoveryMode,type DraftCheckpoint} from '../../lib/cms/draft-checkpoints';
import {useDraftHistory} from './use-draft-history';
import {prepareJournalConflict} from '../../lib/cms/journal-conflict';
import {resolveDraftConflict,type ConflictChoice} from '../../lib/cms/draft-conflict';
import {DraftConflictPanel} from './draft-conflict-panel';
type Detail={id:string;type:string;path:string|null;title:string;locale:string;currentRevision:string;payload:unknown;reviewStatus:string;publishedRevision:string|null;permissions:{edit:boolean;submit:boolean;approve:boolean;publish:boolean};history:{id:string;createdAt:string}[]};
type Props={initialRecord?:RequestedEditorRecord;site:string;actorId:string;api:(path:string,options?:RequestInit)=>Promise<any>;loadPreview:LoadMediaPreview;busy:boolean;run:(work:()=>Promise<void>)=>Promise<void>;onDirty:(value:boolean)=>void};
export function JournalWorkspace({initialRecord,site,actorId,api,loadPreview,busy:externalBusy,run,onDirty}:Props){
 const [rows,setRows]=useState<Detail[]>([]),[more,setMore]=useState(false),[record,setRecord]=useState<Detail|null>(null),[draft,setDraft]=useState<JournalArticleDraft|null>(null),[dirty,setDirty]=useState(false),[locale,setLocale]=useState('en'),[message,setMessage]=useState(''),[preview,setPreview]=useState(false);
 const [migrationPending,setMigrationPending]=useState(false),[importPending,setImportPending]=useState(false);
 const [conflict,setConflict]=useState<(ReturnType<typeof prepareJournalConflict>&{latest:Detail})|null>(null),[choices,setChoices]=useState<Partial<Record<string,ConflictChoice>>>({});
 const [autosaveEnabled,setAutosaveEnabled]=useState(false),[autosaveSaving,setAutosaveSaving]=useState(false),[autosaveStatus,setAutosaveStatus]=useState('');
 const autosaveAttempt=useRef('');
 const [translationWorking,setTranslationWorking]=useState(false);
 const busy=translationWorking||externalBusy||Boolean(conflict)||autosaveSaving;
 const [historyEpoch,setHistoryEpoch]=useState(0);
 const alive=useRef(true),apiRef=useRef(api);apiRef.current=api;
 useEffect(()=>onDirty(dirty||migrationPending||importPending||autosaveSaving),[dirty,migrationPending,importPending,autosaveSaving,onDirty]);
 async function list(append=false){const result=await apiRef.current(`/api/cms/content?site=${site}&type=journalArticle&limit=50${append?`&after=${rows.at(-1)?.id}`:''}`);if(alive.current){setRows(current=>append?[...new Map([...current,...result.records].map(row=>[row.id,row])).values()]:result.records);setMore(result.records.length===50);}}
 useEffect(()=>{alive.current=true;run(async()=>{await list();if(initialRecord&&alive.current)await load(initialRecord.id);});return()=>{alive.current=false;};},[site]); // eslint-disable-line react-hooks/exhaustive-deps
 function leave(){return !dirty||window.confirm('Discard unsaved article changes?');}
 function populateTranslatedRecord(value:Detail,keepAutosave=false){if(!keepAutosave){setAutosaveEnabled(false);setAutosaveStatus('');autosaveAttempt.current='';}const parsed=journalArticleSchema.safeParse(value.payload);const valid=parsed.success&&value.path===`/journal/${parsed.data.slug}`;setConflict(null);setChoices({});setHistoryEpoch(epoch=>epoch+1);setRecord(value);setDraft(valid?parsed.data:null);setLocale(value.locale);setDirty(false);setPreview(false);setMessage(valid?'':'This article needs migration before editing. Existing content is preserved.');}
 function openTranslation(value:Detail){populateTranslatedRecord(value);setRows(current=>current.some(row=>row.id===value.id)?current.map(row=>row.id===value.id?value:row):[value,...current]);}
 async function load(id:string,keepAutosave=false){const value=(await apiRef.current(`/api/cms/content?site=${site}&record=${id}`)).record;if(!alive.current)return;if(!value||value.id!==id||value.type!=='journalArticle')throw Error('The requested article is unavailable.');return populateTranslatedRecord(value,keepAutosave);}
 async function save(){
  if(!draft||busy||migrationPending||importPending||record&&!record.permissions.edit)return;
  const payload=journalArticleSchema.parse(draft);let response;
  try{response=await apiRef.current('/api/cms/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save',site,record:record?.id??null,expectedRevision:record?.currentRevision??null,type:'journalArticle',path:`/journal/${payload.slug}`,title:payload.title,locale,payload})});}
  catch(error){
   if(record&&typeof error==='object'&&error!==null&&'status' in error&&error.status===409){
    const latest:Detail=(await apiRef.current(`/api/cms/content?site=${site}&record=${record.id}`)).record;
    if(!alive.current)return;
    setAutosaveEnabled(false);setConflict({...prepareJournalConflict(record,payload,latest),latest});setChoices({});setMessage('Another editor saved a newer revision. Your unsaved article is preserved.');return false;
   }
   throw error;
  }
  if(!alive.current)return;await load(response.result.recordId,true);await list();if(alive.current){setAutosaveStatus('');setMessage('Article saved as a draft. Nothing was published.');}return true;
 }
 async function recoverNewDraft(value:NewDraftCheckpoint){
  if(busy||migrationPending||importPending)return;
  const checked=checkNewDraft(value,{actor:actorId,site,kind:'journalArticle'}),recovered=journalArticleSchema.parse(checked.draft);
  // Recheck authenticated site access; creation permission is enforced on save.
  await apiRef.current(`/api/cms/content?site=${site}&type=journalArticle&limit=1`);
  if(!alive.current)return;
  setPreview(false);setRecord(null);setDraft(recovered);setLocale(checked.locale);setAutosaveEnabled(false);setAutosaveStatus('');setConflict(null);setChoices({});setDirty(true);setHistoryEpoch(epoch=>epoch+1);setMessage('New article restored locally. Review it and save explicitly to create a server draft.');
 }
 async function recoverBrowserCopy(checkpoint:DraftCheckpoint){
  if(!record||busy||migrationPending||importPending)return;
  const latest:Detail=(await apiRef.current(`/api/cms/content?site=${site}&record=${record.id}`)).record;
  if(!alive.current)return;
  if(!latest||latest.id!==record.id||latest.type!=='journalArticle'||latest.path!==record.path||latest.locale!==record.locale)throw Error('The current article identity could not be verified.');
  const mode=checkpointRecoveryMode(checkpoint,{scope:{actor:actorId,site,record:latest.id,kind:'journalArticle',locale:latest.locale},revision:latest.currentRevision,canEdit:latest.permissions?.edit===true});
  const recovered=journalArticleSchema.parse(checkpoint.draft),baseline=journalArticleSchema.parse(checkpoint.base),remote=journalArticleSchema.parse(latest.payload);
  if([recovered,baseline,remote].some(value=>`/journal/${value.slug}`!==latest.path))throw Error('Recovered article URL does not match this record.');
  setAutosaveEnabled(false);setAutosaveStatus('');setChoices({});
  if(mode==='compare')setConflict({...prepareJournalConflict({...latest,currentRevision:checkpoint.baseRevision,payload:baseline},recovered,latest),latest});
  else{setRecord(latest);setConflict(null);}
  setDraft(recovered);setLocale(latest.locale);setDirty(true);setHistoryEpoch(epoch=>epoch+1);
  setMessage(mode==='compare'?'Browser copy loaded for comparison with a newer article. Nothing was saved.':'Browser copy restored locally. Review the article before saving.');
 }
 function reconcile(){
  if(!conflict||externalBusy)return;
  const merged=journalArticleSchema.parse(resolveDraftConflict(conflict.base,conflict.mine,conflict.remote,choices));
  setRecord(conflict.latest);setDraft(merged);setHistoryEpoch(epoch=>epoch+1);setConflict(null);setChoices({});setDirty(true);setMessage('Your choices are ready to review. Save the article draft to create a new revision. Nothing was published.');
 }
 async function action(name:string,revision=record?.currentRevision){
  if(!record||dirty||busy||migrationPending||importPending)return;
  await apiRef.current('/api/cms/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:name,site,record:record.id,revision})});
  if(!alive.current)return;
  await load(record.id);await list();
  if(alive.current)setMessage(name==='publish'?'Article publication recorded. Visitor delivery requires the configured journal rollout.':name==='unpublish'?'Article withdrawn. Drafts and history are retained.':'Article review status updated.');
 }
 const editable=!record||record.permissions.edit,valid=journalArticleSchema.safeParse(draft);
 const draftHistory=useDraftHistory({draft,locale},value=>{setDraft(value.draft);setLocale(value.locale);setDirty(true);setMessage('');},busy||migrationPending||importPending||!editable||!draft,`${site}:${actorId}:${historyEpoch}`);
 const autosaveReady=Boolean(autosaveEnabled&&record&&dirty&&editable&&!busy&&!migrationPending&&!importPending&&valid.success&&/^([a-z]{2,3})(-[A-Z]{2})?$/.test(locale));
 const autosaveSignature=JSON.stringify({site,actorId,record:record?.id,revision:record?.currentRevision,historyEpoch,draft,locale});
 const autosaveContext=useRef({signature:autosaveSignature,ready:autosaveReady});autosaveContext.current={signature:autosaveSignature,ready:autosaveReady};
 useEffect(()=>{
  if(!autosaveReady||autosaveAttempt.current===autosaveSignature)return;
  const timer=setTimeout(async()=>{
   if(!alive.current||!autosaveContext.current.ready||autosaveContext.current.signature!==autosaveSignature)return;
   autosaveAttempt.current=autosaveSignature;setAutosaveSaving(true);setAutosaveStatus('Saving article draft…');
   try{const saved=await save();if(alive.current)setAutosaveStatus(saved?'Article autosaved. Nothing was published.':'Autosave paused. Resolve the save conflict before saving.');}
   catch(error){if(alive.current){setAutosaveEnabled(false);setAutosaveStatus(`Autosave stopped. Your unsaved article is still open. ${error instanceof Error?error.message:'Try saving manually.'}`);}}
   finally{if(alive.current)setAutosaveSaving(false);}
  },3000);
  return()=>clearTimeout(timer);
 },[autosaveReady,autosaveSignature]); // Save uses this exact captured draft and revision.
 return <section className='cms-destinations'><NewDraftRecoveryPanel key={`new-recovery:${actorId}:${site}:${record?.id??'new'}:${historyEpoch}`} scope={{actor:actorId,site,kind:'journalArticle'}} draft={record?null:draft} locale={locale} valid={!record&&valid.success&&/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(locale)} dirty={!record&&dirty} disabled={busy||migrationPending||importPending} onRestore={value=>run(()=>recoverNewDraft(value))}/><h2>Journal</h2><JournalImportPanel key={`office:${site}:${actorId}`} site={site} actorId={actorId} api={api} loadPreview={loadPreview} disabled={busy||dirty||migrationPending} onPending={setImportPending} onApplied={()=>list()}/><JournalMigrationPanel key={`${site}:${actorId}`} site={site} actorId={actorId} api={api} loadPreview={loadPreview} disabled={busy||dirty||importPending} onPending={setMigrationPending} onApplied={()=>list()}/><p>Manage article drafts, review and publication. Website delivery requires the configured journal rollout.</p><button type='button' disabled={busy||migrationPending||importPending} onClick={()=>{if(leave()){setAutosaveEnabled(false);setAutosaveStatus('');autosaveAttempt.current='';setHistoryEpoch(epoch=>epoch+1);setRecord(null);setDraft(newJournalArticle());setLocale('en');setDirty(true);setPreview(false);setMessage('');}}}>New article</button><div className='cms-library-grid'><aside aria-label='Journal articles'>{rows.map(row=><button type='button' key={row.id} disabled={busy||migrationPending||importPending} onClick={()=>{if(leave())run(()=>load(row.id));}}>{row.title}<small>{row.locale}</small></button>)}{more&&<button type='button' disabled={busy||migrationPending||importPending} onClick={()=>run(()=>list(true))}>Load more articles</button>}</aside><div>{message&&<p role='status'>{message}</p>}{conflict&&<DraftConflictPanel {...conflict} choices={choices} onChoice={(key,value)=>setChoices({...choices,[key]:value})} onApply={reconcile} onCancel={()=>{setConflict(null);setChoices({});setMessage('Your unsaved article is preserved. Saving again rechecks the latest revision.');}}/>}{draft?<><p>{dirty?'Unsaved article changes':record?.reviewStatus.replaceAll('_',' ')||'New draft'} · {record?.publishedRevision?'A published version is available. Draft edits are not live.':'This article is not published.'}</p><label><input type='checkbox' checked={autosaveEnabled} disabled={busy||migrationPending||importPending||!record||!editable} onChange={e=>{setAutosaveEnabled(e.target.checked);autosaveAttempt.current='';setAutosaveStatus('');}}/>Autosave this article after a short pause</label>{!record&&<p>Save the new article once before enabling autosave.</p>}{autosaveEnabled&&dirty&&!valid.success&&<p>Autosave is waiting for complete, valid article fields.</p>}{autosaveStatus&&<p role='status'>{autosaveStatus}</p>}{record&&<DraftRecoveryPanel key={`recovery:${actorId}:${site}:${record.id}:${record.currentRevision}`} scope={{actor:actorId,site,record:record.id,kind:'journalArticle',locale:record.locale}} baseRevision={record.currentRevision} base={record.payload} draft={draft} valid={valid.success&&locale===record.locale} dirty={dirty} disabled={busy||migrationPending||importPending||!editable} onRestore={value=>run(()=>recoverBrowserCopy(value))}/>}<div className='cms-actions' aria-label='Article draft history'><button type='button' disabled={!draftHistory.canUndo} onClick={draftHistory.undo}>Undo article change</button><button type='button' disabled={!draftHistory.canRedo} onClick={draftHistory.redo}>Redo article change</button></div><p>Undo and redo cover unsaved article and locale edits. Saving or loading an article clears this history.</p><label>Locale<input disabled={busy||migrationPending||importPending||!editable||Boolean(record)} value={locale} onChange={e=>draftHistory.change({draft,locale:e.target.value})}/></label><JournalEditor value={draft} existing={Boolean(record)} context={{site,api,loadPreview,disabled:busy||migrationPending||importPending||!editable}} onChange={value=>draftHistory.change({draft:value,locale})}/>{!valid.success&&<ul role='alert'>{valid.error.issues.map((issue,i)=><li key={i}>{issue.path.join('.')}: {issue.message}</li>)}</ul>}<button type='button' className='primary' disabled={busy||migrationPending||importPending||!editable||!dirty||!valid.success||!/^([a-z]{2,3})(-[A-Z]{2})?$/.test(locale)} onClick={()=>run(async()=>{await save();})}>Save article draft</button><button type='button' disabled={!valid.success} aria-expanded={preview} onClick={()=>setPreview(v=>!v)}>{preview?'Close article preview':'Preview article'}</button>{preview&&valid.success&&<JournalPreview value={valid.data} loadPreview={loadPreview}/>} {record&&<><><TranslationFamilyPanel key={`family:${actorId}:${site}:${record.id}:${record.currentRevision}`} site={site} record={record.id} type='journalArticle' disabled={busy||dirty||migrationPending||importPending} api={api} onLoaded={openTranslation} onWorking={setTranslationWorking}/><TranslationCreatePanel key={`create:${actorId}:${site}:${record.id}:${record.currentRevision}`} actor={actorId} site={site} source={record.id} revision={record.currentRevision} sourceLocale={record.locale} path={record.path} type='journalArticle' disabled={busy||dirty||migrationPending||importPending} api={api} onLoaded={openTranslation} onWorking={setTranslationWorking}/><TranslationReviewPanel key={`translation:${site}:${record.id}:${record.currentRevision}`} site={site} record={record.id} revision={record.currentRevision} canApprove={Boolean(record.permissions.approve)} disabled={busy||dirty||migrationPending||importPending} api={api}/><PublicationSchedulePanel key={`schedule:${site}:${record.id}:${record.currentRevision}`} site={site} record={record.id} revision={record.currentRevision} publishedRevision={record.publishedRevision} approved={record.reviewStatus==='approved'} canPublish={Boolean(record.permissions.publish)} disabled={busy||dirty||migrationPending||importPending} api={api}/><ValidationPanel key={record.currentRevision} revision={record.currentRevision} dirty={dirty} disabled={busy||migrationPending||importPending} canRequest={Object.values(record.permissions).some(Boolean)} check={name=>api('/api/cms/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:name,site,record:record.id,revision:record.currentRevision})})}/></><JournalWorkflow key={record.id} record={record} disabled={busy||migrationPending||importPending||dirty} onAction={(name,revision)=>{run(()=>action(name,revision));}}/><PreviewSharing key={record.currentRevision} site={site} record={record.id} revision={record.currentRevision} dirty={dirty} busy={busy||migrationPending||importPending} api={api} run={run}/><details><summary>Revision history</summary>{record.history.map(revision=><div key={revision.id}><p>{new Date(revision.createdAt).toLocaleString()}{revision.id===record.currentRevision?' · Current':''}</p>{editable&&revision.id!==record.currentRevision&&<button type='button' disabled={busy||migrationPending||importPending||dirty} onClick={()=>{if(window.confirm('Restore this article revision as a new draft?'))run(async()=>{await apiRef.current('/api/cms/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'restore',site,record:record.id,revision:revision.id,expectedRevision:record.currentRevision})});await load(record.id);await list();});}}>Restore article draft</button>}</div>)}</details></>}</>:<p>Select an article or create a new draft.</p>}</div></div></section>;
}
