import {createHash} from 'node:crypto';
import {inspectImage,ImageInspectionError} from './image-inspection.ts';
import type {MalwareScanner} from './image-inspection.ts';
export type UploadJob={id:string;site:string;filename:string;mime:string;bytes:number;sha256:string;storageKey:string;deliveryKey:string;leaseToken:string};
export type UploadAdapter={
 claim(site:string,id:string):Promise<UploadJob|null>;
 /** Bounded private read; refuse objects larger than expected bytes. */
 read(key:string,maxBytes:number):Promise<Uint8Array>;
 scan:MalwareScanner;
 /** Immutable write with checksum verification; identical retries may succeed,
  * but existing different bytes must never be overwritten. */
 putVerified(key:string,bytes:Buffer,sha256:string,mime:string):Promise<void>;
 finish(job:UploadJob,result:Record<string,unknown>):Promise<string>;
 fail(job:UploadJob,code:string,retryable:boolean):Promise<void>;
};
export async function processUpload(adapter:UploadAdapter,site:string,id:string){
 const job=await adapter.claim(site,id);if(!job)return {status:'not_claimed' as const};
 if(job.id!==id||job.site!==site||job.storageKey!==`${site}/${id}/original`||job.deliveryKey!==`${site}/${id}/delivery.webp`)
  throw new Error('Upload job identity mismatch.');
 let phase='read';
 try{
  const bytes=await adapter.read(job.storageKey,job.bytes);
  if(bytes.byteLength!==job.bytes||createHash('sha256').update(bytes).digest('hex')!==job.sha256)throw new ImageInspectionError('bytes_mismatch','Upload bytes changed.');
  phase='inspect';const result=await inspectImage({bytes,filename:job.filename,mime:job.mime},adapter.scan);
  phase='store';await adapter.putVerified(job.deliveryKey,result.delivery.bytes,result.delivery.sha256,result.delivery.mime);
  phase='finish';const assetId=await adapter.finish(job,{originalSha256:result.original.sha256,sha256:result.delivery.sha256,bytes:result.delivery.byteSize,width:result.delivery.width,height:result.delivery.height,inspectionVersion:result.inspectionVersion});
  return {status:'ready' as const,assetId};
 }catch(error){
  // A lost acknowledgement may already have committed. Leave recovery to the
  // durable state instead of recording a contradictory failure.
  if(phase==='finish')return {status:'unacknowledged' as const};
  const code=error instanceof ImageInspectionError?(error.code==='scan_unavailable'?'scan_unavailable':error.code==='bytes_mismatch'?'bytes_mismatch':'inspection_rejected'):'storage_unavailable';
  const retryable=code==='scan_unavailable'||code==='storage_unavailable';
  try{await adapter.fail(job,code,retryable);}catch{return {status:'unacknowledged' as const};}
  return {status:retryable?'retry_pending' as const:'rejected' as const};
 }
}
