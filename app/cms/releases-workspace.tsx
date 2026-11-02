'use client';
import {useEffect,useRef,useState} from 'react';
import {z} from 'zod';
import {ScheduledReleaseForm} from './scheduled-release-form';
import {ScheduledReleaseList} from './scheduled-release-list';
import {ReleaseDeliveryPanel} from './release-delivery-panel';
import {readPendingRelease,submitRecoverableRelease,cancelRecoverableRelease,type PendingRelease} from '../../lib/cms/publication-release-recovery';
import {analyzeReleaseDependencies} from '../../lib/cms/release-dependencies';
import type {ReleaseManifest} from '../../lib/cms/publication-release';
const rowSchema=z.object({id:z.string().uuid(),title:z.string(),type:z.string(),currentRevision:z.string().uuid(),reviewStatus:z.string(),canPublish:z.boolean()}).passthrough();
type Row=z.infer<typeof rowSchema>;
type Props={site:string;actor:string;api:(path:string,options?:RequestInit)=>Promise<any>;onDirty:(value:boolean)=>void};
export function ReleasesWorkspace({site,actor,api,onDirty}:Props){
 const [rows,setRows]=useState<Row[]>([]),[selected,setSelected]=useState<Row[]>([]),[more,setMore]=useState(false),[busy,setBusy]=useState(false),[pending,setPending]=useState<PendingRelease|null>(null),[message,setMessage]=useState(''),[ready,setReady]=useState(false),[ack,setAck]=useState(false),[storageError,setStorageError]=useState(false),[analysis,setAnalysis]=useState<ReturnType<typeof analyzeReleaseDependencies>|null>(null);
 const [lastRequest,setLastRequest]=useState<string|null>(null);
 const apiRef=useRef(api);apiRef.current=api;const alive=useRef(true);
 useEffect(()=>{alive.current=true;try{setPending(readPendingRelease(localStorage,actor,site));}catch(e){setStorageError(true);setMessage(String(e));}return()=>{alive.current=false;};},[actor,site]);
 useEffect(()=>onDirty(selected.length>0&&!pending),[selected,pending,onDirty]);
 async function run(work:()=>Promise<void>){if(busy)return;setBusy(true);setMessage('');try{await work();}catch(e){if(alive.current)setMessage(e instanceof Error?e.message:'Release request failed.');}finally{if(alive.current)setBusy(false);}}
 async function load(append=false){const data=await apiRef.current(`/api/cms/content?site=${site}&limit=50${append&&rows.length?`&after=${rows.at(-1)!.id}`:''}`);const next=z.array(rowSchema).max(50).parse(data.records);if(alive.current){setRows(old=>append?[...old,...next]:next);setMore(next.length===50);}}
 function change(next:Row[]){setSelected(next);setReady(false);setAck(false);setAnalysis(null);}
 async function review(){setReady(false);setAck(false);setAnalysis(null);const inputs:{id:string;payload:unknown;path:string|null;locale:string}[]=[];for(const item of selected){
  const {record}=await apiRef.current(`/api/cms/content?site=${site}&record=${item.id}`);
  if(!record||record.id!==item.id||record.currentRevision!==item.currentRevision||record.approvedRevision!==item.currentRevision||record.reviewStatus!=='approved'||record.permissions?.publish!==true)throw Error(`${item.title}: reload and approve the current revision before release.`);
  inputs.push({id:record.id,payload:record.payload,path:record.path,locale:record.locale});
  const {result}=await apiRef.current('/api/cms/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'validation_status',site,record:item.id,revision:item.currentRevision})});
  if(result?.revision!==item.currentRevision||result.valid!==true||!result.expiresAt||!Number.isFinite(Date.parse(result.expiresAt))||Date.parse(result.expiresAt)<=Date.now())throw Error(`${item.title}: run trusted validation in its editor before release.`);
 }const dependencies=analyzeReleaseDependencies(inputs);if(alive.current){setAnalysis(dependencies);setReady(true);setMessage('Every selected revision is approved and currently validated. Review the order before publishing.');}}
 async function submit(manifest:ReleaseManifest){
  try{
   const receipt=await submitRecoverableRelease({storage:localStorage,locks:navigator.locks,actor,manifest,now:()=>new Date(),send:input=>apiRef.current('/api/cms/releases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)})});
   if(alive.current){setLastRequest(manifest.request);setPending(null);setSelected([]);setReady(false);setAck(false);setMessage(`Release ${receipt.release} confirmed. Cache delivery is not yet verified.`);}
  }finally{if(alive.current){try{setPending(readPendingRelease(localStorage,actor,site));}catch{setStorageError(true);}}}
 }
 return <section className='cms-settings'><h2>Coordinated releases</h2><p>Publish approved records together. Place referenced records before pages or menus that use them. If any publication check fails, the entire database release rolls back.</p>
 {message&&<p role='status'>{message}</p>}<ReleaseDeliveryPanel key={`${actor}:${site}:${lastRequest??pending?.manifest.request??'lookup'}`} site={site} actor={actor} initialRequest={lastRequest??pending?.manifest.request??null} disabled={busy} api={api}/>
 <ScheduledReleaseForm key={`schedule:${actor}:${site}`} site={site} actor={actor} items={selected.map(row=>({record:row.id,revision:row.currentRevision}))} ready={ready&&ack&&!pending&&!storageError} disabled={busy} api={api} onBusy={setBusy} onComplete={request=>{setLastRequest(request);setSelected([]);setReady(false);setAck(false);}}/>
 <ScheduledReleaseList onInspectDelivery={setLastRequest} key={`${actor}:${site}`} site={site} disabled={busy} api={api}/>
 {pending?<section><h3>Unconfirmed release</h3><p>An earlier request may have committed. Recover it using its original revision list; do not start a replacement.</p><ol>{pending.manifest.items.map(item=><li key={item.record}>{item.record} · revision {item.revision}</li>)}</ol><button disabled={busy||storageError} onClick={()=>run(()=>submit(pending.manifest))}>Recover release result</button><button disabled={busy||storageError} onClick={()=>{if(window.confirm('Cancel this request if it has not committed? Already published content will remain live.'))void run(async()=>{const outcome=await cancelRecoverableRelease({storage:localStorage,locks:navigator.locks,actor,site,send:manifest=>apiRef.current('/api/cms/releases/cancel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(manifest)})});if(alive.current){setLastRequest(pending.manifest.request);setPending(null);setSelected([]);setReady(false);setAck(false);setMessage(outcome.status==='cancelled'?'Request cancelled. You can prepare a new release.':'The release already committed. Nothing was withdrawn; cache delivery remains unverified.');}});}}>Cancel uncommitted request</button></section>:<>
 <button disabled={busy||storageError} onClick={()=>run(()=>load())}>Load available records</button>
 <div aria-label='Available release records'>{rows.map(row=><div key={row.id}><span>{row.title} · {row.type} · {row.reviewStatus.replaceAll('_',' ')}</span><button disabled={busy||storageError||!row.canPublish||row.reviewStatus!=='approved'||selected.some(item=>item.id===row.id)||selected.length>=50} onClick={()=>change([...selected,row])}>Add {row.title}</button></div>)}</div>
 {more&&<button disabled={busy} onClick={()=>run(()=>load(true))}>Load more records</button>}
 <h3>Release order</h3><ol>{selected.map((item,index)=><li key={item.id}><strong>{item.title}</strong><p>Revision {item.currentRevision}</p><button aria-label={`Move ${item.title} earlier`} disabled={busy||index===0} onClick={()=>{const next=[...selected];[next[index-1],next[index]]=[next[index],next[index-1]];change(next);}}>Move earlier</button><button disabled={busy} onClick={()=>change(selected.filter(row=>row.id!==item.id))}>Remove {item.title}</button></li>)}</ol>
 <button disabled={busy||!selected.length||storageError} onClick={()=>run(review)}>Check release readiness</button>{analysis&&<section aria-label='Release dependencies'><h3>Selected release dependencies</h3><p>This checks explicit record references and exact internal links between selected pages in the same language. Dynamic collections and shared impact still require separate validation.</p>{analysis.externalLinks.length>0&&<p>{analysis.externalLinks.length} internal links point outside the selected pages. This check does not confirm their availability.</p>}{analysis.external.length>0&&<p>{analysis.external.length} references point outside this release. Their current published versions must remain available.</p>}{analysis.order?<button disabled={busy} onClick={()=>{const order=analysis.order!;setSelected(order.map(id=>selected.find(row=>row.id.toLowerCase()===id)!));setAck(false);}}>Apply suggested dependency order</button>:<p>References form a cycle or depend on one. No automatic order is available. Review these relationships manually; the server will still enforce publication checks.</p>}</section>}
 {ready&&<><p>Readiness can change. The server rechecks permissions, approval and validation at publication. Dependency ordering is manual; unsupported cycles will block the release.</p><label><input type='checkbox' checked={ack} disabled={busy} onChange={e=>setAck(e.target.checked)}/>I reviewed these revisions and their dependency order.</label><button disabled={busy||!ack||storageError} onClick={()=>{if(window.confirm(`Publish these ${selected.length} approved revisions together?`))void run(()=>submit({site,request:crypto.randomUUID(),items:selected.map(row=>({record:row.id,revision:row.currentRevision}))}));}}>Publish release</button></>}
 </>}
 </section>;
}
