import {z} from 'zod';
import {releaseManifestSchema} from './publication-release.ts';
import type {ReleaseLock,ReleaseStorage} from './publication-release-recovery.ts';
const uuid=z.string().uuid().transform(value=>value.toLowerCase());
export const scheduledReleaseRequest=releaseManifestSchema.safeExtend({runAt:z.iso.datetime({offset:true}).transform(value=>new Date(value).toISOString())});
export type ScheduledReleaseRequest=z.infer<typeof scheduledReleaseRequest>;
const schema=z.object({schemaVersion:z.literal(1),actor:uuid,request:scheduledReleaseRequest,createdAt:z.iso.datetime()}).strict();
export type PendingScheduledRelease=z.infer<typeof schema>;
const key=(actor:string,site:string)=>`cms-schedule-pending-v1:${uuid.parse(actor)}:${uuid.parse(site)}`;
export function readPendingScheduledRelease(storage:ReleaseStorage,actor:string,site:string):PendingScheduledRelease|null{
 const raw=storage.getItem(key(actor,site));if(raw===null)return null;
 try{
  if(raw.length>16000)throw Error();
  const pending=schema.parse(JSON.parse(raw));
  if(pending.actor!==uuid.parse(actor)||pending.request.site!==uuid.parse(site))throw Error();
  return pending;
 }catch{throw Error('Schedule recovery data is invalid. Preserve it for support before creating another schedule.');}
}
/** Persist exact identity and instant before transport. No expiry: even a due
 * or completed schedule must be recovered using the original request. */
export async function submitRecoverableScheduledRelease(options:{storage:ReleaseStorage;locks:ReleaseLock|undefined;actor:string;request:ScheduledReleaseRequest;now:()=>Date;send:(request:ScheduledReleaseRequest)=>Promise<unknown>}){
 const {storage,locks,actor,send}=options,request=scheduledReleaseRequest.parse(options.request);
 if(!locks)throw Error('Web Locks support is required for safe schedule recovery.');
 return locks.request(key(actor,request.site),async()=>{
  let pending=readPendingScheduledRelease(storage,actor,request.site);
  if(pending&&JSON.stringify(pending.request)!==JSON.stringify(request))throw Error('Recover the pending schedule before creating another one.');
  if(!pending){
   const now=options.now();
   if(Date.parse(request.runAt)<=now.getTime())throw Error('Choose a future execution time.');
   pending=schema.parse({schemaVersion:1,actor,request,createdAt:now.toISOString()});
   const raw=JSON.stringify(pending);if(raw.length>16000)throw Error('Schedule recovery data is too large.');
   storage.setItem(key(actor,request.site),raw);
   if(storage.getItem(key(actor,request.site))!==raw)throw Error('Schedule recovery could not be saved. Nothing was sent.');
  }
  const envelope=z.object({result:z.object({id:uuid,site:uuid,request:uuid,runAt:z.iso.datetime({offset:true})}).strict()}).strict().parse(await send(pending.request));
  const result=envelope.result;
  if(result.site!==request.site||result.request!==request.request||Date.parse(result.runAt)!==Date.parse(request.runAt))throw Error('Schedule confirmation does not match the pending request.');
  // Recheck storage before clearing: corruption or external modification must
  // not remove another request even after this response has been confirmed.
  const current=readPendingScheduledRelease(storage,actor,request.site);
  if(!current||JSON.stringify(current)!==JSON.stringify(pending))throw Error('Schedule recovery changed during confirmation. Preserve it for support.');
  storage.removeItem(key(actor,request.site));
  if(storage.getItem(key(actor,request.site))!==null)throw Error('Schedule confirmed, but local recovery could not be cleared. Retry the same request.');
  return result;
 });
}
