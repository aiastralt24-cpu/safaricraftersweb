import {z} from 'zod';
import {createHash} from 'node:crypto';
import type {HeroVideoDispatchAdapter} from './hero-video-dispatch.ts';
import type {MalwareScanner} from './image-inspection.ts';
const keyPattern=/^[a-f0-9-]{36}\/[a-f0-9-]{36}\/(original|delivery\.mp4)$/;
/** Trusted worker only. Never construct this adapter in a browser or user-token API. */
export function createHeroVideoStorageAdapter(config:{url:string;serviceKey:string},scan:MalwareScanner,fetcher:typeof fetch=fetch):HeroVideoDispatchAdapter{
 const base=new URL(config.url);
 if(base.protocol!=='https:'||base.pathname!=='/'||base.search||base.hash||base.username||base.password||!config.serviceKey)throw Error('Invalid video worker configuration.');
 const headers={apikey:config.serviceKey,Authorization:`Bearer ${config.serviceKey}`};
 async function rpc(name:string,args:Record<string,unknown>){
  const response=await fetcher(new URL(`/rest/v1/rpc/${name}`,base),{method:'POST',headers:{...headers,'Content-Type':'application/json','Content-Profile':'cms','Accept-Profile':'cms'},body:JSON.stringify(args),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10_000)});
  if(!response.ok)throw Error('Video worker operation was not acknowledged.');
  return response.status===204?null:response.json();
 }
 function destination(key:string,delivery:boolean){
  if(!keyPattern.test(key)||!key.endsWith(delivery?'/delivery.mp4':'/original'))throw Error('Invalid video storage identity.');
  return new URL(`/storage/v1/object/${delivery?'cms-video-media':'cms-video-originals'}/${key}`,base);
 }
 async function read(key:string,expected:number,delivery=false){
  if(!Number.isSafeInteger(expected)||expected<1||expected>100_000_000)throw Error('Invalid video read bound.');
  const response=await fetcher(destination(key,delivery),{headers,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(120_000)});
  if(!response.ok||!response.body)throw Error('Private video is unavailable.');
  const reader=response.body.getReader();let length=0;const chunks:Uint8Array[]=[];
  try{
   const declared=response.headers.get('content-length');if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)!==expected))throw Error('Video size mismatch.');
   while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>expected)throw Error('Video exceeds read bound.');chunks.push(value);}
   if(length!==expected)throw Error('Video transfer is incomplete.');
   return Buffer.concat(chunks,length);
  }catch(error){void reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();}
 }
 return {
  scan,
  listWork:(limit)=>rpc('list_hero_video_work',{p_limit:limit}),
  async confirmOriginal(site,id){
   z.string().uuid().parse(site);z.string().uuid().parse(id);
   const raw=await rpc('get_hero_video_reception',{p_site:site,p_upload:id});
   if(raw===null)return 'not_reserved';
   const reception=z.object({id:z.literal(id),site:z.literal(site),key:z.literal(`${site}/${id}/original`),bytes:z.number().int().min(1).max(100_000_000),mime:z.literal('video/mp4')}).strict().parse(raw);
   const original=await read(reception.key,reception.bytes);
   const sha256=createHash('sha256').update(original).digest('hex');
   await rpc('confirm_upload',{p_site:site,p_upload:id,p_sha256:sha256,p_bytes:original.length});
   return 'confirmed';
  },
  claim:(site,id)=>rpc('claim_hero_video_upload',{p_site:site,p_upload:id}),
  read:(key,expected)=>read(key,expected),
  async putVerified(key,bytes,sha256,mime){
   if(mime!=='video/mp4'||bytes.length<1||bytes.length>100_000_000||createHash('sha256').update(bytes).digest('hex')!==sha256)throw Error('Invalid verified video.');
   const response=await fetcher(destination(key,true),{method:'POST',headers:{...headers,'Content-Type':mime,'Content-Length':String(bytes.length),'x-upsert':'false'},body:new Uint8Array(bytes),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(120_000)});
   if(!response.ok){let code='';try{code=(await response.json()).code;}catch{}if(response.status!==409&&code!=='Duplicate')throw Error('Video storage was not acknowledged.');}
   // Read back both new writes and duplicate retries. Never overwrite a differing object.
   const stored=await read(key,bytes.length,true);if(createHash('sha256').update(stored).digest('hex')!==sha256)throw Error('Stored video checksum mismatch.');
  },
  finish:(job,result)=>rpc('finish_hero_video_upload',{p_site:job.site,p_upload:job.id,p_token:job.leaseToken,p_result:result}),
  async fail(job,code,retryable){await rpc('fail_upload',{p_site:job.site,p_upload:job.id,p_token:job.leaseToken,p_code:code,p_retryable:retryable});},
 };
}
