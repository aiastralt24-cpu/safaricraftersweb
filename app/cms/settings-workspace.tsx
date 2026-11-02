'use client';
import type {RequestedEditorRecord} from '../../lib/cms/editor-target';
import {SettingsReview,type SettingsReviewAction} from './settings-review';
import {SettingsRelease,type SettingsReleaseAction} from './settings-release';
import {prepareSettingsConflict} from '../../lib/cms/settings-conflict';
import {resolveDraftConflict,type ConflictChoice} from '../../lib/cms/draft-conflict';
import {DraftConflictPanel} from './draft-conflict-panel';
import {NewDraftRecoveryPanel} from './new-draft-recovery-panel';
import {checkNewDraft,type NewDraftCheckpoint} from '../../lib/cms/new-draft-checkpoints';
import {DraftRecoveryPanel} from './draft-recovery-panel';
import {checkpointRecoveryMode,type DraftCheckpoint} from '../../lib/cms/draft-checkpoints';
import {useDraftHistory} from './use-draft-history';
import {SettingsHistory} from './settings-history';
import {ValidationPanel} from './validation-panel';
import {verifiedSettingsWorkspace} from '../../lib/cms/settings-workspace-state';
import {TranslationCreatePanel} from './translation-create-panel';
import {TranslationFamilyPanel} from './translation-family-panel';
import {TranslationReviewPanel} from './translation-review-panel';
import {PublicationSchedulePanel} from './publication-schedule-panel';
import {SettingsMessagesEditor} from './settings-messages-editor';
import {SettingsStructuredEditor} from './settings-structured-editor';
import type {LoadMediaPreview} from './media-image';
import {useEffect,useRef,useState} from 'react';
import {globalSettingsSchema,newGlobalSettings,globalSettingsImpact} from '../../lib/cms/global-settings';
import type {GlobalSettings,SettingsImpact} from '../../lib/cms/global-settings';
type Detail={type:'settings';path:null;id:string;currentRevision:string;payload:unknown;locale:string;publishedRevision:string|null;history:{id:string;createdAt:string}[];reviewStatus:string;permissions:{edit:boolean;submit:boolean;approve:boolean;publish:boolean}};
type Props={initialRecord?:RequestedEditorRecord;actorId:string;loadPreview:LoadMediaPreview;site:string;api:(path:string,options?:RequestInit)=>Promise<any>;busy:boolean;run:(work:()=>Promise<void>)=>Promise<void>;onDirty:(value:boolean)=>void};
const fields=[['brand.name','Website name'],['brand.tagline','Tagline'],['contact.email','Contact email'],['contact.phone','Contact phone'],['footer.copyright','Copyright text'],['footer.disclaimer','Footer disclaimer'],['seo.titleTemplate','Default SEO title template'],['seo.description','Default SEO description'],['cookies.title','Cookie banner title'],['cookies.description','Cookie banner description'],['cookies.acceptLabel','Accept button label'],['cookies.rejectLabel','Reject button label'],['cookies.preferencesLabel','Preferences button label'],['search.placeholder','Search placeholder'],['search.emptyMessage','Empty search message']] as const;
export function SettingsWorkspace({initialRecord,actorId,site,api,busy:externalBusy,run,onDirty,loadPreview}:Props){
 const [record,setRecord]=useState<Detail|null>(null),[draft,setDraft]=useState<GlobalSettings|null>(null),[locale,setLocale]=useState('en'),[requestedLocale,setRequestedLocale]=useState('en'),[dirty,setDirty]=useState(false),[canCreate,setCanCreate]=useState(false),[canConfigure,setCanConfigure]=useState(false),[repair,setRepair]=useState(''),[impact,setImpact]=useState<SettingsImpact[]|null>(null),[ack,setAck]=useState(false),[message,setMessage]=useState('');
 const [historyCursor,setHistoryCursor]=useState<string|null>(null);
 const [historyEpoch,setHistoryEpoch]=useState(0);
 const [conflict,setConflict]=useState<(ReturnType<typeof prepareSettingsConflict>&{latest:Detail;canConfigure:boolean})|null>(null),[choices,setChoices]=useState<Partial<Record<string,ConflictChoice>>>({});
 const [translationWorking,setTranslationWorking]=useState(false);
 const busy=externalBusy||Boolean(conflict)||translationWorking;
 const historyRequest=useRef(false);
 const loadGeneration=useRef(0);
 const apiRef=useRef(api);apiRef.current=api;const alive=useRef(true);
 useEffect(()=>{onDirty(dirty);},[dirty,onDirty]);
 function populateSettings(result:ReturnType<typeof verifiedSettingsWorkspace>,targetLocale:string){
  setLocale(targetLocale);setRequestedLocale(targetLocale);setConflict(null);setChoices({});setHistoryEpoch(epoch=>epoch+1);setRecord(result.record);setHistoryCursor(result.record?.history.length===20?result.record.history.at(-1)!.id:null);setCanCreate(result.canCreate);setCanConfigure(result.canConfigure);const parsed=globalSettingsSchema.safeParse(result.record?.payload??newGlobalSettings());setDraft(parsed.success?parsed.data:null);setRepair(parsed.success?'':'Existing settings need migration. They have not been overwritten.');setDirty(false);setImpact(null);setAck(false);setMessage('');
 }
 async function load(targetLocale=locale,expectedRecord?:string){
  const generation=++loadGeneration.current;setRecord(null);setDraft(null);setHistoryCursor(null);setCanCreate(false);setCanConfigure(false);
  const result=verifiedSettingsWorkspace((await apiRef.current(`/api/cms/settings?site=${site}&locale=${targetLocale}`)).result,targetLocale,expectedRecord);
  if(!alive.current||generation!==loadGeneration.current)return;
  populateSettings(result,targetLocale);
 }
 async function openTranslation(value:Detail){
  const generation=++loadGeneration.current;
  const result=verifiedSettingsWorkspace((await apiRef.current(`/api/cms/settings?site=${site}&locale=${value.locale}`)).result,value.locale,value.id);
  if(!alive.current||generation!==loadGeneration.current)throw Error('The settings workspace changed before the translation opened. Recover it when you return.');
  populateSettings(result,value.locale);
 }
 useEffect(()=>{alive.current=true;run(()=>load(initialRecord?.locale??locale,initialRecord?.id));return()=>{alive.current=false;loadGeneration.current++;};},[site]); // eslint-disable-line react-hooks/exhaustive-deps
 function change(path:string,value:unknown){if(!draft)return;const next=structuredClone(draft);const keys=path.split('.');let target:any=next;for(const key of keys.slice(0,-1))target=target[key];target[keys.at(-1)!]=value;draftHistory.change(next);}
 async function reviewAction(action:SettingsReviewAction,revision:string){
  if(!record||dirty||busy||revision!==record.currentRevision)return;
  const generation=loadGeneration.current;
  await apiRef.current('/api/cms/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,site,record:record.id,revision})});
  if(!alive.current||generation!==loadGeneration.current)return;
  await load();setMessage(action==='approve'?'Settings revision approved. Nothing has been published.':action==='submit'?'Settings submitted for review. The published website is unchanged.':'Changes requested. The published website is unchanged.');
 }
 async function release(action:SettingsReleaseAction,revision:string){
  if(!record||busy||dirty||!record.permissions.publish)return;
  if(action==='publish'&&(record.reviewStatus!=='approved'||revision!==record.currentRevision))return;
  if(action==='unpublish'&&revision!==record.publishedRevision)return;
  const generation=loadGeneration.current;
  await apiRef.current('/api/cms/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,site,record:record.id,revision})});
  if(!alive.current||generation!==loadGeneration.current)return;
  await load();setMessage(action==='publish'?'Settings published. Website delivery depends on the configured CMS settings rollout.':'Published settings withdrawn. Drafts and revision history are retained.');
 }
 async function loadOlderHistory(){
  if(!record||!historyCursor||busy||dirty||historyRequest.current)return;
  const generation=loadGeneration.current,cursor=historyCursor,recordId=record.id;
  historyRequest.current=true;
  try{
   const {result}=await apiRef.current(`/api/cms/history?site=${site}&record=${recordId}&before=${cursor}&limit=20`);
   if(!alive.current||generation!==loadGeneration.current)return;
   if(result.recordId!==recordId||!Array.isArray(result.items)||result.items.some((item:{id:string})=>record.history.some(existing=>existing.id===item.id)))throw Error('History changed unexpectedly. Reload the settings workspace.');
   setRecord(current=>current?.id===recordId?{...current,history:[...current.history,...result.items]}:current);
   setHistoryCursor(result.nextCursor);
  }finally{historyRequest.current=false;}
 }
 async function restore(revision:string){
  if(!record||dirty||busy||!record.permissions.edit||!record.history.some(item=>item.id===revision)||revision===record.currentRevision)return;
  const generation=loadGeneration.current;
  await apiRef.current('/api/cms/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'restore',site,record:record.id,revision,expectedRevision:record.currentRevision})});
  if(!alive.current||generation!==loadGeneration.current)return;
  await load();setMessage('Settings restored as a new draft. The published website is unchanged. Review the draft before requesting publication.');
 }
 const editable=record?record.permissions.edit:canCreate;
 const draftHistory=useDraftHistory(draft,value=>{setDraft(value);setDirty(true);setImpact(null);setAck(false);setMessage('');},busy||!editable||!draft,`${site}:${locale}:${record?.id??'new'}:${historyEpoch}`);
 async function openConflict(error:unknown,payload:GlobalSettings,generation:number){
  if(!record||typeof error!=='object'||error===null||!('status' in error)||error.status!==409)return false;
  const result=(await apiRef.current(`/api/cms/settings?site=${site}&locale=${locale}`)).result;
  if(!alive.current||generation!==loadGeneration.current)return true;
  setConflict({...prepareSettingsConflict(record,payload,result.record),latest:result.record,canConfigure:result.canConfigure===true});setChoices({});setImpact(null);setAck(false);setMessage('Another editor saved newer settings. Your unsaved changes are preserved.');return true;
 }
 async function review(){
  if(!draft||busy)return;const payload=globalSettingsSchema.parse(draft),generation=loadGeneration.current;
  setImpact(null);setAck(false);
  try{const result=record?(await apiRef.current('/api/cms/settings/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({site,record:record.id,revision:record.currentRevision,payload})})).result.impact:globalSettingsImpact(null,payload);if(alive.current&&generation===loadGeneration.current)setImpact(result);}
  catch(error){if(!await openConflict(error,payload,generation))throw error;}
 }
 async function save(){
  if(busy||!editable)return;
  if(!draft||!impact||impact.some(i=>i.requiresElevatedApproval)&&!ack)throw Error('Review and acknowledge the current settings impact.');
  const generation=loadGeneration.current;
  try{await apiRef.current('/api/cms/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save',site,record:record?.id??null,expectedRevision:record?.currentRevision??null,type:'settings',path:null,title:'Website settings',locale,payload:draft})});}
  catch(error){if(await openConflict(error,draft,generation))return;throw error;}
  if(!alive.current||generation!==loadGeneration.current)return;await load();setMessage('Settings draft saved. The live website has not changed.');
 }
 async function recoverNewDraft(value:NewDraftCheckpoint){
  if(busy)return;
  const generation=loadGeneration.current,checked=checkNewDraft(value,{actor:actorId,site,kind:'settings'}),recovered=globalSettingsSchema.parse(checked.draft);
  if(checked.locale!==locale)throw Error('Load the copy’s settings locale before restoring it.');
  const result=(await apiRef.current(`/api/cms/settings?site=${site}&locale=${locale}`)).result;
  if(!alive.current||generation!==loadGeneration.current)return;
  if(result?.record)throw Error('Settings now exist for this locale. Reload and edit that record instead.');
  if(result?.record!==null||result.canCreate!==true)throw Error('Creating settings is not available with your current access.');
  setRecord(null);setCanCreate(true);setCanConfigure(result.canConfigure===true);setDraft(recovered);setImpact(null);setAck(false);setConflict(null);setChoices({});setHistoryCursor(null);setRepair('');setDirty(true);setHistoryEpoch(epoch=>epoch+1);setMessage('Initial settings restored locally. Review their impact before saving.');
 }
 async function recoverBrowserCopy(checkpoint:DraftCheckpoint){
  if(!record||busy)return;
  const generation=loadGeneration.current;
  const result=(await apiRef.current(`/api/cms/settings?site=${site}&locale=${locale}`)).result;
  if(!alive.current||generation!==loadGeneration.current)return;
  const latest:Detail=result.record;
  if(!latest||latest.id!==record.id||latest.type!=='settings'||latest.path!==null||latest.locale!==locale||!Array.isArray(latest.history))throw Error('The current settings identity could not be verified.');
  const mode=checkpointRecoveryMode(checkpoint,{scope:{actor:actorId,site,record:latest.id,kind:'settings',locale},revision:latest.currentRevision,canEdit:latest.permissions?.edit===true});
  const recovered=globalSettingsSchema.parse(checkpoint.draft),baseline=globalSettingsSchema.parse(checkpoint.base);
  globalSettingsSchema.parse(latest.payload);
  setImpact(null);setAck(false);setChoices({});setCanConfigure(result.canConfigure===true);
  if(mode==='compare')setConflict({...prepareSettingsConflict({...latest,currentRevision:checkpoint.baseRevision,payload:baseline},recovered,latest),latest,canConfigure:result.canConfigure===true});
  else{setRecord(latest);setHistoryCursor(latest.history.length===20?latest.history.at(-1)!.id:null);setConflict(null);}
  setDraft(recovered);setDirty(true);setHistoryEpoch(epoch=>epoch+1);
  setMessage(mode==='compare'?'Browser copy loaded for comparison with newer settings. Nothing was saved.':'Browser copy restored locally. Review settings impact again before saving.');
 }
 function reconcile(){
  if(!conflict||externalBusy)return;
  try{const merged=globalSettingsSchema.parse(resolveDraftConflict(conflict.base,conflict.mine,conflict.remote,choices));setRecord(conflict.latest);setCanConfigure(conflict.canConfigure);setHistoryCursor(conflict.latest.history.length===20?conflict.latest.history.at(-1)!.id:null);setDraft(merged);setDirty(true);setHistoryEpoch(epoch=>epoch+1);setConflict(null);setChoices({});setImpact(null);setAck(false);setMessage('Review the resolved settings impact before saving. Nothing was published.');}
  catch{setMessage('These choices do not form valid settings. Review the selected groups.');}
 }
 return <section className='cms-settings'><NewDraftRecoveryPanel key={`new-recovery:${actorId}:${site}:${locale}:${record?.id??'new'}:${historyEpoch}`} scope={{actor:actorId,site,kind:'settings'}} draft={record?null:draft} locale={locale} valid={!record&&globalSettingsSchema.safeParse(draft).success} dirty={!record&&dirty} disabled={busy} onRestore={value=>run(()=>recoverNewDraft(value))}/><label>Settings locale<input disabled={busy} value={requestedLocale} onChange={e=>setRequestedLocale(e.target.value)} placeholder='en'/></label><button disabled={busy||requestedLocale===locale||!/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(requestedLocale)} onClick={()=>{if(!dirty||window.confirm('Discard unsaved settings changes?')){void run(()=>load(requestedLocale));}}}>Load locale</button><p>{dirty?'Unsaved changes':'Settings draft'} · Publication requires approval and trusted checks.</p>{repair&&<p role='alert'>{repair}</p>}{message&&<p role='status'>{message}</p>}{conflict&&<DraftConflictPanel subject='settings' {...conflict} choices={choices} onChoice={(key,value)=>setChoices({...choices,[key]:value})} onApply={reconcile} onCancel={()=>{setConflict(null);setChoices({});setImpact(null);setAck(false);setMessage('Your unsaved settings remain open. Review their impact before saving again.');}}/>}{record&&<><TranslationCreatePanel key={`create:${actorId}:${site}:${record.id}:${record.currentRevision}`} actor={actorId} site={site} source={record.id} revision={record.currentRevision} sourceLocale={record.locale} path={null} type='settings' disabled={busy||dirty||Boolean(repair)} api={api} onLoaded={openTranslation} onWorking={setTranslationWorking}/><TranslationFamilyPanel key={`family:${actorId}:${site}:${record.id}:${record.currentRevision}`} site={site} record={record.id} type='settings' disabled={busy||dirty||Boolean(repair)} api={api} onLoaded={openTranslation} onWorking={setTranslationWorking}/><TranslationReviewPanel key={`translation:${site}:${record.id}:${record.currentRevision}`} site={site} record={record.id} revision={record.currentRevision} canApprove={Boolean(record.permissions.approve)} disabled={busy||dirty||Boolean(repair)} api={api}/><PublicationSchedulePanel key={`schedule:${site}:${record.id}:${record.currentRevision}`} site={site} record={record.id} revision={record.currentRevision} publishedRevision={record.publishedRevision} approved={record.reviewStatus==='approved'} canPublish={Boolean(record.permissions.publish)} disabled={busy||dirty} api={api}/><ValidationPanel key={`settings:${site}:${locale}:${record.id}:${record.currentRevision}`} revision={record.currentRevision} dirty={dirty} disabled={busy} canRequest={(record.permissions.edit||record.permissions.submit||record.permissions.approve||record.permissions.publish)} check={action=>apiRef.current('/api/cms/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,site,record:record.id,revision:record.currentRevision})})}/></>}{record&&<SettingsReview record={record} disabled={busy||dirty} onAction={(action,revision)=>run(()=>reviewAction(action,revision))}/>} {record&&<SettingsRelease key={`${site}:${locale}:${record.id}`} record={record} disabled={busy||dirty} onAction={(action,revision)=>run(()=>release(action,revision))}/>} {record&&<SettingsHistory hasMore={historyCursor!==null} onLoadMore={()=>run(loadOlderHistory)} history={record.history} currentRevision={record.currentRevision} publishedRevision={record.publishedRevision} disabled={busy||dirty} canEdit={record.permissions.edit} onRestore={revision=>run(()=>restore(revision))}/>}<p>Saved-content checks show missing fields, unavailable references and release blockers. They do not publish settings.</p>{draft&&<>{record&&<DraftRecoveryPanel key={`recovery:${actorId}:${site}:${record.id}:${record.currentRevision}`} scope={{actor:actorId,site,record:record.id,kind:'settings',locale}} baseRevision={record.currentRevision} base={record.payload} draft={draft} valid={globalSettingsSchema.safeParse(draft).success} dirty={dirty} disabled={busy||!editable} onRestore={value=>run(()=>recoverBrowserCopy(value))}/>}<div className='cms-actions' aria-label='Settings draft history'><button disabled={!draftHistory.canUndo} onClick={draftHistory.undo}>Undo settings change</button><button disabled={!draftHistory.canRedo} onClick={draftHistory.redo}>Redo settings change</button></div><p>History covers unsaved settings. Each undo or redo requires a fresh impact review before saving. Saving or loading clears history.</p><fieldset disabled={busy||!editable}>{fields.map(([path,label])=>{const [group,key]=path.split('.');const value=String((draft as any)[group][key]);return <label key={path}>{label}{['description','disclaimer','emptyMessage'].includes(key)?<textarea value={value} onChange={e=>change(path,e.target.value)}/>:<input value={value} onChange={e=>change(path,e.target.value)}/>}</label>;})}<label>Language selector label<input value={draft.header.languageSelectorLabel??''} maxLength={200} onChange={e=>change('header.languageSelectorLabel',e.target.value)}/></label><p>The language selector appears on custom editorial pages that have another published language version. Use a label in this settings language.</p><label>Header variant<select value={draft.header.variant} onChange={e=>change('header.variant',e.target.value)}>{['standard','transparent','compact'].map(v=><option key={v}>{v}</option>)}</select></label>{[['header.sticky','Sticky header'],['header.languageSelector','Language selector'],['search.enabled','Site search']] .map(([path,label])=>{const [group,key]=path.split('.');return <label key={path}>{label}<select value={(draft as any)[group][key]?'enabled':'disabled'} onChange={e=>change(path,e.target.value==='enabled')}><option value='enabled'>Enabled</option><option value='disabled'>Disabled</option></select></label>;})}<SettingsStructuredEditor value={draft} context={{site,api,loadPreview,disabled:busy||!editable}} onChange={value=>draftHistory.change(value)}/><SettingsMessagesEditor value={draft} disabled={busy||!editable} onChange={value=>draftHistory.change(value)}/><fieldset disabled={!canConfigure}><legend>Sensitive site-wide settings</legend><p>Changing these values requires configuration permission and elevated approval before publication.</p><label>Search engine indexing<select value={draft.seo.indexing} onChange={e=>change('seo.indexing',e.target.value)}><option value='index'>Allow indexing</option><option value='noindex'>Request no indexing</option></select></label><label>Maintenance message<select value={draft.errors.maintenance.enabled?'enabled':'disabled'} onChange={e=>change('errors.maintenance.enabled',e.target.value==='enabled')}><option value='disabled'>Disabled</option><option value='enabled'>Enabled</option></select></label></fieldset></fieldset><button disabled={busy||!editable||Boolean(record&&!dirty)} onClick={()=>run(review)}>Review settings impact</button>{impact&&<section className='cms-settings-impact'><h3>Potential impact</h3><p>This is shared-setting impact, not a complete list of affected pages. Existing page overrides may differ.</p>{!impact.length?<p>No settings changes.</p>:<ul>{impact.map((item,i)=><li key={i}><strong>{item.field} · {item.scope}</strong><p>{item.message}{item.requiresElevatedApproval?' Elevated approval required.':''}</p></li>)}</ul>}{impact.some(i=>i.requiresElevatedApproval)&&<label>I have reviewed the site-wide impact<select disabled={busy} value={ack?'yes':'no'} onChange={e=>setAck(e.target.value==='yes')}><option value='no'>Not yet</option><option value='yes'>Reviewed</option></select></label>}<button disabled={busy||!editable||impact.some(i=>i.requiresElevatedApproval)&&!ack} onClick={()=>run(save)}>Save settings draft</button></section>}<p>Settings changes remain drafts until approved, validated and explicitly published.</p></>}</section>;
}
