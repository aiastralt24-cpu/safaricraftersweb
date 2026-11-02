'use client';
import {useEffect,useState} from 'react';
import type {LoadMediaPreview} from './media-image';
import {MediaVideo} from './media-video';
export function HomepageVideoPreview({desktop,mobile,load}:{desktop:string;mobile?:string;load?:LoadMediaPreview}){
 const [small,setSmall]=useState(false),[reduced,setReduced]=useState(true),[ready,setReady]=useState(false),[playing,setPlaying]=useState(false);
 useEffect(()=>{
  const size=window.matchMedia('(max-width: 760px)'),motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const update=()=>{setSmall(size.matches);setReduced(motion.matches);setReady(true);setPlaying(false);};update();size.addEventListener('change',update);motion.addEventListener('change',update);
  return()=>{size.removeEventListener('change',update);motion.removeEventListener('change',update);};
 },[]);
 useEffect(()=>setPlaying(false),[desktop,mobile]);
 const asset=small&&mobile?mobile:desktop;
 return <section aria-label='Background video preview'><p>{small&&mobile?'Mobile video selected for this viewport.':'Desktop video selected for this viewport.'} {reduced?'Reduced motion is enabled; the poster remains the default.':'Video loads only when you request a preview.'}</p>{load?<><button type='button' disabled={!ready} onClick={()=>setPlaying(value=>!value)}>{playing?'Close background video preview':'Preview background video'}</button>{playing&&<MediaVideo key={asset} asset={asset} label={small&&mobile?'Mobile background video':'Desktop background video'} load={load}/>}</>:<p>Private video playback is unavailable in this preview.</p>}</section>;
}
