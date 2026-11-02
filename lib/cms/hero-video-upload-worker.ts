import {createHash} from 'node:crypto';
import {z} from 'zod';
import {inspectHeroVideo} from './hero-video-inspection.ts';
import type {HeroVideoRuntime} from './hero-video-inspection.ts';
import {HERO_VIDEO_LIMITS,VideoPolicyError} from './video-inspection-policy.ts';
import type {UploadAdapter} from './upload-worker.ts';
const uuid=z.string().uuid();
const claimed=z.object({id:uuid,site:uuid,filename:z.string(),mime:z.literal('video/mp4'),bytes:z.number().int().min(1).max(HERO_VIDEO_LIMITS.bytes),sha256:z.string().regex(/^[a-f0-9]{64}$/),storageKey:z.string(),deliveryKey:z.string(),leaseToken:uuid}).strict();
/** Adapter must claim/finish with the video-specific RPCs and use private video
 * storage. The image worker never handles these jobs. Lost acknowledgements are
 * resolved from durable upload status, never by recording a competing failure. */
export async function processHeroVideoUpload(adapter:UploadAdapter,site:string,id:string,runtime:HeroVideoRuntime){
 uuid.parse(site);uuid.parse(id);const raw=await adapter.claim(site,id);if(!raw)return {status:'not_claimed' as const};
 const parsed=claimed.safeParse(raw);
 if(!parsed.success||parsed.data.id!==id||parsed.data.site!==site||parsed.data.storageKey!==`${site}/${id}/original`||parsed.data.deliveryKey!==`${site}/${id}/delivery.mp4`)throw Error('Hero video upload job identity mismatch.');
 const job=parsed.data;let phase='read';
 try{
  const bytes=await adapter.read(job.storageKey,job.bytes);
  if(bytes.byteLength!==job.bytes||createHash('sha256').update(bytes).digest('hex')!==job.sha256)throw new VideoPolicyError('bytes_mismatch','The original upload changed.');
  phase='inspect';const result=await inspectHeroVideo({bytes,filename:job.filename,mime:job.mime},adapter.scan,runtime);
  phase='store';await adapter.putVerified(job.deliveryKey,result.delivery.bytes,result.delivery.sha256,result.delivery.mime);
  phase='finish';const assetId=await adapter.finish(job,{originalSha256:result.original.sha256,sha256:result.delivery.sha256,bytes:result.delivery.byteSize,width:result.delivery.width,height:result.delivery.height,inspectionVersion:result.inspectionVersion,durationSeconds:result.delivery.durationSeconds,framesPerSecond:result.delivery.framesPerSecond,hasAudio:false,codec:'h264',pixelFormat:'yuv420p'});
  if(assetId!==job.id)throw Error('Unexpected completed video identity.');
  return {status:'ready' as const,assetId};
 }catch(error){
  if(phase==='finish')return {status:'unacknowledged' as const};
  const code=error instanceof VideoPolicyError?error.code==='bytes_mismatch'?'bytes_mismatch':error.code==='scan_unavailable'?'scan_unavailable':['runtime_unavailable','runtime_configuration','processing_timeout'].includes(error.code)?'storage_unavailable':'inspection_rejected':'storage_unavailable';
  const retryable=code==='scan_unavailable'||code==='storage_unavailable';
  try{await adapter.fail(job,code,retryable);}catch{return {status:'unacknowledged' as const};}
  return {status:retryable?'retry_pending' as const:'rejected' as const};
 }
}
