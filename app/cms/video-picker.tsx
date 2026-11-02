'use client';
import {useEffect,useRef,useState} from 'react';
import {videoSelectionReason} from '../../lib/cms/video-selection';
import type {SelectableVideo} from '../../lib/cms/video-selection';


type Props={site:string;value:string;disabled:boolean;api:(path:string,options?:RequestInit)=>Promise<any>;onChange:(id:string)=>void};
export function VideoPicker({site,value,disabled,api,onChange}:Props){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[search,setSearch]=useState(''),[applied,setApplied]=useState(''),[rows,setRows]=useState<SelectableVideo[]>([]),[more,setMore]=useState(false);
 const alive=useRef(true),generation=useRef(0);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;generation.current++;};},[]);
 useEffect(()=>{generation.current++;setOpen(false);setRows([]);setError('');setBusy(false);},[site,disabled]);
 async function command(action:string,extra:Record<string,unknown>){return (await api('/api/cms/media',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,site,...extra})})).result;}
 async function list(append=false){const current=++generation.current;setBusy(true);setError('');try{const result:SelectableVideo[]=await command('list',{search:append?applied:search,after:append?rows.at(-1)?.id:null});if(alive.current&&generation.current===current){setRows(append?[...rows,...result]:result);setMore(result.length===50);if(!append)setApplied(search);}}catch(reason){if(alive.current&&generation.current===current)setError(reason instanceof Error?reason.message:'Unable to load videos.');}finally{if(alive.current&&generation.current===current)setBusy(false);}}
 async function choose(id:string){const current=++generation.current;setBusy(true);setError('');try{const asset:SelectableVideo=await command('get',{asset:id});if(!alive.current||generation.current!==current)return;if(asset.id!==id)throw Error('The selected video changed. Refresh the library.');const reason=videoSelectionReason(asset);if(reason)throw Error(reason);onChange(asset.id);setOpen(false);}catch(reason){if(alive.current&&generation.current===current)setError(reason instanceof Error?reason.message:'Unable to select video.');}finally{if(alive.current&&generation.current===current)setBusy(false);}}
 return <div className='cms-media-picker'>{value?<><p>Selected video: {value}</p></>:<p>No video selected.</p>}<button type='button' disabled={disabled||busy} onClick={()=>{setOpen(!open);if(!open)void list();}}>{open?'Close video library':value?'Replace video':'Choose library video'}</button>
 {open&&<section aria-label='Choose library video'><p>Only inspected videos with current approved rights can be selected. Add new files in Background video uploads.</p><label>Search library<input maxLength={200} value={search} disabled={disabled||busy} onChange={event=>setSearch(event.target.value)}/></label><button type='button' disabled={disabled||busy} onClick={()=>void list()}>Search videos</button>{busy&&<p role='status'>Loading videos…</p>}{!busy&&!rows.length&&<p>No videos found.</p>}<ul>{rows.map(asset=>{const reason=videoSelectionReason(asset);return <li key={asset.id}><strong>{asset.title||asset.id}</strong>{reason&&<p>{reason}</p>}<button type='button' disabled={disabled||busy||Boolean(reason)} onClick={()=>void choose(asset.id)}>Use {asset.title||asset.id}</button></li>;})}</ul>{more&&<button type='button' disabled={disabled||busy} onClick={()=>void list(true)}>Load more videos</button>}</section>}{error&&<p role='alert'>{error}</p>}</div>;
}
