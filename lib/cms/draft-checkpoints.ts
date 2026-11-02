import {z} from 'zod';
import type {ReleaseLock} from './publication-release-recovery.ts';
const uuid=z.string().uuid().transform(value=>value.toLowerCase());
const scopeSchema=z.object({actor:uuid,site:uuid,record:uuid,kind:z.string().regex(/^[a-zA-Z][a-zA-Z0-9]{0,63}$/),locale:z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/)}).strict();
const object=z.record(z.string(),z.json());
const schema=z.object({version:z.literal(1),scope:scopeSchema,id:uuid,baseRevision:uuid,base:object,draft:object,createdAt:z.iso.datetime(),updatedAt:z.iso.datetime()}).strict();
export type DraftCheckpoint=z.infer<typeof schema>;
export type CheckpointScope=z.infer<typeof scopeSchema>;
export type CheckpointStorage=Pick<Storage,'getItem'|'setItem'|'removeItem'|'key'|'length'>;
const limit=2_000_000;
function prefix(input:CheckpointScope){const s=scopeSchema.parse(input);return `cms-draft-checkpoint-v1:${s.actor}:${s.site}:${s.record}:${s.kind}:${s.locale}:`;}
function parse(raw:string,scope:CheckpointScope,id:string){
 if(raw.length>limit)throw Error('Draft recovery data exceeds the supported size. Preserve it for support.');
 let value:DraftCheckpoint;try{value=schema.parse(JSON.parse(raw));}catch{throw Error('Draft recovery data is invalid. Preserve it for support.');}
 if(JSON.stringify(value.scope)!==JSON.stringify(scopeSchema.parse(scope))||value.id!==uuid.parse(id))throw Error('Draft recovery identity mismatch.');
 if(Date.parse(value.updatedAt)<Date.parse(value.createdAt))throw Error('Draft recovery timestamps are invalid.');
 return value;
}
/** Local private drafts, explicitly opted into by the UI. No automatic expiry or
 * automatic server write. Each tab owns a distinct checkpoint ID. */
export function listDraftCheckpoints(storage:CheckpointStorage,scope:CheckpointScope){
 const start=prefix(scope),result:DraftCheckpoint[]=[];
 for(let i=0;i<storage.length;i++){
  const key=storage.key(i);if(!key?.startsWith(start))continue;
  const raw=storage.getItem(key);if(raw===null)continue;
  result.push(parse(raw,scope,key.slice(start.length)));
  if(result.length>20)throw Error('Too many local recovery drafts. Review existing checkpoints before continuing.');
 }
 return result.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||a.id.localeCompare(b.id));
}
export async function writeDraftCheckpoint(options:{storage:CheckpointStorage;locks:ReleaseLock|undefined;enabled:boolean;value:DraftCheckpoint}){
 if(!options.enabled)throw Error('Local draft recovery must be explicitly enabled.');
 if(!options.locks)throw Error('Web Locks support is required for local draft recovery.');
 const value=schema.parse(options.value),start=prefix(value.scope),key=start+value.id,raw=JSON.stringify(value);
 if(raw.length>limit)throw Error('This draft is too large for local recovery. Save it to the server.');
 parse(raw,value.scope,value.id);
 return options.locks.request(start,async()=>{
  const entries=listDraftCheckpoints(options.storage,value.scope),prior=entries.find(item=>item.id===value.id);
  if(!prior&&entries.length>=20)throw Error('Review existing recovery drafts before creating another checkpoint.');
  if(prior&&(prior.baseRevision!==value.baseRevision||JSON.stringify(prior.base)!==JSON.stringify(value.base)||prior.createdAt!==value.createdAt))throw Error('Start a new checkpoint after changing the base revision.');
  if(prior&&Date.parse(prior.updatedAt)>Date.parse(value.updatedAt))throw Error('A newer checkpoint already exists.');
  options.storage.setItem(key,raw);
  if(options.storage.getItem(key)!==raw)throw Error('Local recovery could not be confirmed. Keep this editor open and save manually.');
  return value;
 });
}
/** Caller must re-read server identity and permission, validate both payloads
 * with the editor schema, then compare if the base revision has changed. */
export function checkpointRecoveryMode(value:DraftCheckpoint,current:{scope:CheckpointScope;revision:string;canEdit:boolean}){
 const checked=schema.parse(value);
 if(!current.canEdit||JSON.stringify(checked.scope)!==JSON.stringify(scopeSchema.parse(current.scope)))throw Error('This recovery draft is not available for the current record and account.');
 return checked.baseRevision===uuid.parse(current.revision)?'restore-local' as const:'compare' as const;
}
/** Delete only the exact reviewed checkpoint; never wipe newer tab edits. */
export async function removeDraftCheckpoint(storage:CheckpointStorage,locks:ReleaseLock|undefined,value:DraftCheckpoint){
 if(!locks)throw Error('Web Locks support is required for local draft recovery.');
 const checked=schema.parse(value),start=prefix(checked.scope),key=start+checked.id;
 return locks.request(start,async()=>{
  const raw=storage.getItem(key);if(raw===null)return;
  if(JSON.stringify(parse(raw,checked.scope,checked.id))!==JSON.stringify(checked))throw Error('The recovery draft changed. Review it again before removing it.');
  storage.removeItem(key);if(storage.getItem(key)!==null)throw Error('Recovery data could not be removed.');
 });
}
