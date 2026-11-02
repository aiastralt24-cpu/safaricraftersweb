'use client';
import {PageUrlSubmissionPanel} from './page-url-submission-panel';
import {useEffect,useRef,useState} from 'react';
import {parsePageUrlImpact,pageUrlImpactSchema} from '../../lib/cms/page-url-impact';
import type {z} from 'zod';
type Impact=z.infer<typeof pageUrlImpactSchema>;
type Props={actor:string;canSubmit:boolean;site:string;record:string;revision:string;path:string;disabled:boolean;api:(path:string,options?:RequestInit)=>Promise<any>};
const messages={eligible:'This URL is eligible and not occupied by another saved record. It has not been reserved or changed.',occupied:'This URL is already occupied. Choose another URL.',unchanged:'This is the current URL.',invalid_or_reserved:'Use a valid lowercase page path outside reserved website routes.',fixed_route:'This page uses a fixed website route and cannot use the custom-page URL change workflow.'};
export function PageUrlImpactPanel({actor,canSubmit,site,record,revision,path,disabled,api}:Props){
 const [proposed,setProposed]=useState(path),[result,setResult]=useState<Impact|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[submissionPending,setSubmissionPending]=useState(false);const active=useRef<AbortController|null>(null);
 useEffect(()=>()=>active.current?.abort(),[]);
 async function load(after:string|null=null){
  if(disabled||busy||submissionPending)return;const request=new AbortController();active.current=request;setBusy(true);setError('');
  try{const command={site,record,revision,path:proposed,after};const raw=await api('/api/cms/page-url-impact',{method:'POST',signal:request.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify(command)});if(request.signal.aborted)return;const next=parsePageUrlImpact(raw.result,command);
   if(after&&result&&(next.snapshot!==result.snapshot||next.currentPath!==result.currentPath||next.status!==result.status||next.published!==result.published||next.items.some(item=>result.items.some(old=>old.recordId===item.recordId))))throw Error('The URL review changed. Run a new review.');
   setResult(old=>after&&old?{...next,items:[...old.items,...next.items]}:next);
  }catch(e){if(!request.signal.aborted)setError(e instanceof Error?e.message:'URL impact review is unavailable.');}finally{if(!request.signal.aborted)setBusy(false);}
 }
 return <details className='cms-history'><summary>Review a page URL change</summary><p>Check a proposed URL and its saved internal references. This review does not change the page or create a redirect.</p>
  <label>Proposed page URL<input value={proposed} maxLength={500} disabled={disabled||busy||submissionPending} onChange={e=>{setProposed(e.target.value);setResult(null);setError('');}}/></label>
  <button type='button' disabled={disabled||busy||submissionPending||!proposed} onClick={()=>void load()}>Review URL impact</button>{busy&&<p role='status'>Reviewing page URL…</p>}{error&&<p role='alert'>{error}</p>}
  {result&&<><p>{messages[result.status]}</p>{result.redirectDecisionRequired&&<p>A redirect decision is required before changing this published URL.</p>}<p>Only saved local URL fields and record references you can view are listed. Restricted content, absolute URLs, free text, unsaved edits and external links need separate review. An empty list does not prove that no links exist.</p>
   <ul>{result.items.map(item=><li key={item.recordId}><strong>{item.title}</strong> · {item.locale} · {item.path??item.type}<ul>{item.draftLink&&<li>Current draft links to the existing URL.</li>}{item.publishedLink&&<li>Published content links to the existing URL.</li>}{item.draftReference&&<li>Current draft references this page by identity.</li>}{item.publishedReference&&<li>Published content references this page by identity.</li>}</ul></li>)}</ul>
   {!result.items.length&&<p>No matching visible saved references.</p>}{result.nextCursor&&<button type='button' disabled={disabled||busy||submissionPending||Boolean(error)} onClick={()=>void load(result.nextCursor)}>Load more affected content</button>}
  </>}
 <PageUrlSubmissionPanel {...{actor,site,record,revision,api,canSubmit}} impact={error?null:result} disabled={disabled||busy} onPending={setSubmissionPending}/>
 </details>;
}
