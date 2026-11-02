'use client';
import {useEffect,useRef,useState} from 'react';
import {parsePageOrder,parsePageOrderResult,type PageOrderState} from '../../lib/cms/page-order';
type Props={site:string;locale:string;parent:string|null;disabled:boolean;api:(path:string,options?:RequestInit)=>Promise<any>;onSaved:()=>void};
export function PageOrderPanel({site,locale,parent,disabled,api,onSaved}:Props){
 const [state,setState]=useState<PageOrderState|null>(null),[ids,setIds]=useState<string[]>([]),[busy,setBusy]=useState(false),[review,setReview]=useState(false),[error,setError]=useState(''),[uncertain,setUncertain]=useState(false),[open,setOpen]=useState(false);
 const alive=useRef(true),lock=useRef(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const scope={site,locale,parent};
 async function load(){
  if(lock.current||disabled)return;lock.current=true;setBusy(true);setError('');setReview(false);
  try{const raw=await api('/api/cms/page-order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'read',...scope})});if(!alive.current)return;const fresh=parsePageOrder(raw.result,scope);setState(fresh);setIds(fresh.items.map(item=>item.id));setUncertain(false);setOpen(true);}
  catch(e){if(alive.current){setState(null);setError(e instanceof Error?e.message:'Ordering is unavailable. You need edit access to every page in this branch.');}}
  finally{lock.current=false;if(alive.current)setBusy(false);}
 }
 function move(index:number,delta:number){if(disabled||busy||review||uncertain)return;setIds(old=>{const next=[...old];[next[index],next[index+delta]]=[next[index+delta],next[index]];return next;});}
 async function save(){
  if(lock.current||disabled||!state||!review||uncertain)return;lock.current=true;setBusy(true);setError('');
  const command={action:'save' as const,...scope,snapshot:state.snapshot,ids,requestKey:crypto.randomUUID()};
  try{const raw=await api('/api/cms/page-order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(command)});parsePageOrderResult(raw.result,command);if(!alive.current)return;setOpen(false);setState(null);setReview(false);onSaved();}
  catch(e){if(alive.current){setUncertain(true);setReview(false);setError(`${e instanceof Error?e.message:'Save could not be confirmed.'} Refresh the saved order before making another change.`);}}
  finally{lock.current=false;if(alive.current)setBusy(false);}
 }
 const changed=Boolean(state&&JSON.stringify(ids)!==JSON.stringify(state.items.map(item=>item.id)));
 return <section aria-label='Sibling page order'>
  {!open&&<button type='button' disabled={disabled||busy} onClick={()=>void load()}>Arrange pages in this branch</button>}
  {busy&&<p role='status'>Loading or saving page order…</p>}{error&&<p role='alert'>{error}</p>}
  {open&&<><p>Arrange these pages in the CMS tree. Website menus and page URLs are managed separately.</p>
   {state&&<ol>{ids.map((id,index)=>{const item=state.items.find(row=>row.id===id)!;return <li key={id}><span>{item.title} · {item.path}</span>{!review&&<><button type='button' aria-label={`Move ${item.title} up`} disabled={disabled||busy||uncertain||index===0} onClick={()=>move(index,-1)}>Up</button><button type='button' aria-label={`Move ${item.title} down`} disabled={disabled||busy||uncertain||index===ids.length-1} onClick={()=>move(index,1)}>Down</button></>}</li>;})}</ol>}
   {review?<><p>Review the order above, then save it for this branch.</p><button type='button' disabled={disabled||busy} onClick={()=>void save()}>Save page order</button><button type='button' disabled={disabled||busy} onClick={()=>setReview(false)}>Back to arranging</button></>:<button type='button' disabled={disabled||busy||uncertain||!changed} onClick={()=>setReview(true)}>Review page order</button>}
   <button type='button' disabled={disabled||busy} onClick={()=>void load()}>Refresh saved order</button><button type='button' disabled={busy} onClick={()=>{setOpen(false);setReview(false);setState(null);setError('');}}>Close ordering</button>
  </>}
 </section>;
}
