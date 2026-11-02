import {createHash,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {processEnquiryFileCleanup} from './enquiry-file-cleanup-worker.ts';
import {createEnquiryFileCleanupStorage,type EnquiryFileCleanupDispatchAdapter} from './enquiry-file-cleanup-storage.ts';
export type CleanupConfig={site:string;secret:string;adapter:EnquiryFileCleanupDispatchAdapter};
export function enquiryFileCleanupConfig(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):CleanupConfig|null{
 if(env.CMS_ENQUIRY_ENABLED!=='true'||env.CMS_ENQUIRY_FILES_ENABLED!=='true'||env.CMS_ENQUIRY_FILE_CLEANUP_ENABLED!=='true')return null;
 try{const site=z.string().uuid().parse(env.CMS_WEBSITE_ID),secret=z.string().regex(/^[-A-Za-z0-9_]{32,256}$/).parse(env.CMS_ENQUIRY_FILE_CLEANUP_SECRET);return {site,secret,adapter:createEnquiryFileCleanupStorage({site,url:env.CMS_SUPABASE_URL??'',serviceKey:env.CMS_SUPABASE_SERVICE_ROLE_KEY??''},fetcher)};}catch{return null;}
}
export async function dispatchEnquiryFileCleanup(adapter:EnquiryFileCleanupDispatchAdapter,site:string,limit=1){
 z.string().uuid().parse(site);if(!Number.isInteger(limit)||limit<1||limit>20)throw Error('Invalid cleanup batch.');
 const jobs=z.array(z.object({site:z.literal(site),upload:z.string().uuid()}).strict()).max(limit).parse(await adapter.list(limit));if(new Set(jobs.map(v=>v.upload)).size!==jobs.length)throw Error('Duplicate cleanup work.');
 const counts={idle:0,deleted:0,retry:0,unacknowledged:0};for(const job of jobs){try{counts[(await processEnquiryFileCleanup(adapter,site,job.upload)).status]++;}catch{counts.unacknowledged++;}}return counts;
}
export async function handleEnquiryFileCleanup(request:Request,config:CleanupConfig|null){
 const respond=(status:number,body:unknown)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'}});
 if(!config||!z.string().uuid().safeParse(config.site).success||!/^[-A-Za-z0-9_]{32,256}$/.test(config.secret))return respond(503,{error:'Cleanup is not configured.'});
 const auth=request.headers.get('authorization')??'';if(auth.length>1024||!timingSafeEqual(createHash('sha256').update(auth).digest(),createHash('sha256').update(`Bearer ${config.secret}`).digest()))return respond(401,{error:'Unauthorized.'});
 if(request.method!=='POST'||request.body!==null||new URL(request.url).search)return respond(400,{error:'Send an empty POST without query parameters.'});
 try{return respond(200,{ok:true,counts:await dispatchEnquiryFileCleanup(config.adapter,config.site,1)});}catch{return respond(503,{error:'Cleanup could not be confirmed.'});}
}
