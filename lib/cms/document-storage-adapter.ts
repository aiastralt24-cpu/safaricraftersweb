import {createHash} from 'node:crypto';
import type {DocumentProcessingAdapter} from './document-dispatch.ts';
import type {MalwareScanner} from './image-inspection.ts';
const keyPattern=/^[a-f0-9-]{36}\/[a-f0-9-]{36}\/(original|delivery\.pdf)$/;
/** Trusted worker only. Never construct this adapter in a browser or user-token API. */
export function createDocumentStorageAdapter(config:{url:string;serviceKey:string},scan:MalwareScanner,fetcher:typeof fetch=fetch):DocumentProcessingAdapter{
 const base=new URL(config.url);
 if(base.protocol!=='https:'||base.pathname!=='/'||base.search||base.hash||base.username||base.password||!config.serviceKey)throw Error('Invalid document worker configuration.');
 const headers={apikey:config.serviceKey,Authorization:`Bearer ${config.serviceKey}`};
 async function rpc(name:string,args:Record<string,unknown>){
  const response=await fetcher(new URL(`/rest/v1/rpc/${name}`,base),{method:'POST',headers:{...headers,'Content-Type':'application/json','Content-Profile':'cms','Accept-Profile':'cms'},body:JSON.stringify(args),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10_000)});
  if(!response.ok)throw Error('Document worker operation was not acknowledged.');
  return response.status===204?null:response.json();
 }
 function destination(key:string,delivery:boolean){
  if(!keyPattern.test(key)||!key.endsWith(delivery?'/delivery.pdf':'/original'))throw Error('Invalid document storage identity.');
  return new URL(`/storage/v1/object/${delivery?'cms-document-media':'cms-document-originals'}/${key}`,base);
 }
 async function read(key:string,expected:number,delivery=false){
  if(!Number.isSafeInteger(expected)||expected<1||expected>25_000_000)throw Error('Invalid document read bound.');
  const response=await fetcher(destination(key,delivery),{headers,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(120_000)});
  if(!response.ok||!response.body)throw Error('Private document is unavailable.');
  const reader=response.body.getReader();let length=0;const chunks:Uint8Array[]=[];
  try{
   const declared=response.headers.get('content-length');if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)!==expected))throw Error('Document size mismatch.');
   while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>expected)throw Error('Document exceeds read bound.');chunks.push(value);}
   if(length!==expected)throw Error('Document transfer is incomplete.');
   return Buffer.concat(chunks,length);
  }catch(error){void reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();}
 }
 return {
  scan,
  listWork:(limit)=>rpc('list_document_work',{p_limit:limit}),
  claim:(site,id)=>rpc('claim_document_upload',{p_site:site,p_upload:id}),
  read:(key,expected)=>read(key,expected),
  async putVerified(key,bytes,sha256,mime){
   if(mime!=='application/pdf'||bytes.length<1||bytes.length>25_000_000||createHash('sha256').update(bytes).digest('hex')!==sha256)throw Error('Invalid verified document.');
   const response=await fetcher(destination(key,true),{method:'POST',headers:{...headers,'Content-Type':mime,'Content-Length':String(bytes.length),'x-upsert':'false'},body:new Uint8Array(bytes),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(120_000)});
   if(!response.ok){let code='';try{code=(await response.json()).code;}catch{}if(response.status!==409&&code!=='Duplicate')throw Error('Document storage was not acknowledged.');}
   // Read back both new writes and duplicate retries. Never overwrite a differing object.
   const stored=await read(key,bytes.length,true);if(createHash('sha256').update(stored).digest('hex')!==sha256)throw Error('Stored document checksum mismatch.');
  },
  finish:(job,result)=>rpc('finish_document_upload',{p_site:job.site,p_upload:job.id,p_token:job.leaseToken,p_result:result}),
  async fail(job,code,retryable){await rpc('fail_upload',{p_site:job.site,p_upload:job.id,p_token:job.leaseToken,p_code:code,p_retryable:retryable});},
 };
}
