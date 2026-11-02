import {z} from 'zod';
import {releaseManifestSchema,parseReleaseReceipt,type ReleaseManifest} from './publication-release.ts';
const uuid=z.string().uuid().transform(value=>value.toLowerCase());
const pendingSchema=z.object({schemaVersion:z.literal(1),actor:uuid,manifest:releaseManifestSchema,createdAt:z.iso.datetime()}).strict();
export type PendingRelease=z.infer<typeof pendingSchema>;
export type ReleaseStorage=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
const LIMIT=16000;
function key(actor:string,site:string){return `cms-release-pending-v1:${uuid.parse(actor)}:${uuid.parse(site)}`;}
/** No automatic expiry: an old receipt may still be the only way to recover an
 * ambiguous commit. No content, titles, tokens or credentials belong here. */
export function readPendingRelease(storage:ReleaseStorage,actor:string,site:string):PendingRelease|null{
 const raw=storage.getItem(key(actor,site));if(raw===null)return null;
 if(raw.length>LIMIT)throw new Error('Stored release recovery data is invalid. Preserve it for support before starting another release.');
 let parsed:PendingRelease;
 try{parsed=pendingSchema.parse(JSON.parse(raw));}catch{throw new Error('Stored release recovery data is invalid. Preserve it for support before starting another release.');}
 if(parsed.actor!==uuid.parse(actor)||parsed.manifest.site!==uuid.parse(site))throw new Error('Release recovery identity mismatch.');
 return parsed;
}
/** Must succeed before sending a release. Never replace an unresolved manifest. */
export function preparePendingRelease(storage:ReleaseStorage,actor:string,input:ReleaseManifest,now:Date):PendingRelease{
 const manifest=releaseManifestSchema.parse(input),existing=readPendingRelease(storage,actor,manifest.site);
 if(existing){
  if(JSON.stringify(existing.manifest)!==JSON.stringify(manifest))throw new Error('Recover the pending release before starting another one.');
  return existing;
 }
 const pending=pendingSchema.parse({schemaVersion:1,actor,manifest,createdAt:now.toISOString()});
 const raw=JSON.stringify(pending);if(raw.length>LIMIT)throw new Error('Release recovery data is too large.');
 storage.setItem(key(actor,manifest.site),raw);
 if(storage.getItem(key(actor,manifest.site))!==raw)throw new Error('Release recovery could not be saved. Nothing was sent.');
 return pending;
}
/** Only an exact server receipt permits removal. A failure, stale response or
 * response from another account must leave the pending request intact. */
export function completePendingRelease(storage:ReleaseStorage,actor:string,site:string,response:unknown){
 const pending=readPendingRelease(storage,actor,site);
 if(!pending)throw new Error('No pending release to confirm.');
 const envelope=z.object({site:uuid,result:z.unknown(),deliveryStatus:z.literal('unverified')}).strict().parse(response);
 if(envelope.site!==pending.manifest.site)throw new Error('Release response website mismatch.');
 const receipt=parseReleaseReceipt(envelope.result,pending.manifest);
 storage.removeItem(key(actor,site));
 if(storage.getItem(key(actor,site))!==null)throw new Error('Release confirmed, but recovery data could not be cleared. Retrying will recover the same receipt.');
 return receipt;
}

export type ReleaseLock={request<T>(name:string,callback:()=>Promise<T>):Promise<T>};
/** The UI must use navigator.locks and localStorage from the same origin. Fail
 * closed if Web Locks is unavailable; never replace this with an in-tab mutex. */
export async function submitRecoverableRelease(options:{storage:ReleaseStorage;locks:ReleaseLock|undefined;actor:string;manifest:ReleaseManifest;send:(manifest:ReleaseManifest)=>Promise<unknown>;now:()=>Date}){
 const {storage,locks,actor,send}=options,manifest=releaseManifestSchema.parse(options.manifest);
 if(!locks)throw new Error('This browser cannot safely coordinate release recovery across tabs. Use a browser with Web Locks support.');
 return locks.request(key(actor,manifest.site),async()=>{
  const pending=preparePendingRelease(storage,actor,manifest,options.now());
  const response=await send(pending.manifest);
  return completePendingRelease(storage,actor,manifest.site,response);
 });
}

/** Server cancellation and publication serialize on the same record/receipt
 * locks. Only its confirmed outcome permits clearing an unresolved request. */
export async function cancelRecoverableRelease(options:{storage:ReleaseStorage;locks:ReleaseLock|undefined;actor:string;site:string;send:(manifest:ReleaseManifest)=>Promise<unknown>}){
 const {parseReleaseCancellation}=await import('./publication-release.ts');
 const {storage,locks,actor,site,send}=options;
 if(!locks)throw Error('Web Locks support is required for safe release recovery.');
 return locks.request(key(actor,site),async()=>{
  const pending=readPendingRelease(storage,actor,site);if(!pending)throw Error('No pending release to cancel.');
  const envelope=z.object({site:uuid,result:z.unknown(),deliveryStatus:z.literal('unverified')}).strict().parse(await send(pending.manifest));
  if(envelope.site!==pending.manifest.site)throw Error('Release response website mismatch.');
  const result=parseReleaseCancellation(envelope.result,pending.manifest);
  storage.removeItem(key(actor,site));
  if(storage.getItem(key(actor,site))!==null)throw Error('Release resolved, but local recovery could not be cleared. Retry to confirm the same outcome.');
  return result;
 });
}
