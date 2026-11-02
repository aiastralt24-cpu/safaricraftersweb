import {createHash} from 'node:crypto';
import type {EnquiryFileDispatchAdapter} from './enquiry-file-dispatch.ts';
import {enquiryFileScopeSchema} from './enquiry-file-worker.ts';
import {z} from 'zod';
import type {EnquiryFileTransfer} from './enquiry-file-transfer.ts';
import type {MalwareScanner} from './image-inspection.ts';
const uuid=z.string().uuid();
/** Trusted worker only. Never construct this adapter in a browser or user-token API. */
export function createEnquiryFileStorageAdapter(config:{url:string;serviceKey:string;site:string},scan:MalwareScanner,fetcher:typeof fetch=fetch):EnquiryFileDispatchAdapter & {putOriginal(transfer:EnquiryFileTransfer,bytes:Buffer):Promise<void>}{
 const base=new URL(config.url);
 if(base.protocol!=='https:'||base.pathname!=='/'||base.search||base.hash||base.username||base.password||!config.serviceKey||/[\r\n]/.test(config.serviceKey)||!uuid.safeParse(config.site).success)throw Error('Invalid attachment worker configuration.');
 const headers={apikey:config.serviceKey,Authorization:`Bearer ${config.serviceKey}`};
 async function rpc(name:string,args:Record<string,unknown>){
  const response=await fetcher(new URL(`/rest/v1/rpc/${name}`,base),{method:'POST',headers:{...headers,'Content-Type':'application/json','Content-Profile':'cms','Accept-Profile':'cms'},body:JSON.stringify(args),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10_000)});
  if(!response.ok)throw Error('Attachment worker operation was not acknowledged.');
  return response.status===204?null:response.json();
 }
 function destination(key:string,delivery:boolean){
  const parts=key.split('/');
  if(parts.length!==5||parts[0]!==config.site||parts[1]!=='enquiries'||!uuid.safeParse(parts[2]).success||!uuid.safeParse(parts[3]).success||!(delivery?['delivery.pdf','delivery.webp']:['original']).includes(parts[4]))throw Error('Invalid attachment storage identity.');
  return new URL(`/storage/v1/object/cms-enquiry-files/${key}`,base);
 }
 async function read(key:string,expected:number,delivery=false,timeout=120_000){
  if(!Number.isSafeInteger(expected)||expected<1||expected>25_000_000)throw Error('Invalid attachment read bound.');
  const response=await fetcher(destination(key,delivery),{headers,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(timeout)});
  if(!response.ok||!response.body)throw Error('Private attachment is unavailable.');
  const reader=response.body.getReader();let length=0;const chunks:Uint8Array[]=[];
  try{
   const declared=response.headers.get('content-length');if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)!==expected))throw Error('Attachment size mismatch.');
   while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>expected)throw Error('Attachment exceeds read bound.');chunks.push(value);}
   if(length!==expected)throw Error('Attachment transfer is incomplete.');
   return Buffer.concat(chunks,length);
  }catch(error){void reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();}
 }
 function checkJob(job:{site:string;id:string;leaseToken:string}){if(job.site!==config.site||!uuid.safeParse(job.id).success||!uuid.safeParse(job.leaseToken).success)throw Error('Attachment lease identity mismatch.');}
 return {
  scan,
  listWork:limit=>{if(!Number.isInteger(limit)||limit<1||limit>20)throw Error('Invalid attachment batch size.');return rpc('list_enquiry_file_work',{p_site:config.site,p_limit:limit});},
  claim:(scope,id)=>{enquiryFileScopeSchema.parse(scope);uuid.parse(id);if(scope.site!==config.site)throw Error('Attachment website mismatch.');return rpc('claim_enquiry_file',{p_site:scope.site,p_upload:id});},
  read:(key,expected)=>read(key,expected,false,30_000),
  async putOriginal(transfer,bytes){
   if(transfer.site!==config.site||transfer.storageKey!==`${transfer.site}/enquiries/${transfer.request}/${transfer.id}/original`||!['application/pdf','image/jpeg','image/png'].includes(transfer.mime)||bytes.length!==transfer.bytes||bytes.length<1||bytes.length>25000000||createHash('sha256').update(bytes).digest('hex')!==transfer.sha256)throw Error('Invalid original attachment.');
   const response=await fetcher(destination(transfer.storageKey,false),{method:'POST',headers:{...headers,'Content-Type':transfer.mime,'Content-Length':String(bytes.length),'x-upsert':'false'},body:new Uint8Array(bytes),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(120_000)});
   if(!response.ok){let code='';try{code=(await response.json()).code;}catch{}if(response.status!==409&&code!=='Duplicate')throw Error('Attachment storage was not acknowledged.');}
   const stored=await read(transfer.storageKey,bytes.length);if(createHash('sha256').update(stored).digest('hex')!==transfer.sha256)throw Error('Stored attachment checksum mismatch.');
  },
  async putVerified(key,bytes,sha256,mime){
   if(!((mime==='application/pdf'&&key.endsWith('/delivery.pdf'))||(mime==='image/webp'&&key.endsWith('/delivery.webp')))||bytes.length<1||bytes.length>25_000_000||createHash('sha256').update(bytes).digest('hex')!==sha256)throw Error('Invalid verified attachment.');
   const response=await fetcher(destination(key,true),{method:'POST',headers:{...headers,'Content-Type':mime,'Content-Length':String(bytes.length),'x-upsert':'false'},body:new Uint8Array(bytes),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(30_000)});
   if(!response.ok){let code='';try{code=(await response.json()).code;}catch{}if(response.status!==409&&code!=='Duplicate')throw Error('Attachment storage was not acknowledged.');}
   // Read back both new writes and duplicate retries. Never overwrite a differing object.
   const stored=await read(key,bytes.length,true,30_000);if(createHash('sha256').update(stored).digest('hex')!==sha256)throw Error('Stored attachment checksum mismatch.');
  },
  async finish(job,result){checkJob(job);const value=await rpc('finish_enquiry_file',{p_site:job.site,p_upload:job.id,p_token:job.leaseToken,p_result:result});if(value!==job.id)throw Error('Attachment completion identity mismatch.');return value;},
  async fail(job,code,retryable){checkJob(job);await rpc('fail_enquiry_file',{p_site:job.site,p_upload:job.id,p_token:job.leaseToken,p_code:code,p_retryable:retryable});},
 };
}
