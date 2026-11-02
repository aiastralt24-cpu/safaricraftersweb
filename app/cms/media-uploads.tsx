'use client';
import {useEffect,useRef,useState} from 'react';
type Upload={id:string;filename:string;status:string;expectedBytes:number;createdAt?:string;errorCode?:string|null};
type Api=(path:string,options?:RequestInit)=>Promise<any>;
const statusLabels:Record<string,string>={reserved:'Waiting for transfer or verification',uploaded:'Queued for inspection',processing:'Inspecting image',ready:'Processed · check usage rights before publishing',failed:'Processing failed · retry pending',rejected:'Rejected',cancelled:'Cancelled',expired:'Reservation expired'};
const mimeByExtension:Record<string,string>={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',avif:'image/avif'};
export function MediaUploads({site,api,onUploading,disabled=false}:{site:string;api:Api;onUploading:(value:boolean)=>void;disabled?:boolean}){
 const [file,setFile]=useState<File|null>(null),[key,setKey]=useState(''),[rows,setRows]=useState<Upload[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const [reservation,setReservation]=useState<Upload|null>(null),[transferred,setTransferred]=useState(false),[inputKey,setInputKey]=useState(0);
 const alive=useRef(true),apiRef=useRef(api),refreshSequence=useRef(0);apiRef.current=api;
 async function command(action:string,extra:Record<string,unknown>={}){return apiRef.current('/api/cms/uploads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,site,...extra})});}
 async function refresh(){const sequence=++refreshSequence.current;const result=await command('list');if(alive.current&&sequence===refreshSequence.current)setRows(result.result);}
 useEffect(()=>{alive.current=true;refresh().catch(reason=>{if(alive.current)setError(reason instanceof Error?reason.message:'Uploads could not be loaded.');});return()=>{alive.current=false;};},[site]); // eslint-disable-line react-hooks/exhaustive-deps
 async function task(work:()=>Promise<void>){setBusy(true);setError('');try{await work();}catch(reason){if(alive.current)setError(reason instanceof Error?reason.message:'Upload could not be completed.');}finally{if(alive.current)setBusy(false);}}
 async function upload(){
  if(!file)return;
  const mime=mimeByExtension[file.name.split('.').at(-1)?.toLowerCase()||''];
  if(!mime||file.size<1||file.size>25_000_000)throw new Error('Choose a JPEG, PNG, WebP or AVIF image up to 25 MB.');
  onUploading(true);
  try{
   const saved=reservation??(await command('reserve',{requestKey:key,filename:file.name,mime,bytes:file.size})).result as Upload;
   if(!alive.current)return;setReservation(saved);
   if(saved.status!=='reserved')throw new Error('This reservation cannot receive a file. Start a new upload.');
   await apiRef.current('/api/cms/uploads/transfer',{method:'POST',headers:{'X-CMS-Site':site,'X-CMS-Upload':saved.id,'Content-Type':mime},body:file});
   if(alive.current){setTransferred(true);setMessage('File transferred privately. Inspection and rights approval are still required.');}
   await refresh();
  }finally{onUploading(false);}
 }
 function reset(){setFile(null);setKey('');setReservation(null);setTransferred(false);setMessage('');setError('');setInputKey(value=>value+1);}
 return <section className="cms-media"><h2>Image uploads</h2><p>Upload original images privately. Processing does not publish an image or approve its usage rights.</p>
  <label>Choose an image<input key={inputKey} type="file" accept=".jpg,.jpeg,.png,.webp,.avif" disabled={disabled||busy||Boolean(reservation)} onChange={event=>{setFile(event.target.files?.[0]??null);setKey(crypto.randomUUID());setError('');setMessage('');}}/></label><small>JPEG, PNG, WebP or AVIF · up to 25 MB</small>
  <div className="cms-actions"><button className="primary" disabled={disabled||busy||!file||transferred} onClick={()=>task(upload)}>{busy?'Working…':transferred?'File transferred':reservation?'Retry file transfer':'Upload privately'}</button>{(file||reservation)&&<button disabled={disabled||busy} onClick={reset}>Start another upload</button>}</div>
  {message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}
  <div className="cms-actions"><h3>Your recent uploads</h3><button disabled={disabled||busy} onClick={()=>task(refresh)}>Refresh status</button></div>
  <p>Latest 50 uploads for your account. Refresh to check processing progress.</p>
  {!rows.length?<p>No recent uploads.</p>:<ul className="cms-upload-list">{rows.map(row=><li key={row.id}><div><strong>{row.filename}</strong><p>{statusLabels[row.status]||'Status unavailable'}</p><small>{(row.expectedBytes/1_000_000).toFixed(2)} MB{row.createdAt?` · ${new Date(row.createdAt).toLocaleString()}`:''}</small></div>{row.status==='reserved'&&<button disabled={disabled||busy} onClick={()=>task(async()=>{await command('cancel',{upload:row.id});if(reservation?.id===row.id)reset();await refresh();})}>Cancel reservation</button>}</li>)}</ul>}
 </section>;
}
