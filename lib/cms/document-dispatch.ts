import {z} from 'zod';
import {processDocumentUpload} from './document-upload-worker.ts';
import type {UploadAdapter} from './upload-worker.ts';
import type {DocumentRuntime} from './document-inspection.ts';
export type DocumentProcessingAdapter=UploadAdapter & {
 listWork(limit:number):Promise<unknown>;
};
const jobs=z.array(z.object({site:z.string().uuid(),id:z.string().uuid()}).strict()).max(20);
/** Sequential, bounded batch: media processing does not fan out memory/CPU usage.
 * Discovery does not own a lease; the processor claims atomically before decoding. */
export async function dispatchDocuments(adapter:DocumentProcessingAdapter,runtime:DocumentRuntime,limit=5){
 if(!Number.isInteger(limit)||limit<1||limit>20)throw Error('Invalid document batch size.');
 const work=jobs.parse(await adapter.listWork(limit));
 if(work.length>limit||new Set(work.map(job=>`${job.site}/${job.id}`)).size!==work.length)throw Error('Invalid document work batch.');
 const results=[];
 for(const job of work){
  try{
   results.push({...job,...await processDocumentUpload(adapter,job.site,job.id,runtime)});
  }catch{
   // Reception or claim acknowledgement may have committed. Rediscover durable
   // status on the next run; never invent a lease or mark a competing failure.
   results.push({...job,status:'unacknowledged' as const});
  }
 }
 return results;
}
