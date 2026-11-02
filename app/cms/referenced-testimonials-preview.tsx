'use client';
import {useEffect,useRef,useState} from 'react';
import {z} from 'zod';
import {testimonialSchema} from '../../lib/cms/testimonials';
import type {LoadFormPreview} from '../../lib/cms/form-preview-reference';
import type {LoadMediaPreview} from './media-image';
import {TestimonialPreview} from './testimonial-preview';
const response=z.object({id:z.string().uuid(),type:z.literal('testimonial'),currentRevision:z.string().uuid(),payload:testimonialSchema}).passthrough();
export function ReferencedTestimonialsPreview({ids,load,loadPreview}:{ids:string[];load?:LoadFormPreview;loadPreview:LoadMediaPreview}){
 const loader=useRef(load);loader.current=load;const key=JSON.stringify(ids),available=Boolean(load);
 const [values,setValues]=useState<(z.infer<typeof response>|null)[]|null>(null),[attempt,setAttempt]=useState(0);
 useEffect(()=>{setValues(null);if(!available)return;let active=true;const controller=new AbortController();
  Promise.all((JSON.parse(key) as string[]).map(async id=>{try{const value=response.parse(await loader.current!(id,controller.signal));return value.id===id?value:null;}catch{return null;}})).then(value=>{if(active)setValues(value);});
  return()=>{active=false;controller.abort();};
 },[key,available,attempt]);
 if(!available)return <p role='status'>Linked testimonial previews require access through the content workspace. This page share does not grant access to other drafts.</p>;
 return <div><p>Selected testimonials use their latest saved drafts, separately from this page revision.</p>{values?values.map((value,index)=>value?<TestimonialPreview key={`${index}:${value.currentRevision}`} value={value.payload} loadPreview={loadPreview}/>:<p key={index} role='alert'>Selected testimonial {index+1} is unavailable or cannot be previewed with your permissions.</p>):<p role='status'>Loading selected testimonials…</p>}<button type='button' onClick={()=>setAttempt(v=>v+1)}>Refresh testimonials</button></div>;
}
