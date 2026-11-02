'use client';
import {useEffect,useRef,useState} from 'react';
import {z} from 'zod';
import {faqSchema} from '../../lib/cms/faqs';
import type {LoadFormPreview} from '../../lib/cms/form-preview-reference';
import {FaqPreview} from './faq-editor';
const response=z.object({id:z.string().uuid(),type:z.literal('faq'),currentRevision:z.string().uuid(),payload:faqSchema}).passthrough();
export function ReferencedFaqPreview({ids,load}:{ids:string[];load?:LoadFormPreview}){
 const loader=useRef(load);loader.current=load;const key=JSON.stringify(ids),available=Boolean(load);
 const [values,setValues]=useState<(z.infer<typeof response>|null)[]|null>(null),[attempt,setAttempt]=useState(0);
 useEffect(()=>{setValues(null);if(!available)return;let active=true;const controller=new AbortController();
  Promise.all((JSON.parse(key) as string[]).map(async id=>{try{const value=response.parse(await loader.current!(id,controller.signal));return value.id===id?value:null;}catch{return null;}})).then(value=>{if(active)setValues(value);});
  return()=>{active=false;controller.abort();};
 },[key,available,attempt]);
 if(!available)return <p role='status'>Linked faq previews require access through the content workspace. This page share does not grant access to other drafts.</p>;
 return <div><p>Selected FAQs use their latest saved drafts, separately from this page revision.</p>{values?values.map((value,index)=>value?<FaqPreview key={`${index}:${value.currentRevision}`} value={value.payload}/>:<p key={index} role='alert'>Selected faq {index+1} is unavailable or cannot be previewed with your permissions.</p>):<p role='status'>Loading selected FAQs…</p>}<button type='button' onClick={()=>setAttempt(v=>v+1)}>Refresh FAQs</button></div>;
}
