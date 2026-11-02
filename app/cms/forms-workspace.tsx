'use client';
import type {RequestedEditorRecord} from '../../lib/cms/editor-target';
import {RecordUsagePanel} from './record-usage-panel';
import {ContactFormMigrationPanel} from './contact-form-migration-panel';
import {useEffect,useRef,useState} from 'react';
import {formSchema} from '../../lib/cms/forms';
import {newForm} from '../../lib/cms/form-drafts';
import type {FormDefinition} from '../../lib/cms/forms';
import {PreviewSharing} from './preview-sharing';
import {FormPreview} from './form-preview';
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
import {prepareFormConflict} from '../../lib/cms/form-conflict';
import {resolveDraftConflict,type ConflictChoice} from '../../lib/cms/draft-conflict';
import {DraftConflictPanel} from './draft-conflict-panel';
import {FormNotificationRoutes} from './form-notification-routes';
import {FormEditor} from './form-editor';
type RecordDetail={id:string;type:string;path:string|null;title:string;locale:string;currentRevision:string;payload:unknown;publishedRevision:string|null;reviewStatus:string;history:{id:string;createdAt:string}[];permissions:{edit:boolean;submit:boolean;approve:boolean;publish:boolean}};
type Props={initialRecord?:RequestedEditorRecord;actorId:string;site:string;api:(path:string,options?:RequestInit)=>Promise<any>;busy:boolean;run:(work:()=>Promise<void>)=>Promise<void>;onDirty:(dirty:boolean)=>void};
export function FormsWorkspace({initialRecord,site,actorId,api,busy:externalBusy,run,onDirty}:Props){
 const [migrationPending,setMigrationPending]=useState(false);const [historyEpoch,setHistoryEpoch]=useState(0),[conflict,setConflict]=useState<(ReturnType<typeof prepareFormConflict>&{latest:RecordDetail})|null>(null),[choices,setChoices]=useState<Partial<Record<string,ConflictChoice>>>({});
 const [autosaveEnabled,setAutosaveEnabled]=useState(false),[autosaveSaving,setAutosaveSaving]=useState(false),[autosaveStatus,setAutosaveStatus]=useState('');
 const autosaveAttempt=useRef('');
 const [translationWorking,setTranslationWorking]=useState(false);
 const busy=translationWorking||externalBusy||migrationPending||Boolean(conflict)||autosaveSaving;
 const [rows,setRows]=useState<RecordDetail[]>([]),[more,setMore]=useState(false),[record,setRecord]=useState<RecordDetail|null>(null),[draft,setDraft]=useState<FormDefinition|null>(null),[dirty,setDirty]=useState(false),[locale,setLocale]=useState('en'),[message,setMessage]=useState('');const alive=useRef(true),apiRef=useRef(api);apiRef.current=api;
 useEffect(()=>{onDirty(dirty||migrationPending||autosaveSaving);},[dirty,migrationPending,autosaveSaving,onDirty]);
 async function list(append=false){const result=await apiRef.current(`/api/cms/content?site=${site}&type=form&limit=50${append?`&after=${rows.at(-1)?.id}`:''}`);if(alive.current){setRows(current=>append?[...new Map([...current,...result.records].map(row=>[row.id,row])).values()]:result.records);setMore(result.records.length===50);}}
 useEffect(()=>{alive.current=true;setAutosaveEnabled(false);setAutosaveStatus('');run(async()=>{await list();if(initialRecord&&alive.current)await load(initialRecord.id);});return()=>{alive.current=false;};},[site]); // eslint-disable-line react-hooks/exhaustive-deps
 function leave(){return !dirty||window.confirm('Discard unsaved form changes?');}
 function populateTranslatedRecord(value:RecordDetail,keepAutosave=false){if(!keepAutosave){setAutosaveEnabled(false);setAutosaveStatus('');autosaveAttempt.current='';}const parsed=formSchema.safeParse(value.payload);setConflict(null);setChoices({});setHistoryEpoch(epoch=>epoch+1);setRecord(value);setDraft(parsed.success?parsed.data:null);setLocale(value.locale);setDirty(false);setMessage(parsed.success?'':'This form needs migration before editing. Existing data is preserved.');}
 function openTranslation(value:RecordDetail){populateTranslatedRecord(value);setRows(current=>current.some(row=>row.id===value.id)?current.map(row=>row.id===value.id?value:row):[value,...current]);}
 async function load(id:string,keepAutosave=false){const value=(await apiRef.current(`/api/cms/content?site=${site}&record=${id}`)).record;if(!alive.current)return;if(!value||value.id!==id||value.type!=='form'||value.path!==null)throw Error('The requested form is unavailable.');return populateTranslatedRecord(value,keepAutosave);}
 async function save(){
  if(!draft||busy||record&&!record.permissions.edit)return;
  const payload=formSchema.parse(draft);let response;
  try{response=await apiRef.current('/api/cms/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save',site,record:record?.id??null,expectedRevision:record?.currentRevision??null,type:'form',path:null,title:payload.title,locale,payload})});}
  catch(error){
   if(record&&typeof error==='object'&&error!==null&&'status' in error&&error.status===409){
    const latest:RecordDetail=(await apiRef.current(`/api/cms/content?site=${site}&record=${record.id}`)).record;
    if(!alive.current)return;setAutosaveEnabled(false);setConflict({...prepareFormConflict(record,payload,latest),latest});setChoices({});setMessage('Another editor saved a newer form. Your unsaved fields and consent wording are preserved.');return false;
   }throw error;
  }
  if(!alive.current)return;await load(response.result.recordId,true);await list();if(alive.current){setAutosaveStatus('');setMessage('Form draft saved. Review and publication are required before visitors can use it.');}return true;
 }
 function reconcile(){
  if(!conflict||externalBusy)return;
  try{const merged=formSchema.parse(resolveDraftConflict(conflict.base,conflict.mine,conflict.remote,choices));setRecord(conflict.latest);setDraft(merged);setHistoryEpoch(epoch=>epoch+1);setConflict(null);setChoices({});setDirty(true);setMessage('Review the resolved fields, conditions and consent wording, then save again. Nothing was published.');}
  catch{setMessage('These choices do not form a valid form. Review the selected fields and conditions.');}
 }
 async function recoverNewDraft(value:NewDraftCheckpoint){
  if(busy)return;
  const checked=checkNewDraft(value,{actor:actorId,site,kind:'form'}),recovered=formSchema.parse(checked.draft);
  // Recheck authenticated site access; creation permission is enforced on save.
  await apiRef.current(`/api/cms/content?site=${site}&type=form&limit=1`);
  if(!alive.current)return;
  setRecord(null);setDraft(recovered);setLocale(checked.locale);setAutosaveEnabled(false);setAutosaveStatus('');setConflict(null);setChoices({});setDirty(true);setHistoryEpoch(epoch=>epoch+1);setMessage('New form restored locally. Review it and save explicitly to create a server draft.');
 }
 async function recoverBrowserCopy(checkpoint:DraftCheckpoint){
  if(!record||busy)return;
  const latest:RecordDetail=(await apiRef.current(`/api/cms/content?site=${site}&record=${record.id}`)).record;
  if(!alive.current)return;
  if(!latest||latest.id!==record.id||latest.type!=='form'||latest.path!==null||latest.locale!==record.locale)throw Error('The current form identity could not be verified.');
  const scope={actor:actorId,site,record:latest.id,kind:'form',locale:latest.locale};
  const mode=checkpointRecoveryMode(checkpoint,{scope,revision:latest.currentRevision,canEdit:latest.permissions?.edit===true});
  const recovered=formSchema.parse(checkpoint.draft),baseline=formSchema.parse(checkpoint.base);formSchema.parse(latest.payload);
  setAutosaveEnabled(false);setAutosaveStatus('');setChoices({});
  if(mode==='compare')setConflict({...prepareFormConflict({...latest,currentRevision:checkpoint.baseRevision,payload:baseline},recovered,latest),latest});
  else{setRecord(latest);setConflict(null);}
  setDraft(recovered);setLocale(latest.locale);setDirty(true);setHistoryEpoch(epoch=>epoch+1);setMessage(mode==='compare'?'Browser copy loaded for comparison with newer server changes. Nothing was saved.':'Browser copy restored locally. Review it before saving. Nothing was published.');
 }
 async function command(action:string,revision=record?.currentRevision){if(!record)return;return apiRef.current('/api/cms/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,site,record:record.id,revision,...(action==='restore'?{expectedRevision:record.currentRevision}:{})})});}
 async function action(name:string,revision=record?.currentRevision){if(!record)return;await command(name,revision);await load(record.id);await list();setMessage(name==='publish'?'Approved form published. Inbox-only enquiries require the configured public intake service.':name==='unpublish'?'Form withdrawn. Existing enquiries and revision history are retained.':name==='restore'?'Earlier content restored as a new draft.':'Review status updated.');}
 const editable=!record||record.permissions.edit,parsed=formSchema.safeParse(draft);
 const draftHistory=useDraftHistory({draft,locale},value=>{setDraft(value.draft);setLocale(value.locale);setDirty(true);setMessage('');},busy||!editable||!draft,`${site}:${actorId}:${record?.id??'new'}:${historyEpoch}`);
 const autosaveReady=Boolean(autosaveEnabled&&record&&dirty&&editable&&!busy&&!migrationPending&&parsed.success&&/^([a-z]{2,3})(-[A-Z]{2})?$/.test(locale));
 const autosaveSignature=JSON.stringify({site,actorId,record:record?.id,revision:record?.currentRevision,historyEpoch,draft,locale});
 const autosaveContext=useRef({signature:autosaveSignature,ready:autosaveReady});autosaveContext.current={signature:autosaveSignature,ready:autosaveReady};
 useEffect(()=>{
  if(!autosaveReady||autosaveAttempt.current===autosaveSignature)return;
  const timer=setTimeout(async()=>{
   if(!alive.current||!autosaveContext.current.ready||autosaveContext.current.signature!==autosaveSignature)return;
   autosaveAttempt.current=autosaveSignature;setAutosaveSaving(true);setAutosaveStatus('Saving form draft…');
   try{const saved=await save();if(alive.current)setAutosaveStatus(saved?'Form autosaved. Nothing was published.':'Autosave paused. Resolve the save conflict before saving.');}
   catch(error){if(alive.current){setAutosaveEnabled(false);setAutosaveStatus(`Autosave stopped. Your unsaved form is still open. ${error instanceof Error?error.message:'Try saving manually.'}`);}}
   finally{if(alive.current)setAutosaveSaving(false);}
  },3000);
  return()=>clearTimeout(timer);
 },[autosaveReady,autosaveSignature]); // Save uses this exact captured draft and revision.
 return <section className='cms-forms'><NewDraftRecoveryPanel key={`new-recovery:${actorId}:${site}:${record?.id??'new'}:${historyEpoch}`} scope={{actor:actorId,site,kind:'form'}} draft={record?null:draft} locale={locale} valid={!record&&parsed.success&&/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(locale)} dirty={!record&&dirty} disabled={busy} onRestore={value=>run(()=>recoverNewDraft(value))}/><ContactFormMigrationPanel key={`${site}:${actorId}`} site={site} actorId={actorId} rows={rows} disabled={busy||dirty} api={api} onPending={setMigrationPending} onApplied={async(id)=>{await list();await load(id);}}/><button disabled={busy} onClick={()=>{if(leave()){setAutosaveEnabled(false);setAutosaveStatus('');autosaveAttempt.current='';setHistoryEpoch(epoch=>epoch+1);setRecord(null);setDraft(newForm(crypto.randomUUID()));setLocale('en');setDirty(true);setMessage('');}}}>New form</button><div className='cms-library-grid'><aside aria-label='Forms'>{rows.map(row=><button disabled={busy} key={row.id} onClick={()=>{if(leave())run(()=>load(row.id));}}>{row.title}<small>{row.locale}</small></button>)}{more&&<button disabled={busy} onClick={()=>run(()=>list(true))}>Load more forms</button>}</aside><div>{message&&<p role='status'>{message}</p>}{conflict&&<DraftConflictPanel subject='form' {...conflict} choices={choices} onChoice={(key,value)=>setChoices({...choices,[key]:value})} onApply={reconcile} onCancel={()=>{setConflict(null);setChoices({});setMessage('Your unsaved form is preserved. Saving again checks the latest revision.');}}/>}{draft?<><p>{dirty?'Unsaved changes':record?.reviewStatus.replaceAll('_',' ')||'New draft'} · {record?.publishedRevision?'A published version is available. Draft edits are not live.':'This form is not published.'}</p><label><input type='checkbox' checked={autosaveEnabled} disabled={busy||!record||!editable} onChange={e=>{setAutosaveEnabled(e.target.checked);autosaveAttempt.current='';setAutosaveStatus('');}}/>Autosave this form after a short pause</label>{!record&&<p>Save the new form once before enabling autosave.</p>}{autosaveEnabled&&dirty&&!parsed.success&&<p>Autosave is waiting for valid fields, conditions and consent settings.</p>}{autosaveStatus&&<p role='status'>{autosaveStatus}</p>}{record&&<DraftRecoveryPanel key={`recovery:${actorId}:${site}:${record.id}:${record.currentRevision}`} scope={{actor:actorId,site,record:record.id,kind:'form',locale:record.locale}} baseRevision={record.currentRevision} base={record.payload} draft={draft} valid={parsed.success} dirty={dirty} disabled={busy||!editable} onRestore={value=>run(()=>recoverBrowserCopy(value))}/>}<div className='cms-actions' aria-label='Form draft history'><button disabled={!draftHistory.canUndo} onClick={draftHistory.undo}>Undo form change</button><button disabled={!draftHistory.canRedo} onClick={draftHistory.redo}>Redo form change</button></div><p>History includes fields, consent versions and locale. Saving or loading resets history.</p><fieldset disabled={busy||!editable}><label>Form title<input maxLength={200} value={draft.title} onChange={e=>draftHistory.change({draft:{...draft,title:e.target.value},locale})}/></label><label>Form locale<input disabled={Boolean(record)} value={locale} onChange={e=>draftHistory.change({draft,locale:e.target.value})}/></label><FormEditor key={record?.currentRevision??'new'} value={draft} onChange={value=>draftHistory.change({draft:value,locale})} disabled={busy||!editable}/></fieldset><FormNotificationRoutes key={`${actorId}:${site}:${record?.id??'new'}`} site={site} formId={record?.id??null} selected={draft.notificationRouteIds} onChange={ids=>draftHistory.change({draft:{...draft,notificationRouteIds:ids},locale})} api={api} disabled={busy||!editable}/><FormPreview value={draft}/><button disabled={busy||!editable||!dirty} onClick={()=>run(async()=>{await save();})}>Save form draft</button>{record&&<>
 <><RecordUsagePanel key={`usage:${actorId}:${site}:${record.id}:${record.currentRevision}`} site={site} record={record.id} revision={record.currentRevision} api={api} disabled={busy}/><TranslationFamilyPanel key={`family:${actorId}:${site}:${record.id}:${record.currentRevision}`} site={site} record={record.id} type='form' disabled={busy||dirty} api={api} onLoaded={openTranslation} onWorking={setTranslationWorking}/><TranslationCreatePanel key={`create:${actorId}:${site}:${record.id}:${record.currentRevision}`} actor={actorId} site={site} source={record.id} revision={record.currentRevision} sourceLocale={record.locale} path={record.path} type='form' disabled={busy||dirty} api={api} onLoaded={openTranslation} onWorking={setTranslationWorking}/><TranslationReviewPanel key={`translation:${site}:${record.id}:${record.currentRevision}`} site={site} record={record.id} revision={record.currentRevision} canApprove={Boolean(record.permissions.approve)} disabled={busy||dirty} api={api}/><PublicationSchedulePanel key={`schedule:${site}:${record.id}:${record.currentRevision}`} site={site} record={record.id} revision={record.currentRevision} publishedRevision={record.publishedRevision} approved={record.reviewStatus==='approved'} canPublish={Boolean(record.permissions.publish)} disabled={busy||dirty} api={api}/><ValidationPanel key={`${site}:${record.id}:${record.currentRevision}`} revision={record.currentRevision} dirty={dirty} disabled={busy} canRequest={Object.values(record.permissions).some(Boolean)} check={name=>command(name)}/></>
 <div className='cms-actions'>
 {record.permissions.submit&&<button disabled={busy||dirty||!['draft','changes_requested'].includes(record.reviewStatus)} onClick={()=>run(()=>action('submit'))}>Submit for review</button>}
 {record.permissions.approve&&record.reviewStatus==='in_review'&&<><button disabled={busy||dirty} onClick={()=>run(()=>action('approve'))}>Approve revision</button><button disabled={busy||dirty} onClick={()=>run(()=>action('request_changes'))}>Request changes</button></>}
 {record.permissions.publish&&<><button disabled={busy||dirty||record.reviewStatus!=='approved'} onClick={()=>{if(window.confirm('Publish this approved form for visitor enquiries?'))run(()=>action('publish'));}}>Publish approved form</button>{record.publishedRevision&&<button disabled={busy||dirty} onClick={()=>{if(window.confirm('Withdraw this form? Existing enquiries and history will be retained.'))run(()=>action('unpublish',record.publishedRevision!));}}>Unpublish form</button>}</>}
 {record.publishedRevision&&<a href={`/enquire/${record.id}`} target='_blank' rel='noopener noreferrer'>Open published form</a>}
 </div>
 <PreviewSharing key={`${site}:${record.id}:${record.currentRevision}`} site={site} record={record.id} revision={record.currentRevision} dirty={dirty} busy={busy} api={api} run={run}/>
 <details className='cms-history'><summary>Form revision history</summary>{record.history.map(revision=><div key={revision.id}><span>{new Date(revision.createdAt).toLocaleString()}{revision.id===record.currentRevision?' · Current draft':''}{revision.id===record.publishedRevision?' · Published':''}</span>{record.permissions.edit&&revision.id!==record.currentRevision&&<button disabled={busy||dirty} onClick={()=>{if(window.confirm('Restore this form revision as a new draft?'))run(()=>action('restore',revision.id));}}>Restore as draft</button>}</div>)}</details>
 </>}</>:<p>Select a form or create a draft.</p>}</div></div></section>;
}
