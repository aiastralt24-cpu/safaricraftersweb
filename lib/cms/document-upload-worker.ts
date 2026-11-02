import {createHash} from 'node:crypto';
import {z} from 'zod';
import {inspectDocument} from './document-inspection.ts';
import type {DocumentRuntime} from './document-inspection.ts';
import {DocumentInspectionError} from './document-inspection.ts';
import type {UploadAdapter} from './upload-worker.ts';
const uuid=z.string().uuid();
const claimed=z.object({id:uuid,site:uuid,filename:z.string(),mime:z.literal('application/pdf'),bytes:z.number().int().min(1).max(25_000_000),sha256:z.string().regex(/^[a-f0-9]{64}$/),storageKey:z.string(),deliveryKey:z.string(),leaseToken:uuid}).strict();
/** Adapter must claim/finish with the document-specific RPCs and use private document
 * storage. The image worker never handles these jobs. Lost acknowledgements are
 * resolved from durable upload status, never by recording a competing failure. */
export async function processDocumentUpload(adapter:UploadAdapter,site:string,id:string,runtime:DocumentRuntime){
 uuid.parse(site);uuid.parse(id);const raw=await adapter.claim(site,id);if(!raw)return {status:'not_claimed' as const};
 const parsed=claimed.safeParse(raw);
 if(!parsed.success||parsed.data.id!==id||parsed.data.site!==site||parsed.data.storageKey!==`${site}/${id}/original`||parsed.data.deliveryKey!==`${site}/${id}/delivery.pdf`)throw Error('Document upload job identity mismatch.');
 const job=parsed.data;let phase='read';
 try{
  const bytes=await adapter.read(job.storageKey,job.bytes);
  if(bytes.byteLength!==job.bytes||createHash('sha256').update(bytes).digest('hex')!==job.sha256)throw new DocumentInspectionError('bytes_mismatch','The original upload changed.');
  phase='inspect';const result=await inspectDocument({bytes,filename:job.filename,mime:job.mime},adapter.scan,runtime);
  phase='store';await adapter.putVerified(job.deliveryKey,result.delivery.bytes,result.delivery.sha256,result.delivery.mime);
  phase='finish';const assetId=await adapter.finish(job,{originalSha256:result.original.sha256,sha256:result.delivery.sha256,bytes:result.delivery.byteSize,pages:result.delivery.pages,parserVersion:result.parserVersion,inspectionVersion:result.inspectionVersion});
  if(assetId!==job.id)throw Error('Unexpected completed document identity.');
  return {status:'ready' as const,assetId};
 }catch(error){
  if(phase==='finish')return {status:'unacknowledged' as const};
  const code=error instanceof DocumentInspectionError?error.code==='bytes_mismatch'?'bytes_mismatch':error.code==='scan_unavailable'?'scan_unavailable':['runtime_unavailable','runtime_configuration','processing_timeout'].includes(error.code)?'storage_unavailable':'inspection_rejected':'storage_unavailable';
  const retryable=code==='scan_unavailable'||code==='storage_unavailable';
  try{await adapter.fail(job,code,retryable);}catch{return {status:'unacknowledged' as const};}
  return {status:retryable?'retry_pending' as const:'rejected' as const};
 }
}
