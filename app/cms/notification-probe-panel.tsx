'use client';
import {useEffect,useRef,useState} from 'react';
import {notificationProbeCommand,verifyProbeContext,verifyProbeReceipt,verifyProbeStatus,type NotificationProbeCommand} from '../../lib/cms/notification-probe-admin';
import {probeReconciliationCommand,verifyProbeReconciliationReceipt} from '../../lib/cms/notification-probe-reconciliation';
type Reconciliation=ReturnType<typeof probeReconciliationCommand.parse>;
type Route={routeId:string;revisionId:string;label:string;from:string;to:string[];enabled:boolean};
type Pending={actor:string;intent:'send'|'cancel';command:NotificationProbeCommand;reconciliation?:Reconciliation};
export function NotificationProbePanel({actor,site,routes,api,disabled,onDirty}:{actor:string;site:string;routes:Route[];api:(path:string,options?:RequestInit)=>Promise<any>;disabled:boolean;onDirty:(dirty:boolean)=>void}){
 const key=`cms-notification-probe:${actor}:${site}`,alive=useRef(true);
 const [pending,setPending]=useState<Pending|null>(null),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[selected,setSelected]=useState('');
 const [provider,setProvider]=useState(''),[reconcileConfirm,setReconcileConfirm]=useState<Reconciliation|null>(null);
 const [confirm,setConfirm]=useState<{command:NotificationProbeCommand;route:Route}|null>(null);
 function stored():Pending|null{const raw=localStorage.getItem(key);if(!raw)return null;const value=JSON.parse(raw);if(value.actor!==actor||!['send','cancel'].includes(value.intent))throw Error('Verification recovery account mismatch.');const command=notificationProbeCommand.parse(value.command);if(command.site!==site||command.action!=='request')throw Error('Verification recovery scope mismatch.');const reconciliation=value.reconciliation?probeReconciliationCommand.parse(value.reconciliation):undefined;if(reconciliation&&(reconciliation.site!==site||value.intent!=='send'))throw Error('Saved acceptance verification scope mismatch.');return {actor,intent:value.intent,command,...(reconciliation?{reconciliation}:{})};}
 function persist(value:Pending){localStorage.setItem(key,JSON.stringify(value));if(JSON.stringify(stored())!==JSON.stringify(value))throw Error('Verification recovery could not be saved.');}
 useEffect(()=>{alive.current=true;const sync=()=>{try{setPending(stored());setReady(true);setConfirm(null);setReconcileConfirm(null);}catch{setReady(false);setError('Saved verification cannot be read. Resolve browser storage before continuing.');}};sync();const change=(event:StorageEvent)=>{if(event.key===key)sync();};window.addEventListener('storage',change);return()=>{alive.current=false;window.removeEventListener('storage',change);};},[key]); // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{onDirty(Boolean(pending)||Boolean(confirm)||Boolean(reconcileConfirm)||busy);},[pending,confirm,reconcileConfirm,busy,onDirty]);
 async function call(body:unknown){return (await api('/api/cms/notification-probes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})).result;}
 function checkActor(value:{actorId:string}){if(value.actorId!==actor)throw Error('Verification belongs to another administrator.');}
 async function review(){setBusy(true);setError('');setMessage('');try{
  const route=routes.find(v=>v.routeId===selected);if(!route)throw Error('Select a recipient route.');
  const context=verifyProbeContext(await call({action:'context',site,routeId:route.routeId}),site,route.routeId);
  if(context.routeRevision!==route.revisionId)throw Error('Recipients changed. Reload the recipient list before verifying.');
  if(!context.routeApproved||!context.bindingRevision||!context.deploymentId||!context.workerHealthy)throw Error('Verification needs approved recipients, a configured deployment and a healthy notification worker. Ask the deployment administrator to complete setup.');
  if(alive.current)setConfirm({route,command:{action:'request',site,routeId:route.routeId,routeRevision:route.revisionId,bindingRevision:context.bindingRevision,requestId:crypto.randomUUID()}});
 }catch(reason){if(alive.current)setError(reason instanceof Error?reason.message:'Verification is unavailable.');}finally{if(alive.current)setBusy(false);}}
 async function recover(next?:NotificationProbeCommand,cancel=false,statusOnly=false,reconciliation?:Reconciliation){setBusy(true);setError('');setMessage('');try{
  if(!navigator.locks)throw Error('Web Locks support is required for safe verification recovery.');
  await navigator.locks.request(key,async()=>{
   let saved=stored();if(next){if(saved){setPending(saved);throw Error('Recover the existing verification first.');}saved={actor,intent:'send',command:notificationProbeCommand.parse(next)};persist(saved);}
   if(!saved)throw Error('No saved verification remains. Reload recipients.');
   if(reconciliation){if(saved.reconciliation)throw Error('Recover the existing acceptance check first.');saved={...saved,intent:'send',reconciliation:probeReconciliationCommand.parse(reconciliation)};persist(saved);}
   if(cancel){if(saved.reconciliation)throw Error('Recover the saved acceptance check first.');saved={...saved,intent:'cancel'};persist(saved);}setPending(saved);setConfirm(null);setReconcileConfirm(null);
   const c=saved.command;
   const finish=(text:string)=>{if(!alive.current)return;if(stored()?.command.requestId!==c.requestId)throw Error('Verification recovery changed in another tab.');localStorage.removeItem(key);setPending(null);setProvider('');setReconcileConfirm(null);setMessage(text);};
   if(saved.intent==='cancel'&&!statusOnly){
    const receipt=verifyProbeReceipt(await call({...c,action:'cancel'}),{...c,action:'cancel'});checkActor(receipt);finish('Verification cancelled before delivery started. Delayed retries of this request cannot send.');return;
   }
   if(!statusOnly&&!saved.reconciliation){const receipt=verifyProbeReceipt(await call(c),c);checkActor(receipt);if(receipt.state==='cancelled'){finish('This verification was cancelled. No retry was sent.');return;}}
   const validate=(raw:unknown)=>{const value=verifyProbeStatus(raw,site,c.requestId);verifyProbeReceipt(value.receipt,c);checkActor(value.receipt);return value;};
   let status=validate(await call({action:'status',site,requestId:c.requestId}));
   if(saved.reconciliation&&!statusOnly){
    if(status.receipt.probeId!==saved.reconciliation.probeId)throw Error('Saved acceptance check belongs to another verification.');
    const result=(await api('/api/cms/notification-probe-reconciliation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(saved.reconciliation)})).result;
    verifyProbeReconciliationReceipt(result,saved.reconciliation,actor);
    status=validate(await call({action:'status',site,requestId:c.requestId}));
    if(status.state!=='accepted'||status.providerMessageId!==saved.reconciliation.providerMessageId)throw Error('Acceptance was recorded but final status could not be confirmed. Refresh this request.');
   }
   if(status.state==='ready'&&!statusOnly&&!saved.reconciliation)status=validate(await call({...c,action:'execute',confirmed:true}));
   if(status.state==='accepted'){finish('Verification accepted by the email provider. Ask the recipients to confirm inbox receipt; acceptance alone does not prove delivery.');return;}
   if(status.state==='cancelled'){finish('This verification was cancelled.');return;}
   const labels={ready:saved.intent==='cancel'?'Cancellation is not yet confirmed. Use Recover verification cancellation to continue.':'Verification is ready. Use Recover and send verification to continue.',in_progress:'Verification is in progress. Refresh its status after the current attempt finishes.',unavailable:'Verification is unavailable. Check recipient approval, deployment and worker health before retrying.',reconciliation_required:'Delivery is uncertain and the retry window has expired. Ask an administrator to reconcile the provider reference before starting another verification.'};
   if(alive.current)setMessage(labels[status.state]);
  });
 }catch(reason){if(alive.current)setError(reason instanceof Error?reason.message:'Verification could not be confirmed. Recover the saved request.');}finally{if(alive.current)setBusy(false);}}
 async function reviewReconciliation(){setBusy(true);setError('');try{
  const saved=stored();if(!saved||saved.reconciliation)throw Error('Recover the saved verification first.');
  const status=verifyProbeStatus(await call({action:'status',site,requestId:saved.command.requestId}),site,saved.command.requestId);verifyProbeReceipt(status.receipt,saved.command);checkActor(status.receipt);
  if(!status.firstAttemptAt||['cancelled','accepted','in_progress'].includes(status.state))throw Error('Only an unresolved completed attempt can be checked. Refresh verification status.');
  const command=probeReconciliationCommand.parse({site,probeId:status.receipt.probeId,providerMessageId:provider.trim(),requestId:crypto.randomUUID()});if(alive.current)setReconcileConfirm(command);
 }catch(reason){if(alive.current)setError(reason instanceof Error?reason.message:'Check the provider message UUID.');}finally{if(alive.current)setBusy(false);}}
 const locked=disabled||busy||!ready||Boolean(pending);
 return <section aria-label='Notification delivery verification'><h3>Verify notification delivery</h3><p>Send a clearly labelled setup email to an approved recipient route. Provider acceptance and recipient inbox confirmation are separate checks.</p><p>Unconfirmed request identifiers are stored in this browser for recovery, scoped to your account and website. Email content and addresses are not stored here.</p>
 {error&&<p role='alert'>{error}</p>}{message&&<p role='status'>{message}</p>}
 {pending&&<section aria-label='Recover notification verification'><p>Saved verification request: <span style={{overflowWrap:'anywhere'}}>{pending.command.requestId}</span></p><button disabled={disabled||busy} onClick={()=>void recover(undefined,false,true)}>Refresh verification status</button><button disabled={disabled||busy||Boolean(reconcileConfirm)} onClick={()=>void recover()}>{pending.reconciliation?'Recover acceptance verification':pending.intent==='cancel'?'Recover verification cancellation':'Recover and send verification'}</button><button disabled={disabled||busy||Boolean(pending.reconciliation)||Boolean(reconcileConfirm)} onClick={()=>{if(window.confirm('Cancel this verification without sending? Cancellation is possible only before delivery preparation starts. An in-flight or already accepted email cannot be recalled.'))void recover(undefined,true);}}>Cancel unsent verification</button></section>}
 {pending&&<section aria-label='Resolve uncertain verification'><h4>Check an existing provider message</h4><p>This checks the provider's saved message and records matching acceptance. It never sends another email. Use the message UUID from your email provider's dashboard.</p>
 {pending.reconciliation?<p style={{overflowWrap:'anywhere'}}>Saved provider reference: {pending.reconciliation.providerMessageId}</p>:<fieldset disabled={disabled||busy||Boolean(reconcileConfirm)}><legend>Provider reference</legend><label>Verification provider message UUID<input maxLength={36} value={provider} onChange={event=>setProvider(event.target.value)}/></label><button onClick={()=>void reviewReconciliation()}>Review acceptance check</button></fieldset>}
 {reconcileConfirm&&<section aria-label='Confirm verification acceptance check'><p style={{overflowWrap:'anywhere'}}>Check provider message {reconcileConfirm.providerMessageId} for verification {reconcileConfirm.probeId}? Matching acceptance will be recorded without sending email.</p><button disabled={disabled||busy} onClick={()=>void recover(undefined,false,false,reconcileConfirm)}>Confirm acceptance check</button><button disabled={busy} onClick={()=>setReconcileConfirm(null)}>Cancel acceptance review</button></section>}
 </section>}
 <fieldset disabled={locked||Boolean(confirm)}><legend>Recipient route</legend><label>Verification recipients<select value={selected} onChange={event=>setSelected(event.target.value)}><option value=''>Select approved recipients</option>{routes.filter(v=>v.enabled).map(route=><option key={route.routeId} value={route.routeId}>{route.label}</option>)}</select></label><button onClick={()=>void review()}>Review verification email</button></fieldset>
 {confirm&&<section aria-label='Confirm notification verification'><h4>Send this setup email?</h4><p>{confirm.route.label} · From: {confirm.route.from}</p><ul>{confirm.route.to.map(email=><li key={email}>{email}</li>)}</ul><p>This sends one verification message to these recipients. It does not create a customer enquiry.</p><button disabled={locked} onClick={()=>void recover(confirm.command)}>Confirm and send verification</button><button disabled={busy} onClick={()=>setConfirm(null)}>Cancel verification review</button></section>}
 </section>;
}
