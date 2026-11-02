'use client';
import {useEffect,useRef,useState} from 'react';
import {MediaVideo} from './media-video';
import {MediaImage} from './media-image';
import type {LoadMediaPreview} from './media-image';
type Asset={id:string;revision:number;title:string;description:string;alt:string;caption:string;folder:string;tags:string[];width:number;height:number;mime:string;inspectionStatus:string;rightsStatus:string;rightsEvidence:string|null;rightsExpiresAt:string|null;archivedAt:string|null;canEdit:boolean;canManageRights:boolean;canArchive:boolean};
type Usage={recordId:string;title:string;type:string;path:string|null;draft:boolean;published:boolean};
type Props={initialAsset?:string;site:string;api:(path:string,options?:RequestInit)=>Promise<any>;loadPreview:LoadMediaPreview;loadVideoPreview?:LoadMediaPreview;busy:boolean;run:(work:()=>Promise<void>)=>Promise<void>;onDirty:(value:boolean)=>void};
const fieldNames={title:'Asset title',description:'Description',alt:'Default alternative text',caption:'Caption',folder:'Folder',tags:'Tags (comma separated)'};
type Fields=Record<keyof typeof fieldNames,string>;
const fieldsFor=(a:Asset):Fields=>({title:a.title,description:a.description,alt:a.alt,caption:a.caption,folder:a.folder,tags:a.tags.join(', ')});
export function MediaLibrary({site,api,loadPreview,loadVideoPreview,busy,run,onDirty,initialAsset}:Props){
 const [rows,setRows]=useState<Asset[]>([]),[more,setMore]=useState(false),[search,setSearch]=useState(''),[applied,setApplied]=useState('');
 const [asset,setAsset]=useState<Asset|null>(null),[fields,setFields]=useState<Fields|null>(null),[metaDirty,setMetaDirty]=useState(false),[rightsDirty,setRightsDirty]=useState(false);
 const [status,setStatus]=useState('pending'),[evidence,setEvidence]=useState(''),[expires,setExpires]=useState('');
 const [usage,setUsage]=useState<Usage[]|null>(null),[moreUsage,setMoreUsage]=useState(false),[message,setMessage]=useState('');
 const alive=useRef(true),apiRef=useRef(api);apiRef.current=api;
 const dirty=metaDirty||rightsDirty;
 useEffect(()=>{onDirty(dirty);},[dirty,onDirty]);
 async function command(action:string,extra:Record<string,unknown>={}){return (await apiRef.current('/api/cms/media',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,site,...extra})})).result;}
 async function list(query:string,append=false){const result:Asset[]=await command('list',{search:query,after:append?rows.at(-1)?.id:null});if(alive.current){setRows(append?[...rows,...result]:result);setMore(result.length===50);setApplied(query);}}
 useEffect(()=>{alive.current=true;run(async()=>{await list('');if(initialAsset&&alive.current)await select(initialAsset);});return()=>{alive.current=false;};},[site]); // eslint-disable-line react-hooks/exhaustive-deps
 function canLeave(){return !dirty||window.confirm('Discard your unsaved media changes?');}
 async function select(id:string){setAsset(null);setFields(null);const value:Asset=await command('get',{asset:id});if(!value||value.id!==id)throw Error('Media response does not match the selected asset.');if(!alive.current)return;setAsset(value);setFields(fieldsFor(value));setStatus(value.rightsStatus);setEvidence(value.rightsEvidence??'');setExpires(value.rightsExpiresAt??'');setMetaDirty(false);setRightsDirty(false);setUsage(null);setMessage('');}
 async function update(rights=false){
  if(!asset||!fields)return;
  if(rights){
   if(expires&&Number.isNaN(Date.parse(expires)))throw new Error('Enter an ISO date and time with a timezone, or leave expiry empty.');
   await command('rights',{asset:asset.id,revision:asset.revision,status,evidence,expires:expires?new Date(expires).toISOString():null});
  }else await command('edit',{asset:asset.id,revision:asset.revision,...fields,tags:fields.tags.split(',').map(t=>t.trim()).filter(Boolean)});
  const value:Asset=await command('get',{asset:asset.id});if(!alive.current)return;
  setAsset(value);setRows(current=>current.map(row=>row.id===value.id?value:row));
  if(rights){setRightsDirty(false);setStatus(value.rightsStatus);setEvidence(value.rightsEvidence??'');setExpires(value.rightsExpiresAt??'');}
  else{setMetaDirty(false);setFields(fieldsFor(value));}
  setMessage(rights?'Usage rights updated. Page publication is a separate action.':'Media details saved. Page-specific descriptions remain unchanged.');
 }
 async function loadUsage(append=false){if(!asset)return;const result:Usage[]=await command('usage',{asset:asset.id,after:append?usage?.at(-1)?.recordId:null});if(alive.current){setUsage(append?[...(usage??[]),...result]:result);setMoreUsage(result.length===50);}}
 return <section className="cms-library"><header><h2>Media library</h2><p>Manage media descriptions, usage rights and references. Image previews are private to your workspace.</p></header>
  <form className="cms-actions" onSubmit={event=>{event.preventDefault();run(()=>list(search));}}><label>Search media<input value={search} maxLength={200} onChange={event=>setSearch(event.target.value)} placeholder="Title, description, folder or tag"/></label><button disabled={busy}>Search</button></form>
  <div className="cms-library-grid"><aside aria-label="Media assets">{rows.map(row=><button disabled={busy} key={row.id} className={asset?.id===row.id?'selected':''} onClick={()=>{if(canLeave())run(()=>select(row.id));}}><strong>{row.title||'Untitled asset'}</strong><small>{row.width} × {row.height} · {row.rightsStatus}{row.archivedAt?' · Archived':''}</small></button>)}{!rows.length&&<p>No matching media. Upload a file or change your search.</p>}{more&&<button disabled={busy} onClick={()=>run(()=>list(applied,true))}>Load more assets</button>}</aside>
  {asset&&fields?<div className="cms-library-detail"><h3>{asset.title||'Untitled asset'}</h3><p>{asset.width} × {asset.height} · {asset.mime} · Inspection: {asset.inspectionStatus}</p>{asset.mime==='video/mp4'?(loadVideoPreview?<MediaVideo key={`${asset.id}:${asset.revision}`} asset={asset.id} label={asset.title||'Selected video'} load={loadVideoPreview}/>:<p>Video preview is unavailable.</p>):<MediaImage key={`${asset.id}:${asset.revision}`} asset={asset.id} alt={asset.alt||asset.title||'Selected image'} load={loadPreview}/>}<small>Asset ID: {asset.id}</small>{message&&<p role="status">{message}</p>}
   <form onSubmit={event=>{event.preventDefault();run(()=>update());}}><fieldset disabled={busy||!asset.canEdit}><legend>Media details</legend>{Object.entries(fieldNames).map(([key,label])=><label key={key}>{label}{key==='description'||key==='alt'||key==='caption'?<textarea value={fields[key as keyof Fields]} onChange={event=>{setFields({...fields,[key]:event.target.value});setMetaDirty(true);}}/>:<input value={fields[key as keyof Fields]} onChange={event=>{setFields({...fields,[key]:event.target.value});setMetaDirty(true);}}/>}</label>)}<button disabled={!metaDirty}>Save media details</button></fieldset></form>
   <section aria-label="Usage rights"><h3>Usage rights</h3><p>Current status: {asset.rightsStatus}{asset.rightsExpiresAt?` · Expires ${new Date(asset.rightsExpiresAt).toLocaleString()}`:''}</p>{asset.canManageRights?<form onSubmit={event=>{event.preventDefault();if(status==='revoked'&&!window.confirm('Revoke these media rights? Affected CMS journey pages will become unavailable.'))return;run(()=>update(true));}}><fieldset disabled={busy}><label>Rights status<select value={status} onChange={event=>{setStatus(event.target.value);setRightsDirty(true);}}><option value="pending">Pending review</option><option value="approved">Approved</option><option value="revoked">Revoked</option></select></label><label>Rights evidence<textarea value={evidence} maxLength={5000} onChange={event=>{setEvidence(event.target.value);setRightsDirty(true);}}/></label><label>Rights expiry (ISO date and time, optional)<input placeholder="2027-12-31T23:59:00+05:30" value={expires} onChange={event=>{setExpires(event.target.value);setRightsDirty(true);}}/></label><button disabled={!rightsDirty}>Save usage rights</button></fieldset></form>:<p>Your account cannot change usage rights.</p>}</section>
   <section aria-label="Media usage"><h3>Where this asset is used</h3><button disabled={busy} onClick={()=>run(()=>loadUsage())}>Check usage</button>{usage&&<><p>{usage.length?'References visible to your account:':'No current draft or published references visible to your account. Active previews or restricted content may still prevent archiving.'}</p><ul>{usage.map(row=><li key={row.recordId}><strong>{row.title}</strong><p>{row.path||row.type} · {[row.draft?'Draft':'',row.published?'Published':''].filter(Boolean).join(' and ')}</p></li>)}</ul>{moreUsage&&<button disabled={busy} onClick={()=>run(()=>loadUsage(true))}>Load more references</button>}</>}</section>
   {asset.canArchive&&<button disabled={busy||dirty} onClick={()=>{if(window.confirm(asset.archivedAt?'Restore this asset to the library?':'Archive this asset? Assets in use cannot be archived.'))run(async()=>{await command('archive',{asset:asset.id,revision:asset.revision,archived:!asset.archivedAt});await select(asset.id);await list(applied);});}}>{asset.archivedAt?'Restore asset':'Archive asset'}</button>}
  </div>:<p>Select an asset to view its details.</p>}</div>
 </section>;
}
