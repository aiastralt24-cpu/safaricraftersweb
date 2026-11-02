import {z} from 'zod';
import {createHash} from 'node:crypto';
import {inspectDocument,DocumentInspectionError,type DocumentRuntime} from './document-inspection.ts';
import {inspectImage,ImageInspectionError,type MalwareScanner} from './image-inspection.ts';
const uuid=z.string().uuid();
export const enquiryFileScopeSchema=z.object({site:uuid,form:uuid,revision:uuid,request:uuid,field:z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/)}).strict();
export type EnquiryFileScope=z.infer<typeof enquiryFileScopeSchema>;
const jobSchema=enquiryFileScopeSchema.extend({id:uuid,leaseToken:uuid,filename:z.string().min(1).max(200),mime:z.enum(['application/pdf','image/jpeg','image/png']),bytes:z.number().int().positive().max(25_000_000),maxBytes:z.number().int().positive().max(25_000_000),sha256:z.string().regex(/^[a-f0-9]{64}$/),storageKey:z.string(),deliveryKey:z.string()}).strict();
export type EnquiryFileJob=z.infer<typeof jobSchema>;
export type EnquiryFileAdapter={
 /** Claim must authorize the private submission scope and return its pinned field policy. */
 claim(scope:EnquiryFileScope,id:string):Promise<unknown>;
 read(key:string,maxBytes:number):Promise<Uint8Array>;
 scan:MalwareScanner;
 /** Private, immutable checksum-verified write. No public catalog registration. */
 putVerified(key:string,bytes:Buffer,sha256:string,mime:string):Promise<void>;
 /** Must recheck the lease, scope and policy before marking available. */
 finish(job:EnquiryFileJob,result:Record<string,unknown>):Promise<string>;
 fail(job:EnquiryFileJob,code:string,retryable:boolean):Promise<void>;
};
/** Processing alone grants neither submission authorization nor download access. */
export async function processEnquiryFile(adapter:EnquiryFileAdapter,scope:EnquiryFileScope,id:string,runtime:DocumentRuntime){
 enquiryFileScopeSchema.parse(scope);uuid.parse(id);
 const raw=await adapter.claim(scope,id);if(raw===null)return {status:'not_claimed' as const};
 const parsed=jobSchema.safeParse(raw);
 if(!parsed.success)throw Error('Attachment job identity mismatch.');
 const job=parsed.data,base=`${scope.site}/enquiries/${scope.request}/${id}`;
 if(job.id!==id||Object.entries(scope).some(([key,value])=>job[key as keyof EnquiryFileScope]!==value)||job.bytes>job.maxBytes||job.storageKey!==`${base}/original`||job.deliveryKey!==`${base}/delivery.${job.mime==='application/pdf'?'pdf':'webp'}`)throw Error('Attachment job identity mismatch.');
 let phase='read';
 try{
  const bytes=await adapter.read(job.storageKey,job.bytes);
  if(bytes.byteLength!==job.bytes||createHash('sha256').update(bytes).digest('hex')!==job.sha256)throw new DocumentInspectionError('bytes_mismatch','Attachment bytes changed.');
  phase='inspect';
  const result=job.mime==='application/pdf'?await inspectDocument({bytes,filename:job.filename,mime:job.mime},adapter.scan,runtime):await inspectImage({bytes,filename:job.filename,mime:job.mime},adapter.scan);
  if(result.delivery.byteSize>job.maxBytes)throw new DocumentInspectionError('delivery_size','Processed attachment exceeds the field limit.');
  phase='store';await adapter.putVerified(job.deliveryKey,result.delivery.bytes,result.delivery.sha256,result.delivery.mime);
  phase='finish';
  const completed=await adapter.finish(job,{originalSha256:result.original.sha256,originalBytes:result.original.byteSize,originalMime:job.mime,sha256:result.delivery.sha256,bytes:result.delivery.byteSize,mime:result.delivery.mime,inspectionVersion:result.inspectionVersion,...('pages' in result.delivery?{pages:result.delivery.pages,parserVersion:'parserVersion' in result?result.parserVersion:undefined}:{width:result.delivery.width,height:result.delivery.height})});
  if(completed!==id)throw Error('Attachment completion identity mismatch.');
  return {status:'ready' as const,uploadId:id};
 }catch(error){
  if(phase==='finish')return {status:'unacknowledged' as const};
  const inspected=error instanceof DocumentInspectionError||error instanceof ImageInspectionError;
  const code=inspected?error.code==='bytes_mismatch'?'bytes_mismatch':error.code==='scan_unavailable'?'scan_unavailable':['runtime_configuration','runtime_unavailable','processing_timeout'].includes(error.code)?'processing_unavailable':'inspection_rejected':'storage_unavailable';
  const retryable=['scan_unavailable','processing_unavailable','storage_unavailable'].includes(code);
  try{await adapter.fail(job,code,retryable);}catch{return {status:'unacknowledged' as const};}
  return {status:retryable?'retry_pending' as const:'rejected' as const};
 }
}
