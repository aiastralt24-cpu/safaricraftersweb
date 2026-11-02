'use client';
import {useEffect,useRef,useState} from 'react';
type Upload={id:string;filename:string;status:string;expectedBytes:number};
type Api=(path:string,options?:RequestInit)=>Promise<any>;
const labels:Record<string,string>={reserved:'Waiting for transfer or verification',uploaded:'Queued for video processing',processing:'Processing silent background video',ready:'Processed · review usage rights in Media library',failed:'Processing failed · retry pending',rejected:'Rejected',cancelled:'Cancelled',expired:'Reservation expired'};
export function VideoUploads({site,api,onUploading,disabled=false}:{site:string;api:Api;onUploading:(value:boolean)=>void;disabled?:boolean}){
 const [rows,setRows]=useState<Upload[]>([]),[enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[file,setFile]=useState<File|null>(null),[key,setKey]=useState(''),[reservation,setReservation]=useState<Upload|null>(null),[sent,setSent]=useState(false),[uncertain,setUncertain]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[inputKey,setInputKey]=useState(0);
 const alive=useRef(true),working=useRef(false),apiRef=useRef(api),sequence=useRef(0);apiRef.current=api;
 async function command(action:string,extra:Record<string,unknown>={}){return apiRef.current('/api/cms/video-uploads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,site,...extra})});}
 async function refresh(){const current=++sequence.current;const value=await command('list');if(alive.current&&current===sequence.current){setRows(value.result);setEnabled(value.uploadsEnabled===true);}}
 useEffect(()=>{alive.current=true;void refresh().catch(reason=>{if(alive.current)setError(reason.message||'Video status is unavailable.');});return()=>{alive.current=false;sequence.current++;};},[site]); // eslint-disable-line react-hooks/exhaustive-deps
 async function task(work:()=>Promise<void>){if(working.current)return;working.current=true;setBusy(true);setError('');onUploading(true);try{await work();}catch(reason){if(alive.current)setError(reason instanceof Error?reason.message:'The video operation failed.');}finally{working.current=false;if(alive.current){setBusy(false);onUploading(false);}}}
 function reset(){setFile(null);setKey('');setReservation(null);setSent(false);setUncertain(false);setMessage('');setError('');setInputKey(v=>v+1);}
 async function check(){if(!reservation)return;const current=(await command('status',{upload:reservation.id})).result as Upload;if(!alive.current)return;setReservation(current);setUncertain(false);if(current.status!=='reserved')setSent(true);setMessage(labels[current.status]||'Status unavailable');await refresh();}
 async function upload(){
  if(!enabled||!file||uncertain)return;
  if(!/\.mp4$/i.test(file.name)||/[\x00-\x1f\x7f/\\]/.test(file.name)||file.size<1||file.size>100_000_000)throw Error('Choose an MP4 video up to 100 MB.');
  const current=reservation??(await command('reserve',{requestKey:key,filename:file.name,mime:'video/mp4',bytes:file.size})).result as Upload;
  if(!alive.current)return;setReservation(current);
  if(current.status!=='reserved'){setSent(true);setMessage(labels[current.status]||'Check the existing upload status.');await refresh();return;}
  try{await apiRef.current('/api/cms/video-uploads/transfer',{method:'POST',headers:{'X-CMS-Site':site,'X-CMS-Upload':current.id,'Content-Type':'video/mp4'},body:file});}
  catch(reason){if(alive.current)setUncertain(true);throw reason;}
  if(!alive.current)return;setSent(true);setMessage('Video transferred privately. Processing and usage-rights review are still required.');await refresh();
 }
 const locked=busy||disabled;
 return <section className='cms-media'><h2>Background video uploads</h2><p>MP4 · up to 100 MB and 3 minutes. Processing creates a silent background video; uploading does not publish it.</p>{!enabled&&<p>New video uploads are not enabled yet. You can still refresh existing uploads and cancel unused reservations.</p>}
 <label>Choose a background video<input key={inputKey} type='file' accept='.mp4,video/mp4' disabled={locked||!enabled||Boolean(reservation)} onChange={event=>{setFile(event.target.files?.[0]??null);setKey(crypto.randomUUID());setError('');}}/></label>
 <div className='cms-actions'><button disabled={locked||!enabled||!file||sent||uncertain} onClick={()=>void task(upload)}>{sent?(reservation&&['cancelled','expired','rejected'].includes(reservation.status)?'Upload closed':'Video transferred'):reservation?'Retry video transfer':'Upload video privately'}</button>{reservation&&<button disabled={locked} onClick={()=>void task(check)}>Check this video status</button>}{(file||reservation)&&<button disabled={locked} onClick={reset}>Start another video</button>}</div>
 {uncertain&&<p role='status'>Transfer confirmation was lost. Check this video status before retrying. Existing files will not be overwritten.</p>}{message&&<p role='status'>{message}</p>}{error&&<p role='alert'>{error}</p>}
 <h3>Your recent videos</h3><button disabled={locked} onClick={()=>void task(refresh)}>Refresh video status</button><p>Latest 50 video uploads for your account.</p>{!rows.length?<p>No recent video uploads.</p>:<ul>{rows.map(row=><li key={row.id}><strong>{row.filename}</strong><p>{labels[row.status]||'Status unavailable'} · {(row.expectedBytes/1_000_000).toFixed(2)} MB</p>{row.status==='reserved'&&<button disabled={locked} onClick={()=>void task(async()=>{await command('cancel',{upload:row.id});if(!alive.current)return;if(reservation?.id===row.id)reset();await refresh();})}>Cancel video reservation</button>}</li>)}</ul>}
 </section>;
}
