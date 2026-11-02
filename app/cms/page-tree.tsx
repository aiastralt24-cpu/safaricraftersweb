'use client';
import {useEffect,useRef,useState} from 'react';
import {PageOrderPanel} from './page-order-panel';
import {parsePageTree,type PageTreeItem} from '../../lib/cms/page-tree';
type Props={site:string;locale:string;api:(path:string,options?:RequestInit)=>Promise<any>;disabled:boolean;onSelect:(id:string)=>void};
function Branch({site,locale,api,disabled,onSelect,parent,depth=0}:{parent:string|null;depth?:number}&Props){
 const [items,setItems]=useState<PageTreeItem[]>([]),[next,setNext]=useState<string|null>(null),[snapshot,setSnapshot]=useState<string|null>(null),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),active=useRef<AbortController|null>(null);
 async function load(after:string|null){
  active.current?.abort();const request=new AbortController();active.current=request;setBusy(true);setError('');
  try{const raw=await api('/api/cms/page-hierarchy',{method:'POST',signal:request.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'tree',site,locale,parent,after,snapshot:after?snapshot:null})});if(request.signal.aborted)return;const result=parsePageTree(raw.result,{site,locale,parent,after,snapshot:after?snapshot:null});if(after&&result.items.some(item=>items.some(old=>old.id===item.id)))throw Error('The page tree changed. Refresh this branch.');setSnapshot(result.snapshot);setItems(old=>after?[...old,...result.items]:result.items);setNext(result.nextCursor);setReady(true);}
  catch(e){if(!request.signal.aborted)setError(e instanceof Error?e.message:'Page tree unavailable.');}finally{if(!request.signal.aborted)setBusy(false);}
 }
 // Branch identity is keyed by its parent and tree refresh epoch.
 useEffect(()=>{void load(null);return()=>active.current?.abort();},[]);
 return <>{error&&<p role='alert'>{error}</p>}{busy&&<p role='status'>Loading page tree…</p>}{(!ready||Boolean(error))&&!busy&&<button type='button' disabled={disabled} onClick={()=>void load(null)}>Retry page tree</button>}{ready&&<PageOrderPanel key={`${site}:${locale}:${parent}`} {...{site,locale,parent,api,disabled}} onSaved={()=>void load(null)}/>}
{ready&&!items.length&&<p>No visible pages in this branch.</p>}<ul>{items.map(item=><Node key={item.id} {...{site,locale,api,disabled,onSelect,depth,item}}/>)}</ul>{next&&<button type='button' disabled={disabled||busy||Boolean(error)} onClick={()=>void load(next)}>Load more pages in this branch</button>}</>;
}
function Node({item,depth,...props}:{item:PageTreeItem;depth:number}&Props){
 const [open,setOpen]=useState(false);
 return <li>{item.hasChildren&&depth<100&&<button type='button' disabled={props.disabled} aria-expanded={open} aria-label={`${open?'Collapse':'Expand'} ${item.title}`} onClick={()=>setOpen(!open)}>{open?'−':'+'}</button>}{item.type==='page'?<button type='button' disabled={props.disabled} onClick={()=>props.onSelect(item.id)}>Open {item.title}</button>:<strong>{item.title} · Homepage</strong>}<small>{item.path} · {item.published?'Published':'Draft'}{item.parentRestricted?' · Parent is restricted; shown here for access':''}</small>{open&&<Branch {...props} parent={item.id} depth={depth+1}/>}</li>;
}
export function PageTree(props:Props){
 const [open,setOpen]=useState(false),[epoch,setEpoch]=useState(0);
 return <section className='cms-page-tree' aria-label='Page tree'><button type='button' disabled={props.disabled} aria-expanded={open} onClick={()=>setOpen(!open)}>{open?'Close page tree':'Browse page tree'}</button>{open&&<><p>{props.locale} · Only pages you can view. The Homepage editor is available from its sidebar tab.</p><button type='button' disabled={props.disabled} onClick={()=>setEpoch(v=>v+1)}>Refresh page tree</button><Branch key={epoch} {...props} parent={null}/></>}</section>;
}
