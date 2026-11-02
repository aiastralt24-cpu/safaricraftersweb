'use client';
import {useEffect,useRef,useState} from 'react';
import {projectHomepageJourneyDraft} from '../../lib/cms/homepage-journeys';
import type {HomepageJourneys,HomepageJourneyCard} from '../../lib/cms/homepage-journeys';
import type {LoadFormPreview} from '../../lib/cms/form-preview-reference';
import type {LoadMediaPreview} from './media-image';
import {MediaImage} from './media-image';
import {CmsHomepageJourneys} from '../../components/CmsHomepageJourneys';
export function HomepageJourneysPreview({value,load,loadPreview,headingLevel}:{value:HomepageJourneys;load?:LoadFormPreview;loadPreview:LoadMediaPreview;headingLevel:'h1'|'h2'|'h3'}){
 const loader=useRef(load);loader.current=load;const key=JSON.stringify(value.items),available=Boolean(load);
 const [result,setResult]=useState<{key:string;cards:(HomepageJourneyCard|null)[]}|null>(null),[attempt,setAttempt]=useState(0);
 useEffect(()=>{setResult(null);if(!available)return;let active=true;const controller=new AbortController();
 Promise.all((JSON.parse(key) as HomepageJourneys['items']).map(async selection=>{try{return projectHomepageJourneyDraft(await loader.current!(selection.recordId,controller.signal),selection);}catch{return null;}})).then(cards=>{if(active)setResult({key,cards});});
 return()=>{active=false;controller.abort();};
 },[key,available,attempt]);
 if(!available)return <p role='status'>Selected journey drafts require your own content-workspace access. Sharing this page does not grant access to other drafts.</p>;
 return <div><p>Journey cards use the latest saved journey drafts, separately from this page revision. This does not show or authorize the published homepage.</p>{!result||result.key!==key?<p role='status'>Loading selected journeys…</p>:result.cards.some(card=>!card)?<div role='alert'><p>The journey collection cannot be previewed until every selected record is available and complete.</p><ul>{result.cards.map((card,index)=>!card&&<li key={index}>Selected journey {index+1} is unavailable or incomplete.</li>)}</ul></div>:<CmsHomepageJourneys value={value} cards={result.cards as HomepageJourneyCard[]} headingLevel={headingLevel} renderImage={image=><MediaImage asset={image.assetId} alt={image.alt} load={loadPreview}/>}/>}<button type='button' onClick={()=>setAttempt(v=>v+1)}>Refresh selected journeys</button></div>;
}
