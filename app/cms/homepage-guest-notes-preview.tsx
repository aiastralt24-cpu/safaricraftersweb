'use client';
import {useEffect,useRef,useState} from 'react';
import {projectHomepageGuestDraft} from '../../lib/cms/homepage-guest-notes';
import type {HomepageGuestNotes} from '../../lib/cms/homepage-guest-notes';
import type {LoadFormPreview} from '../../lib/cms/form-preview-reference';
import type {LoadMediaPreview} from './media-image';
import {MediaImage} from './media-image';
import {CmsHomepageGuestNotes} from '../../components/CmsHomepageGuestNotes';
export function HomepageGuestNotesPreview({value,load,loadPreview,headingLevel}:{value:HomepageGuestNotes;load?:LoadFormPreview;loadPreview:LoadMediaPreview;headingLevel:'h1'|'h2'|'h3'}){
 const loader=useRef(load);loader.current=load;const key=JSON.stringify(value.items),available=Boolean(load);
 const [result,setResult]=useState<{key:string;notes:(ReturnType<typeof projectHomepageGuestDraft>|null)[]}|null>(null),[attempt,setAttempt]=useState(0);
 useEffect(()=>{setResult(null);if(!available)return;let active=true;const controller=new AbortController();
 Promise.all((JSON.parse(key) as HomepageGuestNotes['items']).map(async selection=>{try{return projectHomepageGuestDraft(await loader.current!(selection.recordId,controller.signal),selection);}catch{return null;}})).then(notes=>{if(active)setResult({key,notes});});return()=>{active=false;controller.abort();};
 },[key,available,attempt]);
 if(!available)return <p role='status'>Guest-note previews require your own testimonial access. This page share does not grant access to other drafts.</p>;
 const ready=result?.key===key?result:null;
 return <div><p>Latest saved testimonial drafts, not published guest notes. Names follow anonymity settings; consent evidence and withheld details are excluded.</p>{!ready?<p role='status'>Loading selected guest notes…</p>:ready.notes.some(note=>!note)?<p role='alert'>The guest-note collection cannot be previewed until every selection is available and valid.</p>:<><ul>{ready.notes.map((note,index)=><li key={index}>Guest note {index+1}: consent {note!.consent}; wording {note!.verified?'verified':'not verified'}.</li>)}</ul><CmsHomepageGuestNotes value={value} cards={ready.notes.map(note=>note!.card)} headingLevel={headingLevel} renderImage={image=><MediaImage asset={image.assetId} alt={image.decorative?'':image.alt} load={loadPreview}/>}/></>}<button type='button' onClick={()=>setAttempt(v=>v+1)}>Refresh selected guest notes</button></div>;
}
