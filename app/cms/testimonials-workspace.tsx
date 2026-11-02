'use client';
import type {RequestedEditorRecord} from '../../lib/cms/editor-target';
import {RecordUsagePanel} from './record-usage-panel';
import {useEffect,useRef,useState} from 'react';
import {newTestimonial,testimonialSchema} from '../../lib/cms/testimonials';
import type {Testimonial} from '../../lib/cms/testimonials';
import {TestimonialMigrationPanel} from './testimonial-migration-panel';
import {TestimonialPreview} from './testimonial-preview';
import {MediaPicker} from './media-picker';
import type {LoadMediaPreview} from './media-image';
import {ExpeditionWorkflow} from './expedition-workflow';
import {ValidationPanel} from './validation-panel';
import {TranslationCreatePanel} from './translation-create-panel';
import {TranslationFamilyPanel} from './translation-family-panel';
import {TranslationReviewPanel} from './translation-review-panel';
import {PublicationSchedulePanel} from './publication-schedule-panel';
import {prepareTestimonialConflict} from '../../lib/cms/testimonial-conflict';
import {resolveDraftConflict,type ConflictChoice} from '../../lib/cms/draft-conflict';
import {DraftConflictPanel} from './draft-conflict-panel';
import {NewDraftRecoveryPanel} from './new-draft-recovery-panel';
import {checkNewDraft,type NewDraftCheckpoint} from '../../lib/cms/new-draft-checkpoints';
import {DraftRecoveryPanel} from './draft-recovery-panel';
import {checkpointRecoveryMode,type DraftCheckpoint} from '../../lib/cms/draft-checkpoints';
import {useDraftHistory} from './use-draft-history';
import {PreviewSharing} from './preview-sharing';
type Detail={id:string;type:string;path:string|null;title:string;locale:string;currentRevision:string;payload:unknown;reviewStatus:string;publishedRevision:string|null;permissions:{edit:boolean;submit:boolean;approve:boolean;publish:boolean};history:{id:string;createdAt:string}[]};
type Props={initialRecord?:RequestedEditorRecord;actorId:string;site:string;api:(path:string,options?:RequestInit)=>Promise<any>;loadPreview:LoadMediaPreview;busy:boolean;run:(work:()=>Promise<void>)=>Promise<void>;onDirty:(dirty:boolean)=>void};
const fields={name:'Guest name',role:'Role',organization:'Organization',city:'City',trip:'Trip',guestType:'Guest type',travelled:'Travel month / year',route:'Route',arranged:'What we arranged'} as const;
export function TestimonialsWorkspace({initialRecord,site,actorId,api,loadPreview,busy:externalBusy,run,onDirty}:Props){
 const [rows,setRows]=useState<Detail[]>([]),[more,setMore]=useState(false),[record,setRecord]=useState<Detail|null>(null),[draft,setDraft]=useState<Testimonial|null>(null),[dirty,setDirty]=useState(false),[locale,setLocale]=useState('en'),[message,setMessage]=useState('');
 const [migrationPending,setMigrationPending]=useState(false);
 const [historyEpoch,setHistoryEpoch]=useState(0);
 const [conflict,setConflict]=useState<(ReturnType<typeof prepareTestimonialConflict>&{latest:Detail})|null>(null),[choices,setChoices]=useState<Partial<Record<string,ConflictChoice>>>({});
 const [autosaveEnabled,setAutosaveEnabled]=useState(false),[autosaveSaving,setAutosaveSaving]=useState(false),[autosaveStatus,setAutosaveStatus]=useState('');
 const autosaveAttempt=useRef(''),alive=useRef(true);
 const [translationWorking,setTranslationWorking]=useState(false);
 const busy=translationWorking||externalBusy||migrationPending||Boolean(conflict)||autosaveSaving;
 const generation=useRef(0),apiRef=useRef(api);apiRef.current=api;
 useEffect(()=>onDirty(dirty||migrationPending||autosaveSaving),[dirty,migrationPending,autosaveSaving,onDirty]);
 async function list(append=false){const version=generation.current;const result=await apiRef.current(`/api/cms/content?site=${site}&type=testimonial&limit=50${append?`&after=${rows.at(-1)?.id}`:''}`);if(version===generation.current){setRows(current=>append?[...new Map([...current,...result.records].map(row=>[row.id,row])).values()]:result.records);setMore(result.records.length===50);}}
 useEffect(()=>{alive.current=true;setAutosaveEnabled(false);setAutosaveStatus('');generation.current++;setRows([]);setRecord(null);setDraft(null);setDirty(false);setMessage('');run(async()=>{await list();if(initialRecord&&alive.current)await load(initialRecord.id);});return()=>{alive.current=false;generation.current++;};},[site]); // eslint-disable-line react-hooks/exhaustive-deps
 function leave(){return !dirty||window.confirm('Discard unsaved testimonial changes?');}
 function change(patch:Partial<Testimonial>){if(draft)draftHistory.change({draft:{...draft,...patch},locale});}
 function populateTranslatedRecord(value:Detail,keepAutosave=false){if(!keepAutosave){setAutosaveEnabled(false);setAutosaveStatus('');autosaveAttempt.current='';}const parsed=testimonialSchema.safeParse(value.payload);setConflict(null);setChoices({});setHistoryEpoch(epoch=>epoch+1);setRecord(value);setDraft(parsed.success?parsed.data:null);setLocale(value.locale);setDirty(false);setMessage(parsed.success?'':'This testimonial needs migration before editing. Existing content is preserved.');}
 function openTranslation(value:Detail){generation.current++;populateTranslatedRecord(value);setRows(current=>current.some(row=>row.id===value.id)?current.map(row=>row.id===value.id?value:row):[value,...current]);}
 async function load(id:string,keepAutosave=false){const version=++generation.current;const value=(await apiRef.current(`/api/cms/content?site=${site}&record=${id}`)).record;if(version!==generation.current)return;if(!value||value.id!==id||value.type!=='testimonial'||value.path!==null)throw Error('Testimonial identity mismatch. Reload the workspace.');return populateTranslatedRecord(value,keepAutosave);}
 async function save(){
  if(!draft||busy||record&&!record.permissions.edit)return;
  const version=generation.current,value=testimonialSchema.parse(draft);let response;
  try{response=await apiRef.current('/api/cms/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save',site,record:record?.id??null,expectedRevision:record?.currentRevision??null,type:'testimonial',path:null,title:value.name,locale,payload:value})});}
  catch(error){
   if(record&&typeof error==='object'&&error!==null&&'status' in error&&error.status===409){
    const latest:Detail=(await apiRef.current(`/api/cms/content?site=${site}&record=${record.id}`)).record;
    if(version!==generation.current)return;
    setAutosaveEnabled(false);setConflict({...prepareTestimonialConflict(record,value,latest),latest});setChoices({});setMessage('Another editor saved a newer testimonial. Your unsaved changes are preserved.');return false;
   }throw error;
  }
  if(version!==generation.current)return;await load(response.result.recordId,true);await list();if(alive.current){setAutosaveStatus('');setMessage('Testimonial saved as a draft. It has not been published.');}return true;
 }
 function reconcile(){
  if(!conflict||externalBusy)return;
  try{const merged=testimonialSchema.parse(resolveDraftConflict(conflict.base,conflict.mine,conflict.remote,choices));setRecord(conflict.latest);setDraft(merged);setHistoryEpoch(epoch=>epoch+1);setConflict(null);setChoices({});setDirty(true);setMessage('Review the resolved quote, consent and attribution, then save the draft. Nothing was published.');}
  catch{setMessage('The selected versions do not form a valid testimonial. Review all choices, including consent evidence.');}
 }
 async function recoverNewDraft(value:NewDraftCheckpoint){
  if(busy)return;
  const version=generation.current;
  const checked=checkNewDraft(value,{actor:actorId,site,kind:'testimonial'}),recovered=testimonialSchema.parse(checked.draft);
  // Recheck authenticated site access; creation permission is enforced on save.
  await apiRef.current(`/api/cms/content?site=${site}&type=testimonial&limit=1`);
  if(!alive.current||version!==generation.current)return;
  setRecord(null);setDraft(recovered);setLocale(checked.locale);setAutosaveEnabled(false);setAutosaveStatus('');setConflict(null);setChoices({});setDirty(true);setHistoryEpoch(epoch=>epoch+1);setMessage('New testimonial restored locally. Review it and save explicitly to create a server draft.');
 }
 async function recoverBrowserCopy(checkpoint:DraftCheckpoint){
  if(!record||busy)return;
  const latest:Detail=(await apiRef.current(`/api/cms/content?site=${site}&record=${record.id}`)).record;
  if(!alive.current)return;
  if(!latest||latest.id!==record.id||latest.type!=='testimonial'||latest.path!==null||latest.locale!==record.locale)throw Error('The current testimonial identity could not be verified.');
  const scope={actor:actorId,site,record:latest.id,kind:'testimonial',locale:latest.locale};
  const mode=checkpointRecoveryMode(checkpoint,{scope,revision:latest.currentRevision,canEdit:latest.permissions?.edit===true});
  const recovered=testimonialSchema.parse(checkpoint.draft),baseline=testimonialSchema.parse(checkpoint.base);testimonialSchema.parse(latest.payload);
  setAutosaveEnabled(false);setAutosaveStatus('');setChoices({});
  if(mode==='compare')setConflict({...prepareTestimonialConflict({...latest,currentRevision:checkpoint.baseRevision,payload:baseline},recovered,latest),latest});
  else{setRecord(latest);setConflict(null);}
  setDraft(recovered);setLocale(latest.locale);setDirty(true);setHistoryEpoch(epoch=>epoch+1);setMessage(mode==='compare'?'Browser copy loaded for comparison with newer server changes. Nothing was saved.':'Browser copy restored locally. Review it before saving. Nothing was published.');
 }
 async function action(name:string,revision=record?.currentRevision){
  if(!record||busy||dirty)return;const version=generation.current;
  await apiRef.current('/api/cms/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:name,site,record:record.id,revision})});
  if(version!==generation.current)return;await load(record.id);await list();
  setMessage(name==='publish'?'Testimonial published. It can appear on pages configured to use it.':name==='unpublish'?'Testimonial withdrawn. Drafts and history are retained.':'Testimonial review status updated.');
 }
 const editable=!record||record.permissions.edit,parsed=testimonialSchema.safeParse(draft);
 const draftHistory=useDraftHistory({draft,locale},value=>{setDraft(value.draft);setLocale(value.locale);setDirty(true);setMessage('');},busy||!editable||!draft,`${site}:${record?.id??'new'}:${historyEpoch}`);
 const autosaveReady=Boolean(autosaveEnabled&&record&&dirty&&editable&&!busy&&!migrationPending&&parsed.success&&/^([a-z]{2,3})(-[A-Z]{2})?$/.test(locale));
 const autosaveSignature=JSON.stringify({site,record:record?.id,revision:record?.currentRevision,historyEpoch,draft,locale});
 const autosaveContext=useRef({signature:autosaveSignature,ready:autosaveReady});autosaveContext.current={signature:autosaveSignature,ready:autosaveReady};
 useEffect(()=>{
  if(!autosaveReady||autosaveAttempt.current===autosaveSignature)return;
  const timer=setTimeout(async()=>{
   if(!alive.current||!autosaveContext.current.ready||autosaveContext.current.signature!==autosaveSignature)return;
   autosaveAttempt.current=autosaveSignature;setAutosaveSaving(true);setAutosaveStatus('Saving testimonial draft…');
   try{const saved=await save();if(alive.current)setAutosaveStatus(saved?'Testimonial autosaved. Nothing was published.':'Autosave paused. Resolve the save conflict before saving.');}
   catch(error){if(alive.current){setAutosaveEnabled(false);setAutosaveStatus(`Autosave stopped. Your unsaved testimonial is still open. ${error instanceof Error?error.message:'Try saving manually.'}`);}}
   finally{if(alive.current)setAutosaveSaving(false);}
  },3000);
  return()=>clearTimeout(timer);
 },[autosaveReady,autosaveSignature]); // Save uses this exact captured draft and revision.
 return <section className='cms-testimonials'><NewDraftRecoveryPanel key={`new-recovery:${actorId}:${site}:${record?.id??'new'}:${historyEpoch}`} scope={{actor:actorId,site,kind:'testimonial'}} draft={record?null:draft} locale={locale} valid={!record&&parsed.success&&/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(locale)} dirty={!record&&dirty} disabled={busy} onRestore={value=>run(()=>recoverNewDraft(value))}/><TestimonialMigrationPanel site={site} api={api} disabled={busy||dirty} onPending={setMigrationPending} onApplied={()=>list()}/><button disabled={busy} onClick={()=>{if(leave()){setAutosaveEnabled(false);setAutosaveStatus('');autosaveAttempt.current='';generation.current++;setHistoryEpoch(epoch=>epoch+1);setRecord(null);setDraft(newTestimonial());setDirty(true);setLocale('en');setMessage('');}}}>New testimonial</button><div className='cms-library-grid'><aside aria-label='Testimonials'>{rows.map(row=><button key={row.id} disabled={busy} onClick={()=>{if(leave())run(()=>load(row.id));}}>{row.title}<small>{row.locale}</small></button>)}{more&&<button disabled={busy} onClick={()=>run(()=>list(true))}>Load more testimonials</button>}</aside><div>{message&&<p role='status'>{message}</p>}{conflict&&<DraftConflictPanel subject='testimonial' {...conflict} choices={choices} onChoice={(key,value)=>setChoices({...choices,[key]:value})} onApply={reconcile} onCancel={()=>{setConflict(null);setChoices({});setMessage('Your unsaved testimonial is preserved. Saving again checks the latest revision.');}}/>}{draft?<><p>{dirty?'Unsaved changes':'Draft loaded'} · {record?.publishedRevision?'A published version is available.':'Not published.'} Saving a draft does not change the published review.</p><label><input type='checkbox' checked={autosaveEnabled} disabled={busy||!record||!editable} onChange={e=>{setAutosaveEnabled(e.target.checked);autosaveAttempt.current='';setAutosaveStatus('');}}/>Autosave this testimonial after a short pause</label>{!record&&<p>Save the new testimonial once before enabling autosave.</p>}{autosaveEnabled&&dirty&&!parsed.success&&<p>Autosave is waiting for complete, valid testimonial fields.</p>}{autosaveStatus&&<p role='status'>{autosaveStatus}</p>}{record&&<DraftRecoveryPanel key={`recovery:${actorId}:${site}:${record.id}:${record.currentRevision}`} scope={{actor:actorId,site,record:record.id,kind:'testimonial',locale:record.locale}} baseRevision={record.currentRevision} base={record.payload} draft={draft} valid={parsed.success} dirty={dirty} disabled={busy||!editable} onRestore={value=>run(()=>recoverBrowserCopy(value))}/>}<div className='cms-actions' aria-label='Testimonial draft history'><button type='button' disabled={!draftHistory.canUndo} onClick={draftHistory.undo}>Undo testimonial change</button><button type='button' disabled={!draftHistory.canRedo} onClick={draftHistory.redo}>Redo testimonial change</button></div><p>Undo and redo cover unsaved testimonial and locale edits. Saving or loading a testimonial clears this history.</p><fieldset disabled={busy||!editable}><legend>Guest quote and attribution</legend>{Object.entries(fields).map(([key,label])=><label key={key}>{label}<input value={draft[key as keyof typeof fields]} maxLength={key==='arranged'?5000:key==='route'?1000:200} onChange={event=>change({[key]:event.target.value})}/></label>)}<label>Quote<textarea maxLength={10000} rows={5} value={draft.quote} onChange={e=>change({quote:e.target.value})}/></label><label>Locale<input disabled={Boolean(record)} value={locale} onChange={e=>draftHistory.change({draft,locale:e.target.value})}/></label><label><input type='checkbox' checked={draft.anonymous} onChange={e=>change({anonymous:e.target.checked})}/>Withhold guest identity</label><p>Anonymous display hides the name, role, organization, city and image. Review the quote and trip details for identifying text.</p><label><input type='checkbox' checked={draft.verified} onChange={e=>change({verified:e.target.checked})}/>Wording verified against the guest’s source</label><label>Publication consent<select value={draft.consent.status} onChange={e=>change({consent:{...draft.consent,status:e.target.value as Testimonial['consent']['status']}})}>{['pending','granted','withdrawn'].map(status=><option key={status}>{status}</option>)}</select></label><label>Internal consent evidence<textarea maxLength={5000} value={draft.consent.evidence} onChange={e=>change({consent:{...draft.consent,evidence:e.target.value}})}/></label><MediaPicker site={site} value={draft.image?.assetId??''} disabled={busy||!editable} api={api} loadPreview={loadPreview} onChange={assetId=>change({image:{assetId,alt:draft.image?.alt??'',decorative:false}})}/>{draft.image&&<><label>Image alternative text<input maxLength={500} value={draft.image.alt} onChange={e=>change({image:{...draft.image!,alt:e.target.value}})}/></label><button type='button' onClick={()=>change({image:undefined})}>Remove image</button></>}</fieldset>{!parsed.success&&<ul role='alert'>{parsed.error.issues.map((issue,index)=><li key={index}>{issue.path.join('.')}: {issue.message}</li>)}</ul>}<button disabled={busy||!editable||!dirty||!parsed.success} onClick={()=>run(async()=>{await save();})}>Save testimonial draft</button>{parsed.success&&<section aria-label='Testimonial display preview'><h3>Display preview</h3><TestimonialPreview value={parsed.data} loadPreview={loadPreview}/></section>}{record&&<><><RecordUsagePanel key={`usage:${actorId}:${site}:${record.id}:${record.currentRevision}`} site={site} record={record.id} revision={record.currentRevision} api={api} disabled={busy}/><TranslationFamilyPanel key={`family:${actorId}:${site}:${record.id}:${record.currentRevision}`} site={site} record={record.id} type='testimonial' disabled={busy||dirty} api={api} onLoaded={openTranslation} onWorking={setTranslationWorking}/><TranslationCreatePanel key={`create:${actorId}:${site}:${record.id}:${record.currentRevision}`} actor={actorId} site={site} source={record.id} revision={record.currentRevision} sourceLocale={record.locale} path={record.path} type='testimonial' disabled={busy||dirty} api={api} onLoaded={openTranslation} onWorking={setTranslationWorking}/><TranslationReviewPanel key={`translation:${site}:${record.id}:${record.currentRevision}`} site={site} record={record.id} revision={record.currentRevision} canApprove={Boolean(record.permissions.approve)} disabled={busy||dirty} api={api}/><PublicationSchedulePanel key={`schedule:${site}:${record.id}:${record.currentRevision}`} site={site} record={record.id} revision={record.currentRevision} publishedRevision={record.publishedRevision} approved={record.reviewStatus==='approved'} canPublish={Boolean(record.permissions.publish)} disabled={busy||dirty} api={api}/><ValidationPanel key={`checks:${site}:${record.id}:${record.currentRevision}`} revision={record.currentRevision} dirty={dirty} disabled={busy} canRequest={Object.values(record.permissions).some(Boolean)} check={action=>apiRef.current('/api/cms/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,site,record:record.id,revision:record.currentRevision})})}/></><ExpeditionWorkflow key={`workflow:${site}:${record.id}`} subject='testimonial' rollout='testimonial' record={record} disabled={busy||dirty} onAction={(name,revision)=>{run(()=>action(name,revision));}}/><p>To withdraw consent for a published review, unpublish it first. Saving consent changes as a draft does not withdraw the published version.</p><PreviewSharing key={record.currentRevision} site={site} record={record.id} revision={record.currentRevision} dirty={dirty} busy={busy} api={api} run={run}/><details><summary>Revision history</summary>{record.history.map(revision=><div key={revision.id}><p>{new Date(revision.createdAt).toLocaleString()}{revision.id===record.currentRevision?' · Current':''}{revision.id===record.publishedRevision?' · Published':''}</p>{editable&&revision.id!==record.currentRevision&&<button disabled={busy||dirty} onClick={()=>{if(window.confirm('Restore this testimonial as a new draft?'))run(async()=>{const version=generation.current;await apiRef.current('/api/cms/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'restore',site,record:record.id,revision:revision.id,expectedRevision:record.currentRevision})});if(version!==generation.current)return;await load(record.id);await list();});}}>Restore as draft</button>}</div>)}</details></>}</>:<p>Select a testimonial or create a draft.</p>}</div></div></section>;
}
