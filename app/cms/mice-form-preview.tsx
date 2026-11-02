'use client';
import {useEffect,useRef,useState} from 'react';
import {parseFormPreviewReference,type FormPreviewReference,type LoadFormPreview} from '../../lib/cms/form-preview-reference';
import {validateMiceFormCompatibility} from '../../lib/cms/mice-form-resolution';
import {FormPreview} from './form-preview';
export function MiceFormPreview({id,load}:{id:string;load?:LoadFormPreview}){
 const loader=useRef(load);loader.current=load;const available=Boolean(load);
 const [value,setValue]=useState<FormPreviewReference|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{setValue(null);setError('');if(!available)return;const controller=new AbortController();let active=true;
  loader.current!(id,controller.signal).then(raw=>{const parsed=parseFormPreviewReference(raw,id);if(active)setValue(parsed);}).catch(()=>{if(active)setError('This corporate form is unavailable or you do not have permission to preview it.');});
  return()=>{active=false;controller.abort();};
 },[id,available,attempt]);
 if(!available)return <p role='status'>Corporate form preview requires authenticated access to its saved draft.</p>;
 const checked=value?validateMiceFormCompatibility(value.definition):null;
 return <div>{error?<p role='alert'>{error}</p>:value&&checked?<><p>Corporate form draft · revision {value.revision}. Publication must verify the published revision separately.</p>{checked.findings.length>0&&<ul aria-label='Corporate form compatibility'>{checked.findings.map((finding,index)=><li key={index}>{finding.severity==='error'?'Required change':'Notice'}: {finding.message}</li>)}</ul>}{checked.contentChecksPass?<FormPreview key={value.revision} value={value.definition}/>:<p role='alert'>Correct the corporate form mapping before testing this enquiry.</p>}</>:<p role='status'>Loading corporate form draft…</p>}<button type='button' onClick={()=>setAttempt(v=>v+1)}>Refresh corporate form</button></div>;
}
