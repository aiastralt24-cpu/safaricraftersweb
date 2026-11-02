'use client';
import type {RequestedEditorRecord} from '../../lib/cms/editor-target';
import {useEffect,useRef,useState} from 'react';
import {newSpecialist,specialistSchema,type SpecialistDraft} from '../../lib/cms/specialists';
import {SectionImageEditor} from './section-image-editor';
import {RecordPicker} from './record-picker';
import {SpecialistMigrationPanel} from './specialist-migration-panel';
import {SpecialistPreview} from './specialist-preview';
import {PreviewSharing} from './preview-sharing';
import {NewDraftRecoveryPanel} from './new-draft-recovery-panel';
import {checkNewDraft,type NewDraftCheckpoint} from '../../lib/cms/new-draft-checkpoints';
import {DraftRecoveryPanel} from './draft-recovery-panel';
import {checkpointRecoveryMode,type DraftCheckpoint} from '../../lib/cms/draft-checkpoints';
import {useDraftHistory} from './use-draft-history';
import {prepareSpecialistConflict} from '../../lib/cms/specialist-conflict';
import {resolveDraftConflict,type ConflictChoice} from '../../lib/cms/draft-conflict';
import {DraftConflictPanel} from './draft-conflict-panel';
import {ExpeditionWorkflow} from './expedition-workflow';
import {ValidationPanel} from './validation-panel';
import {TranslationCreatePanel} from './translation-create-panel';
import {TranslationFamilyPanel} from './translation-family-panel';
import {TranslationReviewPanel} from './translation-review-panel';
import {PublicationSchedulePanel} from './publication-schedule-panel';
import type {LoadMediaPreview} from './media-image';
type Detail={id:string;type:string;path:string|null;title:string;locale:string;currentRevision:string;payload:unknown;history:{id:string;createdAt:string}[];reviewStatus:string;publishedRevision:string|null;permissions:{edit:boolean;submit:boolean;approve:boolean;publish:boolean}};
type Props={initialRecord?:RequestedEditorRecord;site:string;actorId:string;api:(path:string,options?:RequestInit)=>Promise<any>;loadPreview:LoadMediaPreview;busy:boolean;run:(work:()=>Promise<void>)=>Promise<void>;onDirty:(value:boolean)=>void};
export function SpecialistsWorkspace({initialRecord,site,actorId,api,loadPreview,busy:externalBusy,run,onDirty}:Props){
 const [rows,setRows]=useState<Detail[]>([]),[more,setMore]=useState(false),[query,setQuery]=useState(''),[record,setRecord]=useState<Detail|null>(null),[draft,setDraft]=useState<SpecialistDraft|null>(null),[dirty,setDirty]=useState(false),[locale,setLocale]=useState('en'),[message,setMessage]=useState('');
 const [migrationPending,setMigrationPending]=useState(false);
 const [historyEpoch,setHistoryEpoch]=useState(0);
 const [conflict,setConflict]=useState<(ReturnType<typeof prepareSpecialistConflict>&{latest:Detail})|null>(null),[choices,setChoices]=useState<Partial<Record<string,ConflictChoice>>>({});
 const [autosaveEnabled,setAutosaveEnabled]=useState(false),[autosaveSaving,setAutosaveSaving]=useState(false),[autosaveStatus,setAutosaveStatus]=useState('');
 const autosaveAttempt=useRef(''),alive=useRef(true);
 const [translationWorking,setTranslationWorking]=useState(false);
 const busy=translationWorking||externalBusy||migrationPending||Boolean(conflict)||autosaveSaving;
 const generation=useRef(0),apiRef=useRef(api);apiRef.current=api;
 useEffect(()=>onDirty(dirty||migrationPending||autosaveSaving),[dirty,migrationPending,autosaveSaving,onDirty]);
 async function list(append=false){const version=generation.current;const result=await apiRef.current(`/api/cms/content?site=${site}&type=specialist&limit=50${append?`&after=${rows.at(-1)?.id}`:''}`);if(version!==generation.current)return;setRows(current=>append?[...new Map([...current,...result.records].map(row=>[row.id,row])).values()]:result.records);setMore(result.records.length===50);}
 useEffect(()=>{alive.current=true;setAutosaveEnabled(false);setAutosaveStatus('');setConflict(null);generation.current++;setRows([]);setRecord(null);setDraft(null);setDirty(false);setMessage('');run(async()=>{await list();if(initialRecord&&alive.current)await load(initialRecord.id);});return()=>{alive.current=false;generation.current++;};},[site]); // eslint-disable-line react-hooks/exhaustive-deps
 function leave(){return !dirty||window.confirm('Discard unsaved specialist changes?');}
 function change(patch:Partial<SpecialistDraft>){if(draft)draftHistory.change({draft:{...draft,...patch},locale});}
 function populateTranslatedRecord(value:Detail,keepAutosave=false){if(!keepAutosave){setAutosaveEnabled(false);setAutosaveStatus('');autosaveAttempt.current='';}setConflict(null);setChoices({});const parsed=specialistSchema.safeParse(value.payload);setHistoryEpoch(epoch=>epoch+1);setRecord(value);setDraft(parsed.success?parsed.data:null);setLocale(value.locale);setDirty(false);setMessage(parsed.success?'':'This profile needs migration before editing. Existing content is preserved.');}
 function openTranslation(value:Detail){generation.current++;populateTranslatedRecord(value);setRows(current=>current.some(row=>row.id===value.id)?current.map(row=>row.id===value.id?value:row):[value,...current]);}
 async function load(id:string,keepAutosave=false){const version=++generation.current;const value=(await apiRef.current(`/api/cms/content?site=${site}&record=${id}`)).record;if(version!==generation.current)return;if(!value||value.id!==id||value.type!=='specialist'||value.path!==null)throw Error('Specialist identity mismatch. Reload the workspace.');return populateTranslatedRecord(value,keepAutosave);}
 async function save(){
  if(!draft||busy||migrationPending||record&&!record.permissions.edit)return;
  const payload=specialistSchema.parse(draft),current=generation.current;let response;
  try{response=await apiRef.current('/api/cms/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save',site,record:record?.id??null,expectedRevision:record?.currentRevision??null,type:'specialist',path:null,title:payload.name,locale,payload})});}
  catch(error){
   if(record&&typeof error==='object'&&error!==null&&'status' in error&&error.status===409){
    const latest:Detail=(await apiRef.current(`/api/cms/content?site=${site}&record=${record.id}`)).record;
    if(!alive.current||generation.current!==current)return;
    setAutosaveEnabled(false);setConflict({...prepareSpecialistConflict(record,payload,latest),latest});setChoices({});setMessage('Another editor saved a newer revision. Your unsaved profile is preserved.');return false;
   }
   throw error;
  }
  if(!alive.current||generation.current!==current)return;await load(response.result.recordId,true);await list();if(alive.current){setAutosaveStatus('');setMessage('Specialist saved as a draft. The public website is unchanged.');}return true;
 }
 function reconcile(){
  if(!conflict||externalBusy)return;
  const merged=specialistSchema.parse(resolveDraftConflict(conflict.base,conflict.mine,conflict.remote,choices));
  setRecord(conflict.latest);setDraft(merged);setHistoryEpoch(epoch=>epoch+1);setConflict(null);setChoices({});setDirty(true);setMessage('Your choices are ready to review. Save the profile draft to create a new revision. Nothing was published.');
 }
 async function recoverNewDraft(value:NewDraftCheckpoint){
  if(busy)return;
  const version=generation.current;
  const checked=checkNewDraft(value,{actor:actorId,site,kind:'specialist'}),recovered=specialistSchema.parse(checked.draft);
  // Recheck authenticated site access; creation permission is enforced on save.
  await apiRef.current(`/api/cms/content?site=${site}&type=specialist&limit=1`);
  if(!alive.current||version!==generation.current)return;
  setRecord(null);setDraft(recovered);setLocale(checked.locale);setAutosaveEnabled(false);setAutosaveStatus('');setConflict(null);setChoices({});setDirty(true);setHistoryEpoch(epoch=>epoch+1);setMessage('New specialist restored locally. Review it and save explicitly to create a server draft.');
 }
 async function recoverBrowserCopy(checkpoint:DraftCheckpoint){
  if(!record||busy)return;
  const latest:Detail=(await apiRef.current(`/api/cms/content?site=${site}&record=${record.id}`)).record;
  if(!alive.current)return;
  if(!latest||latest.id!==record.id||latest.type!=='specialist'||latest.path!==null||latest.locale!==record.locale)throw Error('The current specialist identity could not be verified.');
  const scope={actor:actorId,site,record:latest.id,kind:'specialist',locale:latest.locale};
  const mode=checkpointRecoveryMode(checkpoint,{scope,revision:latest.currentRevision,canEdit:latest.permissions?.edit===true});
  const recovered=specialistSchema.parse(checkpoint.draft),baseline=specialistSchema.parse(checkpoint.base);specialistSchema.parse(latest.payload);
  setAutosaveEnabled(false);setAutosaveStatus('');setChoices({});
  if(mode==='compare')setConflict({...prepareSpecialistConflict({...latest,currentRevision:checkpoint.baseRevision,payload:baseline},recovered,latest),latest});
  else{setRecord(latest);setConflict(null);}
  setDraft(recovered);setLocale(latest.locale);setDirty(true);setHistoryEpoch(epoch=>epoch+1);setMessage(mode==='compare'?'Browser copy loaded for comparison with newer server changes. Nothing was saved.':'Browser copy restored locally. Review it before saving. Nothing was published.');
 }
 async function action(name:string,revision=record?.currentRevision){
  if(!record||busy||dirty)return;const version=generation.current;
  await apiRef.current('/api/cms/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:name,site,record:record.id,revision})});
  if(version!==generation.current)return;await load(record.id);await list();
  setMessage(name==='publish'?'Specialist publication recorded. Directory display also requires visibility and the configured specialist rollout.':name==='unpublish'?'Specialist withdrawn. Drafts and history are retained.':'Specialist review status updated.');
 }
 async function restore(revision:string){
  if(!record||busy||dirty||!record.permissions.edit||revision===record.currentRevision||!record.history.some(item=>item.id===revision))return;
  const version=generation.current;
  await apiRef.current('/api/cms/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'restore',site,record:record.id,revision,expectedRevision:record.currentRevision})});
  if(version!==generation.current)return;await load(record.id);await list();setMessage('Historical profile restored as a new draft. The published revision is unchanged; review and trusted validation are required before publishing.');
 }
 const editable=!record||record.permissions.edit,parsed=specialistSchema.safeParse(draft),context={site,api,loadPreview,disabled:busy||!editable};
 const draftHistory=useDraftHistory({draft,locale},value=>{setDraft(value.draft);setLocale(value.locale);setDirty(true);setMessage('');},busy||!editable||!draft,`${site}:${actorId}:${historyEpoch}`);
 const autosaveReady=Boolean(autosaveEnabled&&record&&dirty&&editable&&!busy&&!migrationPending&&parsed.success&&/^([a-z]{2,3})(-[A-Z]{2})?$/.test(locale));
 const autosaveSignature=JSON.stringify({site,actorId,record:record?.id,revision:record?.currentRevision,historyEpoch,draft,locale});
 const autosaveContext=useRef({signature:autosaveSignature,ready:autosaveReady});autosaveContext.current={signature:autosaveSignature,ready:autosaveReady};
 useEffect(()=>{
  if(!autosaveReady||autosaveAttempt.current===autosaveSignature)return;
  const timer=setTimeout(async()=>{
   if(!alive.current||!autosaveContext.current.ready||autosaveContext.current.signature!==autosaveSignature)return;
   autosaveAttempt.current=autosaveSignature;setAutosaveSaving(true);setAutosaveStatus('Saving profile draft…');
   try{const saved=await save();if(alive.current)setAutosaveStatus(saved?'Profile autosaved. Nothing was published.':'Autosave paused. Resolve the save conflict before saving.');}
   catch(error){if(alive.current){setAutosaveEnabled(false);setAutosaveStatus(`Autosave stopped. Your unsaved profile is still open. ${error instanceof Error?error.message:'Try saving manually.'}`);}}
   finally{if(alive.current)setAutosaveSaving(false);}
  },3000);
  return()=>clearTimeout(timer);
 },[autosaveReady,autosaveSignature]); // Save uses this exact captured draft and revision.
 return <section className='cms-library cms-specialists'><NewDraftRecoveryPanel key={`new-recovery:${actorId}:${site}:${record?.id??'new'}:${historyEpoch}`} scope={{actor:actorId,site,kind:'specialist'}} draft={record?null:draft} locale={locale} valid={!record&&parsed.success&&/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(locale)} dirty={!record&&dirty} disabled={busy} onRestore={value=>run(()=>recoverNewDraft(value))}/><SpecialistMigrationPanel key={`${site}:${actorId}`} site={site} actorId={actorId} api={api} loadPreview={loadPreview} disabled={externalBusy||autosaveSaving||Boolean(conflict)||dirty} onPending={setMigrationPending} onApplied={()=>list()}/><button disabled={busy} onClick={()=>{if(leave()){setAutosaveEnabled(false);setAutosaveStatus('');autosaveAttempt.current='';generation.current++;setHistoryEpoch(epoch=>epoch+1);setRecord(null);setDraft(newSpecialist());setLocale('en');setDirty(true);setMessage('');}}}>New specialist</button><div className='cms-library-grid'><aside aria-label='Specialist profiles'><label>Search loaded specialists<input value={query} onChange={e=>setQuery(e.target.value)}/></label>{rows.filter(row=>row.title.toLowerCase().includes(query.toLowerCase())).map(row=><button key={row.id} disabled={busy} onClick={()=>{if(leave())run(()=>load(row.id));}}>{row.title}<small>{row.locale}</small></button>)}{!rows.length&&<p>No specialist profiles yet.</p>}{more&&<button disabled={busy} onClick={()=>run(()=>list(true))}>Load more specialists</button>}</aside><div className='cms-library-detail'>{message&&<p role='status'>{message}</p>}{conflict&&<DraftConflictPanel subject='profile' {...conflict} choices={choices} onChoice={(key,value)=>setChoices({...choices,[key]:value})} onApply={reconcile} onCancel={()=>{setConflict(null);setChoices({});setMessage('Your unsaved profile is preserved. Saving again rechecks the latest revision.');}}/>}{draft?<><p>{dirty?'Unsaved changes':'Saved draft'} · {record?.reviewStatus.replaceAll('_',' ')||'New draft'}. Publication requires approval and a current trusted check.</p><label><input type='checkbox' checked={autosaveEnabled} disabled={busy||migrationPending||!record||!editable} onChange={e=>{setAutosaveEnabled(e.target.checked);autosaveAttempt.current='';setAutosaveStatus('');}}/>Autosave this profile after a short pause</label>{!record&&<p>Save the new profile once before enabling autosave.</p>}{autosaveEnabled&&dirty&&!parsed.success&&<p>Autosave is waiting for complete, valid profile fields.</p>}{autosaveStatus&&<p role='status'>{autosaveStatus}</p>}{record&&<DraftRecoveryPanel key={`recovery:${actorId}:${site}:${record.id}:${record.currentRevision}`} scope={{actor:actorId,site,record:record.id,kind:'specialist',locale:record.locale}} baseRevision={record.currentRevision} base={record.payload} draft={draft} valid={parsed.success} dirty={dirty} disabled={busy||!editable} onRestore={value=>run(()=>recoverBrowserCopy(value))}/>}<div className='cms-actions' aria-label='Specialist draft history'><button type='button' disabled={!draftHistory.canUndo} onClick={draftHistory.undo}>Undo specialist change</button><button type='button' disabled={!draftHistory.canRedo} onClick={draftHistory.redo}>Redo specialist change</button></div><p>Undo and redo cover unsaved profile and locale edits. Saving or loading a profile clears this history.</p><fieldset disabled={busy||!editable}><legend>Specialist profile</legend><label>Name<input maxLength={200} value={draft.name} onChange={e=>change({name:e.target.value})}/></label><label>Profile type<select value={draft.kind} onChange={e=>change({kind:e.target.value as SpecialistDraft['kind']})}><option value='person'>Individual specialist</option><option value='team'>Team</option></select></label><label>Role<input maxLength={200} value={draft.role} onChange={e=>change({role:e.target.value})}/></label>{([['expertise','Expertise',2000],['bio','Biography',10000],['moment','Field note',5000]] as const).map(([key,label,max])=><label key={key}>{label}<textarea aria-label={label} rows={4} maxLength={max} value={draft[key]} onChange={e=>change({[key]:e.target.value})}/></label>)}<label>Directory visibility<select value={draft.visible?'visible':'hidden'} onChange={e=>change({visible:e.target.value==='visible'})}><option value='hidden'>Hidden</option><option value='visible'>Visible after publication</option></select></label><label>Display order<input type='number' min={0} max={9999} step={1} value={draft.sortOrder} onChange={e=>change({sortOrder:Number(e.target.value)})}/><small>Lower numbers appear first.</small></label><label>Locale<input disabled={Boolean(record)} value={locale} onChange={e=>draftHistory.change({draft,locale:e.target.value})}/></label><label>Planning button label<input maxLength={80} value={draft.planning.label} onChange={e=>change({planning:{...draft.planning,label:e.target.value}})}/></label><label>Specialist name included in enquiries<input maxLength={200} value={draft.planning.enquiryName} onChange={e=>change({planning:{...draft.planning,enquiryName:e.target.value}})}/></label><SectionImageEditor label='Profile portrait' context={context} value={draft.image??{assetId:'',alt:'',decorative:false}} onChange={image=>change({image})}/>{draft.image&&<button onClick={()=>change({image:undefined})}>Remove portrait</button>}<details><summary>Related journeys</summary><RecordPicker type='journey' value={draft.journeys} onChange={journeys=>change({journeys})} context={context}/></details><details><summary>Related photography expeditions</summary><RecordPicker type='photoExpedition' value={draft.expeditions} onChange={expeditions=>change({expeditions})} context={context}/></details>{draft.video&&<fieldset><legend>Existing specialist film</legend>{(['title','caption','transcript'] as const).map(key=><label key={key}>Film {key}<textarea maxLength={key==='transcript'?50000:key==='caption'?2000:200} value={draft.video![key]} onChange={e=>change({video:{...draft.video!,[key]:e.target.value}})}/></label>)}</fieldset>}<p>Film uploads and playback are still being connected. Existing film content is retained when saving.</p></fieldset>{!parsed.success&&<ul role='alert'>{parsed.error.issues.map((issue,index)=><li key={index}>{issue.path.join('.')}: {issue.message}</li>)}</ul>}<button disabled={busy||!editable||!dirty||!parsed.success||!/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(locale)} onClick={()=>run(async()=>{await save();})}>Save specialist draft</button>{parsed.success&&<details><summary>Preview profile content</summary><SpecialistPreview value={parsed.data} loadPreview={loadPreview}/></details>}{record&&<PreviewSharing key={`specialist:${record.id}:${record.currentRevision}`} site={site} record={record.id} revision={record.currentRevision} dirty={dirty} busy={busy} api={api} run={run}/>} {record&&<><TranslationFamilyPanel key={`family:${actorId}:${site}:${record.id}:${record.currentRevision}`} site={site} record={record.id} type='specialist' disabled={busy||dirty} api={api} onLoaded={openTranslation} onWorking={setTranslationWorking}/><TranslationCreatePanel key={`create:${actorId}:${site}:${record.id}:${record.currentRevision}`} actor={actorId} site={site} source={record.id} revision={record.currentRevision} sourceLocale={record.locale} path={record.path} type='specialist' disabled={busy||dirty} api={api} onLoaded={openTranslation} onWorking={setTranslationWorking}/><TranslationReviewPanel key={`translation:${site}:${record.id}:${record.currentRevision}`} site={site} record={record.id} revision={record.currentRevision} canApprove={Boolean(record.permissions.approve)} disabled={busy||dirty} api={api}/><PublicationSchedulePanel key={`schedule:${site}:${record.id}:${record.currentRevision}`} site={site} record={record.id} revision={record.currentRevision} publishedRevision={record.publishedRevision} approved={record.reviewStatus==='approved'} canPublish={Boolean(record.permissions.publish)} disabled={busy||dirty} api={api}/><ValidationPanel key={record.currentRevision} revision={record.currentRevision} dirty={dirty} disabled={busy} canRequest={Object.values(record.permissions).some(Boolean)} check={action=>apiRef.current('/api/cms/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,site,record:record.id,revision:record.currentRevision})})}/></>}{record&&<ExpeditionWorkflow key={`workflow:${record.id}`} subject='specialist' rollout='specialist' record={record} disabled={busy||dirty} onAction={(name,revision)=>{run(()=>action(name,revision));}}/>}{record&&<details className='cms-history'><summary>Revision history</summary><p>Restore an older version as a new draft. Publishing it requires fresh review and validation.</p>{record.history.map(revision=><div key={revision.id}><p>{new Date(revision.createdAt).toLocaleString()}{revision.id===record.currentRevision?' · Current draft':''}{revision.id===record.publishedRevision?' · Published':''}</p>{editable&&revision.id!==record.currentRevision&&<button type='button' disabled={busy||dirty} onClick={()=>{if(window.confirm('Restore this specialist revision as a new draft? The published profile will not change.'))run(()=>restore(revision.id));}}>Restore specialist draft</button>}</div>)}</details>}</>:<p>Select a specialist or create a profile.</p>}</div></div></section>;
}
