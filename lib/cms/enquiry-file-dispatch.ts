import {z} from 'zod';
import {enquiryFileScopeSchema,processEnquiryFile,type EnquiryFileAdapter} from './enquiry-file-worker.ts';
import type {DocumentRuntime} from './document-inspection.ts';
export type EnquiryFileDispatchAdapter=EnquiryFileAdapter & {listWork(limit:number):Promise<unknown>};
const jobsSchema=z.array(enquiryFileScopeSchema.extend({id:z.string().uuid()}).strict()).max(20);
/** Discovery grants no lease. Claims repeat current session/policy checks; process
 * sequentially to bound aggregate PDF/image memory and scanner load. */
export async function dispatchEnquiryFiles(adapter:EnquiryFileDispatchAdapter,site:string,runtime:DocumentRuntime,limit=5){
 z.string().uuid().parse(site);if(!Number.isInteger(limit)||limit<1||limit>20)throw Error('Invalid attachment batch size.');
 const jobs=jobsSchema.parse(await adapter.listWork(limit));
 if(jobs.length>limit||jobs.some(job=>job.site!==site)||new Set(jobs.map(v=>v.id)).size!==jobs.length)throw Error('Attachment work batch mismatch.');
 const counts={ready:0,not_claimed:0,retry_pending:0,rejected:0,unacknowledged:0};
 for(const {id,...scope} of jobs){try{const result=await processEnquiryFile(adapter,scope,id,runtime);counts[result.status]++;}catch{counts.unacknowledged++;}}
 // No applicant identifiers or filenames are exposed to worker callers/logs.
 return counts;
}
