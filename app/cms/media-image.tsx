'use client';
import {useEffect,useRef,useState} from 'react';
export type LoadMediaPreview=(asset:string,signal:AbortSignal)=>Promise<Blob>;
export function MediaImage({asset,alt,load}:{asset:string;alt:string;load:LoadMediaPreview}){
 const loader=useRef(load);loader.current=load;
 const [url,setUrl]=useState<string|null>(null),[error,setError]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  let active=true,objectUrl:string|undefined;const controller=new AbortController();setUrl(null);setError(false);
  loader.current(asset,controller.signal).then(blob=>{
   if(!active)return;if(blob.type!=='image/webp'||blob.size>25_000_000||blob.size===0)throw new Error('Invalid preview');
   objectUrl=URL.createObjectURL(blob);setUrl(objectUrl);
  }).catch(()=>{if(active)setError(true);});
  return()=>{active=false;controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[asset,attempt]);
 return <div className="cms-media-image">{error?<div role="status"><p>Image preview is unavailable.</p><button type="button" onClick={()=>setAttempt(value=>value+1)}>Retry image preview</button></div>:url?<img src={url} alt={alt} onError={()=>setError(true)}/>:<p role="status">Loading private image preview…</p>}</div>;
}
