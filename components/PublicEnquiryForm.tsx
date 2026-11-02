'use client';
import {useEffect,useRef,useState} from 'react';
import {z} from 'zod';
import {careerFormUrl,parseCareerFormResponse,careerSubmissionSelection,type CareerFormOptions} from '../lib/cms/career-form-client';
import type {CareerEnquirySelection} from '../lib/cms/career-enquiry-context';
import {parseExpectedPublicForm} from '../lib/cms/public-form';
import type {PublicForm,ExpectedPublicForm} from '../lib/cms/public-form';
import {validateFormSubmission} from '../lib/cms/forms';
import type {FormDefinition,FormIssue} from '../lib/cms/forms';
import {visibleFormState,initialFormAnswers,changeFormAnswer} from '../lib/cms/form-visibility';
import {FormFields} from '../app/cms/form-fields';
import type {ExpeditionEnquirySelection} from '../lib/cms/expedition-enquiry-context';
import type {PublishedExpedition} from '../lib/cms/published-expedition';
import {EnquiryUploadPanel} from './EnquiryUploadPanel';
import {selectEnquiryAttachments,enquiryAttachmentHeaders} from '../lib/cms/enquiry-file-selection';
import {loadEnquirySubmissionDraft,saveEnquirySubmissionDraft,clearEnquirySubmissionDraft,type EnquiryDraftScope} from '../lib/cms/enquiry-submission-draft';
import {enquiryUploadStorageKey,parseEnquiryUploadTracker,type EnquiryUploadTracker,type EnquiryUploadScope} from '../lib/cms/enquiry-file-client';
import {EnquiryChallenge} from './EnquiryChallenge';
const receipt=z.object({ok:z.literal(true),reference:z.string().uuid(),receivedAt:z.string().datetime({offset:true}),message:z.string().max(2000),heading:z.string().min(1).max(200).optional(),redirectPath:z.string().regex(/^\/[a-z0-9/-]*$/).refine(v=>!v.includes('//')).nullable()}).strict();
export type ExpeditionEnquiryOptions={recordId:string;revisionId:string;slug:string;formRevisionId:string;departures:PublishedExpedition['upcoming']};
export function PublicEnquiryForm({formId,expedition,expected,career,canStart=true}:{formId:string;expedition?:ExpeditionEnquiryOptions;expected?:ExpectedPublicForm;career?:CareerFormOptions;canStart?:boolean}){
 const [form,setForm]=useState<PublicForm|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{const controller=new AbortController();let active=true;setForm(null);setError('');fetch(career?careerFormUrl(formId,career):`/api/cms/forms/${encodeURIComponent(formId)}`,{cache:'no-store',signal:controller.signal}).then(async response=>{if(!response.ok)throw Error('This enquiry form is currently unavailable.');const body=await response.json(),parsed=career?parseCareerFormResponse(body,formId,career):parseExpectedPublicForm(body.form,formId,expected);if(parsed.formId!==formId||expedition&&(parsed.revisionId!==expedition.formRevisionId||parsed.locale!=='en'))throw Error();if(active)setForm(parsed);}).catch(()=>{if(active)setError('This enquiry form is currently unavailable.');});return()=>{active=false;controller.abort();};},[formId,retry,expedition?.formRevisionId,expected?.revisionId,expected?.locale,career?.recordId,career?.revisionId,career?.slug,career?.formRevisionId]);
 return <section className='public-enquiry-form'>{form?<EnquiryFormBody key={`${form.revisionId}:${career?.recordId??''}:${career?.revisionId??expedition?.revisionId??'generic'}`} form={form} expedition={expedition} career={career} canStart={canStart}/>:error?<><p role='alert'>{error}</p><button onClick={()=>setRetry(v=>v+1)}>Reload form</button></>:<p role='status'>Loading enquiry form…</p>}</section>;
}
export function EnquiryFormBody({form,expedition,career,canStart=true,send=fetch,renderChallenge,renderUploadChallenge}:{form:PublicForm;expedition?:ExpeditionEnquiryOptions;career?:CareerFormOptions;canStart?:boolean;send?:typeof fetch;renderUploadChallenge?:(props:{onToken:(token:string)=>void;attempt:number})=>React.ReactNode;renderChallenge?:(props:{siteKey:string;attempt:number;onToken:(token:string)=>void;onError:(message:string)=>void})=>React.ReactNode}){
 const definition:FormDefinition={schemaVersion:1,title:form.title,fields:form.fields,submitLabel:form.submitLabel,successMessage:'Received',notificationRouteIds:[]};
 const [answers,setAnswers]=useState<Record<string,unknown>>(()=>initialFormAnswers(definition)),[issues,setIssues]=useState<FormIssue[]>([]),[token,setToken]=useState(''),[attempt,setAttempt]=useState(0),[busy,setBusy]=useState(false),[locked,setLocked]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState<z.infer<typeof receipt>|null>(null);
 const [departureId,setDepartureId]=useState('');
 const [uploadScope,setUploadScope]=useState<EnquiryUploadScope|null>(null),[upload,setUpload]=useState<{tracker:EnquiryUploadTracker|null;status:unknown}>({tracker:null,status:null});
 const draftScope=useRef<EnquiryDraftScope|null>(null);
 useEffect(()=>{
  if(!form.uploads)return;
  try{const scope={site:form.uploads.site,form:form.formId,revision:form.revisionId,path:window.location.pathname};draftScope.current=scope;const draft=loadEnquirySubmissionDraft(sessionStorage,scope);setUploadScope({site:scope.site,form:scope.form,revision:scope.revision,request:draft.requestKey});if(draft.pending){pending.current=draft.pending;setAnswers(draft.pending.answers);setDepartureId(draft.pending.expedition?.departureId??'');setLocked(true);}}
  catch{setError('Submission recovery could not be read. Restore browser storage before continuing.');}
 },[form.formId,form.revisionId,form.uploads?.site]);
 const pending=useRef<{requestKey:string;answers:Record<string,unknown>;sourcePath?:string;expedition?:ExpeditionEnquirySelection;career?:CareerEnquirySelection}|null>(null),sending=useRef(false),alive=useRef(true);
 useEffect(()=>{alive.current=true;const guard=(event:BeforeUnloadEvent)=>{if(pending.current){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',guard);return()=>{alive.current=false;window.removeEventListener('beforeunload',guard);};},[]);
 const visible=visibleFormState(definition,answers),selectedDeparture=expedition?.departures.find(item=>item.id===departureId);
 function uploadChanged(status:unknown,tracker:EnquiryUploadTracker|null){
  // Confirmed cancellation frees the old upload session, but its request key
  // remains terminal on the server. Start a fresh request before another upload.
  if(!tracker&&upload.tracker&&!pending.current&&draftScope.current&&uploadScope){
   try{clearEnquirySubmissionDraft(sessionStorage,draftScope.current,uploadScope.request);const draft=loadEnquirySubmissionDraft(sessionStorage,draftScope.current);setUploadScope({...uploadScope,request:draft.requestKey});}
   catch{setUploadScope(null);setError('Upload cancellation completed, but a new submission could not be prepared. Restore browser storage and reload.');}
  }
  setUpload({status,tracker});
 }
 function change(id:string,value:unknown){setAnswers(changeFormAnswer(definition,answers,id,value));setIssues([]);setError('');}
 async function submit(){
  if(sending.current||success)return;if(career&&expedition){setError('This form has conflicting context. Reload the page.');return;}if(!pending.current&&!canStart){setError('Applications are no longer open.');return;}if(career&&(career.formRevisionId!==form.revisionId||form.locale!=='en')){setError('This job form has changed. Reload the page before applying.');return;}if(expedition&&(expedition.formRevisionId!==form.revisionId||form.locale!=='en')){setError('This expedition form has changed. Reload the page before submitting.');return;}if(!pending.current&&departureId&& !expedition?.departures.some(item=>item.id===departureId)){setError('Choose an available departure or a general enquiry.');return;}let selected:{answers:Record<string,string>;files:import('../lib/cms/forms').VerifiedFormFile[];headers:Record<string,string>}={answers:{},files:[],headers:{}};
  if(definition.fields.some(field=>field.type==='file')){
   if(!form.uploads||!uploadScope){setError('Attachments are currently unavailable.');return;}
   if(pending.current&&definition.fields.some(field=>field.type==='file'&&pending.current?.answers[field.id])){if(!upload.tracker){setError('Upload recovery is unavailable. Keep this page open and retry.');return;}try{selected.headers=enquiryAttachmentHeaders(uploadScope,upload.tracker);}catch{setError('Upload recovery does not match this submission.');return;}}
   else if(upload.tracker){try{selected=selectEnquiryAttachments(uploadScope,upload.tracker,upload.status,visible.fields);}catch(e){setError(e instanceof Error?e.message:'Check upload status before submitting.');return;}}
  }
  const submittedAnswers=pending.current?.answers??{...visible.answers,...selected.answers};
  const checked=pending.current?{valid:true,issues:[]}:validateFormSubmission(definition,submittedAnswers,selected.files);if(!checked.valid){setIssues(checked.issues);return;}if(!token){setError('Complete the verification check before submitting.');return;}
  const retrying=Boolean(pending.current);
  if(!pending.current){const path=window.location.pathname;let careerSelection:CareerEnquirySelection|undefined;try{if(career)careerSelection=careerSubmissionSelection(career,path);}catch{setError('This application does not match the current job page.');return;}pending.current={requestKey:uploadScope?.request??crypto.randomUUID(),answers:submittedAnswers,...(careerSelection?{career:careerSelection}:{}),...(expedition?{expedition:{recordId:expedition.recordId,revisionId:expedition.revisionId,slug:expedition.slug,departureId:departureId||null}}:{}),...(/^\/[a-z0-9/-]*$/.test(path)&&!path.includes('//')?{sourcePath:path}:{})};}
  if(draftScope.current&&pending.current){try{saveEnquirySubmissionDraft(sessionStorage,draftScope.current,{requestKey:pending.current.requestKey,pending:pending.current});}catch{if(!retrying)pending.current=null;setError('Submission recovery could not be saved. Restore browser storage before submitting.');return;}}
  sending.current=true;setBusy(true);setLocked(true);setError('');
  try{const response=await send('/api/cms/enquiry',{method:'POST',headers:{'Content-Type':'application/json',...selected.headers},body:JSON.stringify({formId:form.formId,revisionId:form.revisionId,...pending.current,challengeToken:token}),cache:'no-store',signal:AbortSignal.timeout(45000)});const body=await response.json();if(!alive.current)return;
   if(response.ok){const value=receipt.parse(body);setSuccess(value);if(draftScope.current&&pending.current){try{clearEnquirySubmissionDraft(sessionStorage,draftScope.current,pending.current.requestKey);if(uploadScope&&upload.tracker){const key=enquiryUploadStorageKey(uploadScope),raw=sessionStorage.getItem(key);if(raw&&parseEnquiryUploadTracker(raw,uploadScope).session===upload.tracker.session)sessionStorage.removeItem(key);}}catch{/* A confirmed receipt remains successful even if local cleanup fails. */}}pending.current=null;}
   else if(response.status===422){const fields=z.array(z.object({field:z.string(),message:z.string()}).strict()).safeParse(body.fields);setIssues(fields.success?fields.data:[]);setError(typeof body.error==='string'?body.error:'Please check your answers.');if(!retrying){if(draftScope.current&&pending.current){clearEnquirySubmissionDraft(sessionStorage,draftScope.current,pending.current.requestKey);saveEnquirySubmissionDraft(sessionStorage,draftScope.current,{requestKey:pending.current.requestKey,pending:null});}pending.current=null;setLocked(false);}else setError('This retry could not be verified. Complete a fresh verification check and retry with the retained answers.');}
   else if(response.status===429)setError('Please wait a few minutes, complete a fresh verification check, then retry. Your answers are retained.');
   else if(response.status===409)setError('This form has changed or the request conflicts with an earlier submission. Please contact the team before starting another enquiry.');
   else setError('We could not confirm your enquiry was saved. Retry here with the same answers to avoid duplicates.');
  }catch{if(alive.current)setError('We could not confirm your enquiry was saved. Retry here with the same answers to avoid duplicates.');}
  finally{sending.current=false;if(alive.current){setBusy(false);setToken('');setAttempt(v=>v+1);}}
 }
 if(success)return <div role='status'>{success.heading?<><h3>{success.heading}</h3><p>{success.message}</p></>:<h3>{success.message}</h3>}<p>Enquiry reference: {success.reference}</p>{success.redirectPath&&<a href={success.redirectPath}>Continue</a>}</div>;
 const challengeProps={siteKey:form.challenge.siteKey,attempt,onToken:setToken,onError:setError};
 return <form noValidate onSubmit={e=>{e.preventDefault();void submit();}}><h3>{form.title}</h3><fieldset disabled={busy||locked}>{expedition&&<label style={{display:'grid',gap:8,minWidth:0}}>Preferred departure<select aria-label='Preferred departure' style={{width:'100%',minWidth:0,maxWidth:'100%'}} value={departureId} onChange={event=>setDepartureId(event.target.value)}><option value=''>General enquiry / dates to be discussed</option>{expedition.departures.map(item=><option key={item.id} value={item.id}>{item.date}{item.endDate?` — ${item.endDate}`:''} · {item.status}{item.availability?` · ${item.availability}`:''}</option>)}</select>{selectedDeparture&&<span aria-live='polite'>{selectedDeparture.date}{selectedDeparture.endDate?` — ${selectedDeparture.endDate}`:''} · {selectedDeparture.status}{selectedDeparture.availability?` · ${selectedDeparture.availability}`:''}</span>}<small>Submitting an enquiry does not reserve a place or confirm availability.</small></label>}<FormFields fields={visible.fields.filter(field=>field.type!=='file')} answers={answers} issues={issues} change={change}/>{uploadScope&&visible.fields.some(field=>field.type==='file')&&<EnquiryUploadPanel scope={uploadScope} fields={visible.fields.filter(field=>field.type==='file')} siteKey={form.challenge.siteKey} send={send} renderChallenge={renderUploadChallenge} onStatus={uploadChanged}/>}{issues.filter(issue=>visible.fields.some(field=>field.type==='file'&&field.id===issue.field)).map(issue=><p role='alert' key={issue.field}>{issue.message}</p>)}</fieldset>{renderChallenge?renderChallenge(challengeProps):<EnquiryChallenge {...challengeProps}/>}<button type='button' disabled={busy} onClick={()=>{setToken('');setAttempt(v=>v+1);setError('');}}>Refresh verification</button>{error&&<p role='alert'>{error}</p>}<button type='submit' disabled={busy||!token||(!canStart&&!locked)}>{busy?'Sending…':locked?'Retry enquiry':form.submitLabel}</button>{locked&&<p>Your answers are retained for this submission. Retry here if confirmation is unavailable.</p>}</form>;
}
