'use client';
import {useEffect,useState} from 'react';
import {parseSpecialistDirectoryResponse} from '../../lib/cms/specialist-directory-runtime';
import type {PublishedSpecialist} from '../../lib/cms/public-specialists';
import {publishedMediaUrl} from '../../lib/cms/published-journey';
function Portrait({profile}:{profile:PublishedSpecialist}){
 const [failed,setFailed]=useState(false);const image=profile.payload.image!;
 return <figure>{failed?<p role='status'>Published portrait is unavailable.</p>:<img src={publishedMediaUrl(image.assetId)} alt={image.decorative?'':image.alt} loading='lazy' onError={()=>setFailed(true)} style={{maxWidth:'100%',maxHeight:420,objectFit:'contain'}}/>}{(image.caption||image.credit)&&<figcaption>{[image.caption,image.credit].filter(Boolean).join(' · ')}</figcaption>}</figure>;
}

export function SpecialistDirectoryPreview({site,locale,relatedHeading,emptyMessage}:{site?:string;locale:string;relatedHeading:string;emptyMessage:string}){
 const [profiles,setProfiles]=useState<PublishedSpecialist[]|null>(null),[error,setError]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  setProfiles(null);setError(false);if(!site)return;
  const controller=new AbortController();let active=true;
  void (async()=>{try{
   const response=await fetch(`/api/cms/published/specialists?site=${encodeURIComponent(site)}&locale=${encodeURIComponent(locale)}`,{cache:'no-store',signal:controller.signal});
   if(!response.ok)throw Error('Unavailable');
   const values=parseSpecialistDirectoryResponse(await response.json(),site,locale);
   if(active)setProfiles(values);
  }catch{if(active)setError(true);}})();
  return()=>{active=false;controller.abort();};
 },[site,locale,attempt]);
 if(!site)return <p role='status'>Select a website to preview its published specialist directory.</p>;
 return <div><p>These are currently published profiles. Unsaved profile edits are excluded; this list is not pinned to the page revision or simulated preview time.</p>
  {error?<p role='alert'>Published specialist profiles could not be loaded. This does not mean the directory is empty.</p>:profiles===null?<p role='status'>Loading published specialist profiles…</p>:profiles.length===0?<p>{emptyMessage}</p>:profiles.map(profile=><article key={profile.recordId}>
   <p>{profile.payload.role}</p><h3>{profile.payload.name}</h3><p style={{whiteSpace:'pre-line'}}>{profile.payload.expertise}</p><p style={{whiteSpace:'pre-line'}}>{profile.payload.bio}</p>{profile.payload.moment&&<blockquote>{profile.payload.moment}</blockquote>}
   <Portrait key={profile.payload.image!.assetId} profile={profile}/>
   {profile.relatedJourneys.length>0&&<><h4>{relatedHeading}</h4><ul>{profile.relatedJourneys.map(item=><li key={item.recordId}><a href={item.path}>{item.title}</a></li>)}</ul></>}
   <a href={profile.planningHref}>{profile.payload.planning.label}</a>
  </article>)}
  <button type='button' onClick={()=>setAttempt(value=>value+1)}>Refresh published specialists</button>
 </div>;
}
