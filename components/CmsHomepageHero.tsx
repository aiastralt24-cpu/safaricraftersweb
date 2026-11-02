'use client';
import {Fragment,useEffect,useState} from 'react';
import type {HomepagePublicSection} from '../lib/cms/homepage-projection';
import {publishedMediaUrl} from '../lib/cms/published-journey';
import {heroFramingStyle} from '../lib/cms/hero-framing';
import './CmsHomepageHero.css';
type Hero=Extract<HomepagePublicSection,{kind:'homepageHero'}>;
function videoUrl(id:string){if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(id))throw Error('Invalid video identifier.');return `/api/cms/published/videos/${id}`;}
/** Receives a public projection only. Media routes retain authorization and
 * rights checks; the renderer never signs originals or reads editor drafts. */
export function CmsHomepageHero({section}:{section:Hero}){
 const {data,controls}=section,Heading=controls.headingLevel;
 const [frameIndex,setFrameIndex]=useState(0),[paused,setPaused]=useState(false),[motion,setMotion]=useState(false),[rotate,setRotate]=useState(false),[mobile,setMobile]=useState(false),[failedVideo,setFailedVideo]=useState<string|null>(null);
 useEffect(()=>{
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)'),small=window.matchMedia('(max-width: 767px)'),compact=window.matchMedia('(max-width: 720px)');
  const connection=(navigator as Navigator&{connection?:{saveData?:boolean;effectiveType?:string;addEventListener?:(type:string,fn:()=>void)=>void;removeEventListener?:(type:string,fn:()=>void)=>void}}).connection;
  const update=()=>{const allowed=!reduced.matches&&!connection?.saveData&&!['slow-2g','2g'].includes(connection?.effectiveType??'')&&!document.hidden;setMotion(allowed);setRotate(allowed&&!compact.matches);setMobile(small.matches);};
  update();for(const query of [reduced,small,compact])query.addEventListener('change',update);connection?.addEventListener?.('change',update);document.addEventListener('visibilitychange',update);
  return()=>{for(const query of [reduced,small,compact])query.removeEventListener('change',update);connection?.removeEventListener?.('change',update);document.removeEventListener('visibilitychange',update);};
 },[]);
 useEffect(()=>{setFrameIndex(0);setFailedVideo(null);},[section.id,data]);
 useEffect(()=>{if(!rotate||paused||data.frames.length<2)return;const timer=window.setInterval(()=>setFrameIndex(index=>(index+1)%data.frames.length),6200);return()=>window.clearInterval(timer);},[rotate,paused,data.frames.length]);
 const frame=data.frames[frameIndex]??data.frames[0],poster=mobile?(data.mobilePoster??data.poster):data.poster;
 const video=data.background.kind==='video'?(mobile?(data.background.mobileAssetId??data.background.desktopAssetId):data.background.desktopAssetId):null;
 return <section data-cms-motion={controls.animation} id={controls.anchor} className={`concept-hero cms-homepage-hero background-${controls.background} width-${controls.width} spacing-${controls.spacing} align-${controls.textAlign}`} aria-label={data.navigationLabel} data-nav-label={data.navigationLabel} style={heroFramingStyle(data.framing,data.mobileFraming)}>
  <picture className='cms-homepage-poster'>{data.mobilePoster&&<source media='(max-width: 767px)' srcSet={publishedMediaUrl(data.mobilePoster.assetId)}/>}<img className='concept-hero-media concept-hero-poster' src={publishedMediaUrl(data.poster.assetId)} alt={poster.decorative?'':poster.alt} loading='eager' fetchPriority='high'/></picture>
  {video&&motion&&!paused&&failedVideo!==video&&<video key={video} className='concept-hero-media' src={videoUrl(video)} autoPlay muted loop playsInline preload='metadata' poster={publishedMediaUrl(poster.assetId)} aria-hidden='true' onError={()=>setFailedVideo(video)}/>}
  <div className='concept-hero-shade'/><div className='concept-hero-grid'><div className='concept-hero-copy'><Heading key={frame.id} className='concept-hero-line'>{frame.heading.lines.map((line,index)=><Fragment key={index}>{index>0&&<br/>}<span className={index===0?'concept-hero-line-main':'concept-hero-line-sub'}>{line.runs.map((run,i)=>run.emphasis?<em className='concept-hero-line-accent' key={i}>{run.text}</em>:<Fragment key={i}>{run.text}</Fragment>)}</span></Fragment>)}</Heading>{data.copy&&<p>{data.copy}</p>}</div></div>
  {(video||data.frames.length>1)&&motion&&<button className='cms-homepage-motion' type='button' aria-pressed={paused} onClick={()=>setPaused(value=>!value)}>{paused?'Resume background motion':'Pause background motion'}</button>}
  {(poster.caption||poster.credit)&&<p className='cms-homepage-credit'>{[poster.caption,poster.credit].filter(Boolean).join(' · ')}</p>}
 </section>;
}
