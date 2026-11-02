'use client';
import {useEffect,useRef,useState} from 'react';
import {parseFormPreviewReference} from '../../lib/cms/form-preview-reference';
import type {FormPreviewReference,LoadFormPreview} from '../../lib/cms/form-preview-reference';
import {FormPreview} from './form-preview';
export function ReferencedFormPreview({id,load}:{id:string;load?:LoadFormPreview}){
 const loader=useRef(load);loader.current=load;
 const [value,setValue]=useState<FormPreviewReference|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 const available=Boolean(load);
 useEffect(()=>{setValue(null);setError('');if(!available)return;const controller=new AbortController();let active=true;
  loader.current!(id,controller.signal).then(input=>{const parsed=parseFormPreviewReference(input,id);if(active)setValue(parsed);}).catch(()=>{if(active)setError('This form is unavailable or you do not have permission to preview it.');});
  return()=>{active=false;controller.abort();};
 },[id,available,attempt]);
 if(!available)return <p role='status'>Linked form preview requires access through the content workspace. This shared page preview does not grant access to other drafts.</p>;
 return <div>{error?<p role='alert'>{error}</p>:value?<><p>Linked form’s latest saved draft · revision {value.revision}. It is separate from this page revision.</p><FormPreview key={value.revision} value={value.definition}/></>:<p role='status'>Loading linked form draft…</p>}<button type='button' onClick={()=>setAttempt(v=>v+1)}>Refresh linked form</button></div>;
}
