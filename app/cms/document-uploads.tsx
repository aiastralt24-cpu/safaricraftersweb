'use client';
import {useEffect,useRef,useState} from 'react';
import {z} from 'zod';
const uploadSchema=z.object({id:z.string().uuid(),filename:z.string().min(5).max(200),status:z.enum(['reserved','uploaded','processing','ready','failed','rejected','cancelled','expired']),expectedBytes:z.number().int().min(1).max(25_000_000)}).passthrough();
type Upload=z.infer<typeof uploadSchema>;
type Api=(path:string,options?:RequestInit)=>Promise<any>;
const labels:Record<string,string>={reserved:'Waiting for transfer or verification',uploaded:'Queued for PDF processing',processing:'Inspecting PDF document',ready:'Processed · review usage rights in the Documents file picker',failed:'Processing failed · retry pending',rejected:'Rejected',cancelled:'Cancelled',expired:'Reservation expired'};
export function DocumentUploads({site,api,onUploading,disabled=false}:{site:string;api:Api;onUploading:(value:boolean)=>void;disabled?:boolean}){
 const [rows,setRows]=useState<Upload[]>([]),[enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[file,setFile]=useState<File|null>(null),[key,setKey]=useState(''),[reservation,setReservation]=useState<Upload|null>(null),[sent,setSent]=useState(false),[uncertain,setUncertain]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[inputKey,setInputKey]=useState(0);
 const alive=useRef(true),working=useRef(false),apiRef=useRef(api),sequence=useRef(0);apiRef.current=api;
 async function command(action:string,extra:Record<string,unknown>={}){return apiRef.current('/api/cms/document-uploads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,site,...extra})});}
 async function refresh(){const current=++sequence.current;const value=await command('list');if(alive.current&&current===sequence.current){const rows=z.array(uploadSchema).max(50).parse(value.result);if(new Set(rows.map(row=>row.id)).size!==rows.length)throw Error('PDF upload status is invalid. Refresh again.');setRows(rows);setEnabled(value.uploadsEnabled===true);}}
 useEffect(()=>{alive.current=true;void refresh().catch(reason=>{if(alive.current)setError(reason.message||'PDF status is unavailable.');});return()=>{alive.current=false;sequence.current++;onUploading(false);};},[site]); // eslint-disable-line react-hooks/exhaustive-deps
 async function task(work:()=>Promise<void>){if(working.current)return;working.current=true;setBusy(true);setError('');onUploading(true);try{await work();}catch(reason){if(alive.current)setError(reason instanceof Error?reason.message:'The PDF operation failed.');}finally{working.current=false;if(alive.current){setBusy(false);onUploading(false);}}}
 function reset(){setFile(null);setKey('');setReservation(null);setSent(false);setUncertain(false);setMessage('');setError('');setInputKey(v=>v+1);}
 async function check(){if(!reservation)return;const current=uploadSchema.parse((await command('status',{upload:reservation.id})).result);if(current.id!==reservation.id)throw Error('Upload identity changed. Refresh the list.');if(!alive.current)return;setReservation(current);setUncertain(false);if(current.status!=='reserved')setSent(true);setMessage(labels[current.status]||'Status unavailable');await refresh();}
 async function upload(){
  if(!enabled||!file||uncertain)return;
  if(file.name.length<5||file.name.length>200||file.name.startsWith('.')||!/\.pdf$/i.test(file.name)||/[\x00-\x1f\x7f/\\]/.test(file.name)||file.size<1||file.size>25_000_000)throw Error('Choose a PDF document up to 25 MB.');
  const current=reservation??uploadSchema.parse((await command('reserve',{requestKey:key,filename:file.name,mime:'application/pdf',bytes:file.size})).result);
  if(current.filename!==file.name||current.expectedBytes!==file.size)throw Error('Reservation does not match this PDF. Retry with the same request identity.');
  if(!alive.current)return;setReservation(current);
  if(current.status!=='reserved'){setSent(true);setMessage(labels[current.status]||'Check the existing upload status.');await refresh();return;}
  try{await apiRef.current('/api/cms/document-uploads/transfer',{method:'POST',headers:{'X-CMS-Site':site,'X-CMS-Upload':current.id,'Content-Type':'application/pdf'},body:file});}
  catch(reason){if(alive.current)setUncertain(true);throw reason;}
  if(!alive.current)return;setSent(true);setMessage('PDF transferred privately. Processing and usage-rights review are still required.');await refresh();
 }
 const locked=busy||disabled;
 return <section className='cms-media'><h2>PDF document uploads</h2><p>PDF · up to 25 MB. Processing checks the PDF; uploading does not publish it.</p>{!enabled&&<p>New PDF uploads are not enabled yet. You can still refresh existing uploads and cancel unused reservations.</p>}
 <label>Choose a PDF document<input key={inputKey} type='file' accept='.pdf,application/pdf' disabled={locked||!enabled||Boolean(reservation)} onChange={event=>{setFile(event.target.files?.[0]??null);setKey(crypto.randomUUID());setError('');}}/></label>
 <div className='cms-actions'><button disabled={locked||!enabled||!file||sent||uncertain} onClick={()=>void task(upload)}>{sent?(reservation&&['cancelled','expired','rejected'].includes(reservation.status)?'Upload closed':'PDF transferred'):reservation?'Retry PDF transfer':'Upload PDF privately'}</button>{reservation&&<button disabled={locked} onClick={()=>void task(check)}>Check this PDF status</button>}{(file||reservation)&&<button disabled={locked} onClick={reset}>Start another PDF</button>}</div>
 {uncertain&&<p role='status'>Transfer confirmation was lost. Check this PDF status before retrying. Existing files will not be overwritten.</p>}{message&&<p role='status'>{message}</p>}{error&&<p role='alert'>{error}</p>}
 <h3>Your recent PDFs</h3><button disabled={locked} onClick={()=>void task(refresh)}>Refresh PDF status</button><p>Latest 50 PDF uploads for your account.</p>{!rows.length?<p>No recent PDF uploads.</p>:<ul>{rows.map(row=><li key={row.id}><strong>{row.filename}</strong><p>{labels[row.status]||'Status unavailable'} · {(row.expectedBytes/1_000_000).toFixed(2)} MB</p>{row.status==='reserved'&&<button disabled={locked} onClick={()=>void task(async()=>{await command('cancel',{upload:row.id});if(!alive.current)return;if(reservation?.id===row.id)reset();await refresh();})}>Cancel PDF reservation</button>}</li>)}</ul>}
 </section>;
}
