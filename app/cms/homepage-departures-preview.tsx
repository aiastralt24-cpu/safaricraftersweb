'use client';
import {useEffect,useState} from 'react';
import {CmsHomepageDepartures} from '../../components/CmsHomepageDepartures';
import type {HomepageDepartures} from '../../lib/cms/homepage-departures';
import {parseExpeditionDirectoryResponse} from '../../lib/cms/expedition-directory-runtime';
import type {PublishedExpeditionCard} from '../../lib/cms/public-expedition-directory';
type Props={value:HomepageDepartures;today:string;headingLevel:'h1'|'h2'|'h3';site?:string;locale:string};
export function HomepageDeparturesPreview({site,locale,...directory}:Props){
 const [cards,setCards]=useState<PublishedExpeditionCard[]|null>(null),[error,setError]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  setCards(null);setError(false);if(!site||locale!=='en')return;
  const controller=new AbortController();let active=true;
  void(async()=>{try{
   const response=await fetch(`/api/cms/published/expeditions?site=${encodeURIComponent(site)}&locale=${encodeURIComponent(locale)}`,{cache:'no-store',signal:controller.signal});
   if(!response.ok)throw Error('Unavailable');
   const values=parseExpeditionDirectoryResponse(await response.json(),site,locale);if(active)setCards(values);
  }catch{if(active)setError(true);}})();
  return()=>{active=false;controller.abort();};
 },[site,locale,attempt]);
 if(!site)return <p role='status'>Select a website to preview its published expedition directory.</p>;
 if(locale!=='en')return <p role='status'>Published expedition preview currently supports English only.</p>;
 return <div><p>Currently published expeditions with this draft’s labels and layout. Unsaved expedition changes are excluded. Records are not pinned to this page revision; departure filtering uses the selected preview date ({directory.today}).</p>
 {error?<p role='alert'>Published expeditions could not be loaded. This does not mean the directory is empty.</p>:cards===null?<p role='status'>Loading published expeditions…</p>:<CmsHomepageDepartures key={attempt} cards={cards} {...directory}/>}
 <button type='button' onClick={()=>setAttempt(value=>value+1)}>Refresh published expeditions</button></div>;
}
