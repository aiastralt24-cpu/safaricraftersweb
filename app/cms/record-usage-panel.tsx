'use client';
import {useEffect,useRef,useState} from 'react';
import {z} from 'zod';
const item=z.object({recordId:z.string().uuid(),title:z.string(),type:z.string(),path:z.string().nullable(),locale:z.string(),draft:z.boolean(),published:z.boolean()}).strict();
const response=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),items:z.array(item).max(50),nextCursor:z.string().uuid().nullable()}).strict();
type Item=z.infer<typeof item>;
/** Key by account/site/record/revision: results are a read-time snapshot, not approval. */
export function RecordUsagePanel({site,record,revision,api,disabled}:{site:string;record:string;revision:string;api:(path:string,options?:RequestInit)=>Promise<any>;disabled:boolean}){
 const [items,setItems]=useState<Item[]|null>(null),[next,setNext]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const active=useRef<AbortController|null>(null);
 useEffect(()=>()=>active.current?.abort(),[]);
 async function load(after:string|null){
  active.current?.abort();const request=new AbortController();active.current=request;setBusy(true);setError('');
  if(!after){setItems(null);setNext(null);}
  try{
   const raw=await api('/api/cms/references',{method:'POST',signal:request.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'usage',site,record,revision,after})});
   if(request.signal.aborted)return;const result=response.parse(raw.result);
   if(result.recordId!==record||result.revisionId!==revision||result.items.some((row,i)=>row.recordId<= (i?result.items[i-1].recordId:after??'')||(!row.draft&&!row.published))||result.nextCursor!==null&&(result.items.length!==50||result.nextCursor!==result.items.at(-1)?.recordId))throw Error('Usage results do not match this saved record. Refresh and try again.');
   setItems(previous=>after?[...(previous??[]),...result.items]:result.items);setNext(result.nextCursor);
  }catch(reason){if(!request.signal.aborted)setError(reason instanceof Error&&!(reason instanceof z.ZodError)?reason.message:'Usage results are unavailable. Try again.');}
  finally{if(!request.signal.aborted)setBusy(false);}
 }
 return <section className='cms-record-usage' aria-label='Where this content is used'><h3>Where this content is used</h3>
  <p>Review direct content references before publishing or withdrawing. Results include only records you can view. Links, global settings and dynamically selected content are not included.</p>
  <button type='button' disabled={disabled||busy} onClick={()=>void load(null)}>{busy?'Checking usage…':items?'Refresh content usage':'Check content usage'}</button>
  {error&&<p role='alert'>{error}</p>}{items&&<><p role='status'>{items.length?`${items.length} visible referencing records loaded.`:'No direct references found among records you can view.'} Other editors can change references; refresh before making a release decision.</p><ul>{items.map(row=><li key={row.recordId}><strong>{row.title}</strong> · {row.type} · {row.locale}{row.path&&<> · {row.path}</>}<p>{row.draft&&row.published?'Used in current draft and published content':row.published?'Used in published content only':'Used in current draft only'}</p></li>)}</ul>{next&&<button type='button' disabled={disabled||busy} onClick={()=>void load(next)}>Load more content usage</button>}</>}
 </section>;
}
