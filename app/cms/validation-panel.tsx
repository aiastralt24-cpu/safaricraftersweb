'use client';
import {useEffect,useRef,useState} from 'react';
import type {ContentFinding} from '../../lib/cms/content-validation';

type Advisory={revision:string;contentChecksPass:boolean;findings:ContentFinding[]};
type Trusted={revision:string;valid:boolean;expiresAt:string|null;checkedAt:string|null;findings:ContentFinding[]|null};
type Props={revision:string;dirty:boolean;disabled:boolean;canRequest?:boolean;check:(action:'validate'|'validation_status'|'request_validation')=>Promise<{result:unknown}>};

/** Parent keys this panel by user/site/record/revision so results never cross drafts. */
export function ValidationPanel({revision,dirty,disabled,canRequest=false,check}:Props){
  const [requested,setRequested]=useState(false);
  const [advisory,setAdvisory]=useState<Advisory|null>(null);
  const [trusted,setTrusted]=useState<Trusted|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[now,setNow]=useState(Date.now());
  const alive=useRef(true);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  useEffect(()=>{if(!trusted?.expiresAt)return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[trusted?.expiresAt]);
  async function refresh(){
    setBusy(true);setError('');setAdvisory(null);setTrusted(null);
    try{
      const [local,receipt]=await Promise.all([check('validate'),check('validation_status')]);
      if(!alive.current)return;
      const a=local.result as Advisory,t=receipt.result as Trusted;
      if(a.revision!==revision||t.revision!==revision)throw new Error('The draft changed. Reload it before checking again.');
      setAdvisory(a);setTrusted(t);setNow(Date.now());
    }catch(reason){if(alive.current)setError(reason instanceof Error?reason.message:'Content checks are unavailable. Try again.');}
    finally{if(alive.current)setBusy(false);}
  }
  async function requestTrusted(){
    setBusy(true);setError('');setRequested(false);
    try{await check('request_validation');if(alive.current)setRequested(true);}
    catch(reason){if(alive.current)setError(reason instanceof Error?reason.message:'Unable to request validation.');}
    finally{if(alive.current)setBusy(false);}
  }
  const current=trusted?.valid&&Boolean(trusted.expiresAt)&&Date.parse(trusted.expiresAt!)>now;
  const findings=advisory?.findings??[];
  const errors=findings.filter(f=>f.severity==='error').length;
  return <section className="cms-validation" aria-label="Content checks">
    <div className="cms-actions"><h3>Content checks</h3><button type="button" disabled={disabled||dirty||busy} onClick={refresh}>{busy?'Working…':'Check saved content'}</button>{canRequest&&<button type='button' disabled={disabled||dirty||busy} onClick={requestTrusted}>Request trusted check</button>}</div>
    {dirty?<p role="status">Save your changes before checking. Earlier results do not cover your unsaved edits.</p>:<>
      <p>Check the saved draft for missing content and formatting issues. Publication also requires approval and a current trusted check.</p>
      {error&&<p role="alert">{error}</p>}{requested&&<p role='status'>Trusted check requested. A server worker must process it. Use Check saved content to refresh the result; this request does not publish anything.</p>}
      {advisory&&<div role="status"><p><strong>{errors?`${errors} content ${errors===1?'issue':'issues'} to resolve`:advisory.contentChecksPass?'Content checks passed':'Content needs attention'}</strong></p><p>{current?'Trusted publication check is current.':trusted?.checkedAt?'Trusted publication check needs renewal or corrections.':'Trusted publication check has not run for this revision.'}</p>{trusted?.expiresAt&&<small>Trusted check expires: {new Date(trusted.expiresAt).toLocaleString()}</small>}</div>}
      {findings.length>0&&<ul>{findings.map((finding,index)=><li key={index}><strong>{finding.severity==='error'?'Fix':'Guidance'} · {finding.field||'Page'}</strong><p>{finding.message}</p></li>)}</ul>}
      {Boolean(trusted?.findings?.length)&&<details><summary>Trusted check findings</summary><ul>{trusted!.findings!.map((f,i)=><li key={i}><strong>{f.severity==='error'?'Fix':'Guidance'} · {f.field||'Page'}</strong><p>{f.message}</p></li>)}</ul></details>}
    </>}
  </section>;
}
