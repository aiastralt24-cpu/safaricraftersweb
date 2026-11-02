import {z} from 'zod';
import type {ReleaseLock} from './publication-release-recovery.ts';
import type {CheckpointStorage} from './draft-checkpoints.ts';
const uuid=z.string().uuid().transform(value=>value.toLowerCase());
const scopeSchema=z.object({actor:uuid,site:uuid,kind:z.string().regex(/^[a-zA-Z][a-zA-Z0-9]{0,63}$/)}).strict();
const schema=z.object({version:z.literal(1),scope:scopeSchema,id:uuid,locale:z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/),draft:z.record(z.string(),z.json()),createdAt:z.iso.datetime(),updatedAt:z.iso.datetime()}).strict();
export type NewDraftCheckpoint=z.infer<typeof schema>;
export type NewDraftScope=z.infer<typeof scopeSchema>;
function prefix(scope:NewDraftScope){const s=scopeSchema.parse(scope);return `cms-new-draft-v1:${s.actor}:${s.site}:${s.kind}:`;}
function parse(raw:string,scope:NewDraftScope,id:string){
 if(raw.length>2_000_000)throw Error('Local draft exceeds the recovery size limit.');
 const value=schema.parse(JSON.parse(raw));
 if(JSON.stringify(value.scope)!==JSON.stringify(scopeSchema.parse(scope))||value.id!==uuid.parse(id)||Date.parse(value.updatedAt)<Date.parse(value.createdAt))throw Error('Local draft identity or timestamp mismatch.');
 return value;
}
export function listNewDrafts(storage:CheckpointStorage,scope:NewDraftScope){
 const start=prefix(scope),rows:NewDraftCheckpoint[]=[];
 for(let i=0;i<storage.length;i++){const key=storage.key(i);if(!key?.startsWith(start))continue;const raw=storage.getItem(key);if(raw!==null)rows.push(parse(raw,scope,key.slice(start.length)));if(rows.length>20)throw Error('Review existing local drafts before creating more.');}
 return rows.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||a.id.localeCompare(b.id));
}
export async function writeNewDraft(options:{storage:CheckpointStorage;locks:ReleaseLock|undefined;enabled:boolean;value:NewDraftCheckpoint}){
 if(!options.enabled||!options.locks)throw Error('Enable local recovery in a browser supporting Web Locks.');
 const value=schema.parse(options.value),raw=JSON.stringify(value),start=prefix(value.scope);parse(raw,value.scope,value.id);
 return options.locks.request(start,async()=>{
  const rows=listNewDrafts(options.storage,value.scope),prior=rows.find(row=>row.id===value.id);
  if(!prior&&rows.length>=20)throw Error('Review existing local drafts before creating more.');
  if(prior&&(prior.createdAt!==value.createdAt||Date.parse(prior.updatedAt)>Date.parse(value.updatedAt)))throw Error('This local draft changed. Start a new recovery copy.');
  options.storage.setItem(start+value.id,raw);if(options.storage.getItem(start+value.id)!==raw)throw Error('Local draft storage could not be confirmed. Keep the editor open.');return value;
 });
}
export function checkNewDraft(value:NewDraftCheckpoint,scope:NewDraftScope){return parse(JSON.stringify(value),scope,value.id);}
export async function removeNewDraft(storage:CheckpointStorage,locks:ReleaseLock|undefined,value:NewDraftCheckpoint){
 if(!locks)throw Error('Web Locks are required to remove local drafts.');
 const checked=checkNewDraft(value,value.scope),start=prefix(checked.scope),key=start+checked.id;
 return locks.request(start,async()=>{const raw=storage.getItem(key);if(raw===null)return;if(JSON.stringify(parse(raw,checked.scope,checked.id))!==JSON.stringify(checked))throw Error('The local draft changed. Refresh before removing it.');storage.removeItem(key);if(storage.getItem(key)!==null)throw Error('Local draft removal could not be confirmed.');});
}
