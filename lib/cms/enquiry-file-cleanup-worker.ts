import {z} from 'zod';
const uuid=z.string().uuid();
const jobSchema=z.object({site:uuid,upload:uuid,request:uuid,leaseToken:uuid,policyVersion:z.number().int().positive(),category:z.enum(['submitted','abandoned']),keys:z.tuple([z.string(),z.string()])}).strict();
export type EnquiryFileCleanupJob=z.infer<typeof jobSchema>;
export type EnquiryFileCleanupAdapter={claim:(site:string,upload:string)=>Promise<unknown>;remove:(key:string)=>Promise<void>;missing:(key:string)=>Promise<boolean>;finish:(job:EnquiryFileCleanupJob)=>Promise<unknown>;fail:(job:EnquiryFileCleanupJob)=>Promise<void>};
/** Only the database can commit a deletion intent. The adapter must scope storage
 * to its configured website/bucket and treat network errors as unknown, not absent. */
export async function processEnquiryFileCleanup(adapter:EnquiryFileCleanupAdapter,site:string,upload:string){
 uuid.parse(site);uuid.parse(upload);const raw=await adapter.claim(site,upload);if(raw===null)return {status:'idle' as const};
 const job=checkEnquiryFileCleanupJob(raw,site,upload);
 let finishing=false;
 try{
  for(const key of job.keys)await adapter.remove(key);
  for(const key of job.keys)if(!await adapter.missing(key))throw Error('Cleanup deletion is unconfirmed.');
  finishing=true;const receipt=uuid.parse(await adapter.finish(job));if(receipt!==upload)throw Error('Cleanup receipt mismatch.');
  return {status:'deleted' as const,upload};
 }catch{
  // A lost final acknowledgement may follow a committed completion. Never send
  // a competing failure update; database discovery/reclaim resolves it later.
  if(finishing)return {status:'unacknowledged' as const,upload};
  try{await adapter.fail(job);return {status:'retry' as const,upload};}catch{return {status:'unacknowledged' as const,upload};}
 }
}

export function checkEnquiryFileCleanupJob(input:unknown,site:string,upload:string){
 const job=jobSchema.parse(input),base=`${site}/enquiries/${job.request}/${upload}`;
 if(job.site!==site||job.upload!==upload||job.keys[0]!==`${base}/original`||![`${base}/delivery.pdf`,`${base}/delivery.webp`].includes(job.keys[1]))throw Error('Cleanup job identity mismatch.');return job;
}
