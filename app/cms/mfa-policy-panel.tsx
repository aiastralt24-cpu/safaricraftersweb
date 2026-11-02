'use client';
import {useEffect,useRef,useState} from 'react';
import {parseMfaPolicy,type MfaPolicy} from '../../lib/cms/mfa-policy';
type Props={site:string;sessionVersion:string;disabled:boolean;api:(path:string,options?:RequestInit)=>Promise<any>;onVerify:()=>void};
export function MfaPolicyPanel({site,sessionVersion,disabled,api,onVerify}:Props){
 const apiRef=useRef(api);apiRef.current=api;const alive=useRef(true),lock=useRef(false),epoch=useRef(0);
 const [policy,setPolicy]=useState<MfaPolicy|null>(null),[busy,setBusy]=useState(false),[review,setReview]=useState<boolean|null>(null),[uncertain,setUncertain]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 async function send(body:unknown){return apiRef.current('/api/cms/mfa-policy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});}
 async function load(){if(lock.current)return;lock.current=true;setBusy(true);setReview(null);setError('');const current=++epoch.current;
  try{const result=await send({action:'read',site});const next=parseMfaPolicy(result.policy,site);if(alive.current&&epoch.current===current){setPolicy(next);setUncertain(false);}}
  catch{if(alive.current&&epoch.current===current){setPolicy(null);setError('MFA policy status is unavailable. Reload it before changing security settings.');}}
  finally{lock.current=false;if(alive.current)setBusy(false);}
 }
 useEffect(()=>{alive.current=true;void load();return()=>{alive.current=false;epoch.current++;};},[site,sessionVersion]); // eslint-disable-line react-hooks/exhaustive-deps
 async function save(){if(lock.current||!policy||review===null||disabled||uncertain)return;const previous=policy,required=review;lock.current=true;setBusy(true);setError('');setMessage('');setReview(null);const current=++epoch.current;
  try{const result=await send({action:'set',site,version:previous.version,required});const next=parseMfaPolicy(result.policy,site);if(next.version!==previous.version+1||next.required!==required||!next.verified||!next.canManage)throw Error();if(alive.current&&current===epoch.current){setPolicy(next);setMessage('Website MFA policy updated.');}}
  catch{if(alive.current&&current===epoch.current){setUncertain(true);setError('The policy change could not be confirmed. Reload security status to see the current policy before reviewing another change.');}}
  finally{lock.current=false;if(alive.current)setBusy(false);}
 }
 return <section className='cms-validation' aria-label='Website MFA policy'><h2>Website MFA policy</h2>{error&&<p role='alert'>{error}</p>}{message&&<p role='status'>{message}</p>}{policy&&<>
 <p>{policy.required?'MFA is required for privileged actions.':'MFA is not required by this website policy.'}</p>
 {policy.required&&!policy.verified&&<p role='status'>Verify your authenticator in Account security before approving, publishing, configuring access, exporting, deleting or changing enquiries.</p>}
 {!policy.verified&&<button disabled={disabled||busy} onClick={onVerify}>Set up or verify authenticator</button>}
 {policy.canManage&&policy.verified&&<details><summary>Manage website MFA requirement</summary>{review===null?<button disabled={disabled||busy||uncertain} onClick={()=>{setReview(!policy.required);setMessage('');}}>Review {policy.required?'disabling':'enabling'} MFA requirement</button>:<div aria-label='Review MFA policy change'><p>{review?'Require MFA for approval, publishing, configuration, exports, deletion and enquiry changes. Pending and running publication schedules will be blocked and must be reviewed and scheduled again. Ensure administrators have working authenticators and a recovery process before continuing.':'Remove the website MFA requirement for privileged actions. Existing role permissions remain, but second-factor verification will no longer be required by this policy.'}</p><button disabled={busy} onClick={()=>setReview(null)}>Cancel policy change</button><button disabled={disabled||busy||uncertain} onClick={()=>void save()}>Confirm {review?'enabling':'disabling'} MFA requirement</button></div>}</details>}
 </>}<button disabled={disabled||busy} onClick={()=>{setMessage('');void load();}}>{busy?'Checking security…':'Reload MFA policy'}</button></section>;
}
