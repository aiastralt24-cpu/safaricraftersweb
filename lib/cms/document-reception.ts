import {z} from 'zod';
import {createHash} from 'node:crypto';
const uuid=z.string().uuid();
const jobs=z.array(z.object({site:uuid,id:uuid}).strict()).max(20);
export type DocumentReceptionAdapter={list(limit:number):Promise<unknown>;confirm(site:string,id:string):Promise<'confirmed'|'not_reserved'>};
/** Trusted worker only: reception proves stored byte identity, not PDF validity. */
export function createDocumentReceptionAdapter(config:{url:string;serviceKey:string},fetcher:typeof fetch=fetch):DocumentReceptionAdapter{
 const base=new URL(config.url);
 if(base.protocol!=='https:'||base.pathname!=='/'||base.search||base.hash||base.username||base.password||!config.serviceKey)throw Error('Invalid document worker configuration.');
 const headers={apikey:config.serviceKey,Authorization:`Bearer ${config.serviceKey}`};
 async function rpc(name:string,args:Record<string,unknown>){
  const response=await fetcher(new URL(`/rest/v1/rpc/${name}`,base),{method:'POST',headers:{...headers,'Content-Type':'application/json','Content-Profile':'cms','Accept-Profile':'cms'},body:JSON.stringify(args),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('Document reception was not acknowledged.');
  return response.status===204?null:response.json();
 }
 return {
  list:limit=>rpc('list_document_receptions',{p_limit:limit}),
  async confirm(site,id){
   uuid.parse(site);uuid.parse(id);
   const raw=await rpc('get_document_reception',{p_site:site,p_upload:id});
   if(raw===null)return 'not_reserved';
   const descriptor=z.object({site:z.literal(site),id:z.literal(id),key:z.literal(`${site}/${id}/original`),mime:z.literal('application/pdf'),bytes:z.number().int().min(1).max(25000000)}).strict().parse(raw);
   const response=await fetcher(new URL(`/storage/v1/object/cms-document-originals/${descriptor.key}`,base),{headers,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(120000)});
   if(!response.ok||!response.body)throw Error('Private document is unavailable.');
   const reader=response.body.getReader(),hash=createHash('sha256');let length=0;
   try{
    const declared=response.headers.get('content-length');
    if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)!==descriptor.bytes))throw Error('Document size mismatch.');
    while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>descriptor.bytes)throw Error('Document exceeds read bound.');hash.update(value);}
    if(length!==descriptor.bytes)throw Error('Document transfer is incomplete.');
   }catch(error){void reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();}
   await rpc('confirm_upload',{p_site:site,p_upload:id,p_sha256:hash.digest('hex'),p_bytes:length});
   return 'confirmed';
  },
 };
}
/** Discovery is advisory. Confirmation locks the reservation and rechecks expiry.
 * Unacknowledged writes are rediscovered, never converted into a failure state. */
export async function receiveDocuments(adapter:DocumentReceptionAdapter,limit=5){
 if(!Number.isInteger(limit)||limit<1||limit>20)throw Error('Invalid document reception batch size.');
 const work=jobs.parse(await adapter.list(limit));
 if(work.length>limit||new Set(work.map(job=>`${job.site}/${job.id}`)).size!==work.length)throw Error('Invalid document reception batch.');
 const results=[];
 for(const job of work){try{results.push({...job,status:await adapter.confirm(job.site,job.id)});}catch{results.push({...job,status:'unacknowledged' as const});}}
 return results;
}
