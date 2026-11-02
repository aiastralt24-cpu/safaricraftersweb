'use client';
import {useEffect,useRef,useState} from 'react';
import type {LoadMediaPreview} from './media-image';
export function MediaVideo({asset,label,load}:{asset:string;label:string;load:LoadMediaPreview}){
 const loader=useRef(load);loader.current=load;
 const [url,setUrl]=useState<string|null>(null),[error,setError]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  let active=true,objectUrl:string|undefined;const controller=new AbortController();setUrl(null);setError(false);
  loader.current(asset,controller.signal).then(blob=>{
   if(!active)return;if(blob.type!=='video/mp4'||blob.size===0||blob.size>100_000_000)throw Error('Invalid video preview');
   objectUrl=URL.createObjectURL(blob);setUrl(objectUrl);
  }).catch(()=>{if(active)setError(true);});
  return()=>{active=false;controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[asset,attempt]);
 return <div>{error?<div role='status'><p>Video preview is unavailable.</p><button type='button' onClick={()=>setAttempt(value=>value+1)}>Retry video preview</button></div>:url?<><video aria-label={label} src={url} controls muted playsInline preload='metadata' style={{width:'100%',maxHeight:480}} onError={()=>setError(true)}/><p>Silent background video · Private workspace preview</p></>:<p role='status'>Loading private video preview…</p>}</div>;
}
