import {z} from 'zod';
import {processHeroVideoUpload} from './hero-video-upload-worker.ts';
import type {UploadAdapter} from './upload-worker.ts';
import type {HeroVideoRuntime} from './hero-video-inspection.ts';
export type HeroVideoDispatchAdapter=UploadAdapter & {
 listWork(limit:number):Promise<unknown>;
 confirmOriginal(site:string,id:string):Promise<'confirmed'|'not_reserved'>;
};
const jobs=z.array(z.object({site:z.string().uuid(),id:z.string().uuid()}).strict()).max(20);
/** Sequential, bounded batch: media processing does not fan out memory/CPU usage.
 * Discovery does not own a lease; the processor claims atomically before decoding. */
export async function dispatchHeroVideos(adapter:HeroVideoDispatchAdapter,runtime:HeroVideoRuntime,limit=5){
 if(!Number.isInteger(limit)||limit<1||limit>20)throw Error('Invalid video batch size.');
 const work=jobs.parse(await adapter.listWork(limit));
 if(work.length>limit||new Set(work.map(job=>`${job.site}/${job.id}`)).size!==work.length)throw Error('Invalid video work batch.');
 const results=[];
 for(const job of work){
  try{
   await adapter.confirmOriginal(job.site,job.id);
   results.push({...job,...await processHeroVideoUpload(adapter,job.site,job.id,runtime)});
  }catch{
   // Reception or claim acknowledgement may have committed. Rediscover durable
   // status on the next run; never invent a lease or mark a competing failure.
   results.push({...job,status:'unacknowledged' as const});
  }
 }
 return results;
}
