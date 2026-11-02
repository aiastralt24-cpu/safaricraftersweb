import {z} from 'zod';
import type {ReleaseLock,ReleaseStorage} from './publication-release-recovery.ts';
const uuid=z.string().uuid().transform(value=>value.toLowerCase());
export const creationType=z.enum(['page','homepage','destination','journey','photoExpedition','journalArticle','specialist','testimonial','navigation','settings','sharedSection','document','form','product','project']);
const inputSchema=z.object({action:z.literal('save'),site:uuid,record:z.null(),expectedRevision:z.null(),type:creationType,path:z.string().max(500).regex(/^\/[a-z0-9/-]*$/).nullable(),title:z.string().trim().min(1).max(200),locale:z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/).default('en'),payload:z.record(z.string(),z.json())}).strict();
const requestSchema=inputSchema.extend({requestKey:uuid});
const savedResult=z.object({recordId:uuid,revisionId:uuid}).strict();
const pendingSchema=z.object({confirmed:savedResult.optional(),version:z.literal(1),actor:uuid,request:requestSchema,createdAt:z.iso.datetime()}).strict();
export type CreateDraftInput=z.input<typeof inputSchema>;
export type PendingDraftCreation=z.infer<typeof pendingSchema>;
export type DraftCreationRequest=z.infer<typeof requestSchema>;
const limit=1_500_000;
// Each browser tab remembers requests it attempted, even if another tab clears
// shared storage after loading the record. No tokens are retained.
const attempted=new WeakMap<ReleaseStorage,Map<string,PendingDraftCreation>>();
function attempts(storage:ReleaseStorage){let value=attempted.get(storage);if(!value){value=new Map();attempted.set(storage,value);}return value;}
function key(actor:string,site:string,kind:string){return `cms-create-pending-v1:${uuid.parse(actor)}:${uuid.parse(site)}:${creationType.parse(kind)}`;}
// Canonical comparison tolerates object-key ordering without changing arrays.
function stable(value:unknown):string{
 if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;
 if(value&&typeof value==='object')return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${stable((value as Record<string,unknown>)[k])}`).join(',')}}`;
 return JSON.stringify(value);
}
export function readPendingDraftCreation(storage:ReleaseStorage,actor:string,site:string,kind:string):PendingDraftCreation|null{
 const raw=storage.getItem(key(actor,site,kind));if(raw===null)return null;
 if(raw.length>limit)throw Error('Stored first-save recovery data is too large. Preserve it for support.');
 let pending:PendingDraftCreation;try{pending=pendingSchema.parse(JSON.parse(raw));}catch{throw Error('Stored first-save recovery data is invalid. Preserve it for support.');}
 if(pending.actor!==uuid.parse(actor)||pending.request.site!==uuid.parse(site)||pending.request.type!==kind)throw Error('First-save recovery identity mismatch.');
 return pending;
}
function prepare(storage:ReleaseStorage,actor:string,input:CreateDraftInput,now:()=>Date,newId:()=>string,retain=false){
 const parsed=inputSchema.parse(input),storageKey=key(actor,parsed.site,parsed.type),existing=readPendingDraftCreation(storage,actor,parsed.site,parsed.type),previous=retain?attempts(storage).get(storageKey):undefined;
 if(previous){
  const {requestKey,...original}=previous.request;
  if(stable(original)!==stable(parsed)||existing&&existing.request.requestKey!==requestKey)throw Error('This tab has an earlier first save. Resolve it or reload the workspace before creating different content.');
  if(!existing){const raw=JSON.stringify(previous);storage.setItem(storageKey,raw);if(storage.getItem(storageKey)!==raw)throw Error('First-save recovery could not be stored. Nothing was sent.');return previous;}
 }
 if(existing){const {requestKey,...original}=existing.request;if(stable(original)!==stable(parsed))throw Error('Resolve the unconfirmed first save before creating different content of this type.');return existing;}
 const pending=pendingSchema.parse({version:1,actor,request:{...parsed,requestKey:newId()},createdAt:now().toISOString()}),raw=JSON.stringify(pending);
 if(raw.length>limit)throw Error('This first-save request is too large for recovery. Nothing was sent.');
 storage.setItem(storageKey,raw);
 if(storage.getItem(storageKey)!==raw)throw Error('First-save recovery could not be stored. Nothing was sent.');return pending;
}
function confirm(storage:ReleaseStorage,pending:PendingDraftCreation,response:unknown,retain=false){
 const receipt=z.object({site:uuid,requestKey:uuid,result:z.object({recordId:uuid,revisionId:uuid}).strict()}).strict().parse(response);
 if(receipt.site!==pending.request.site||receipt.requestKey!==pending.request.requestKey)throw Error('First-save confirmation does not match the pending request.');
 const current=readPendingDraftCreation(storage,pending.actor,pending.request.site,pending.request.type);
 if(stable(current)!==stable(pending))throw Error('First-save recovery changed before confirmation. Preserve it and retry.');
 const storageKey=key(pending.actor,pending.request.site,pending.request.type);
 if(retain){const raw=JSON.stringify({...pending,confirmed:receipt.result});storage.setItem(storageKey,raw);if(storage.getItem(storageKey)!==raw)throw Error('Unable to retain the confirmed first save. Retry the same request.');return receipt;}
 storage.removeItem(storageKey);
 if(storage.getItem(storageKey)!==null)throw Error('The record was created but recovery could not be cleared. Retry the same request to confirm it.');
 return receipt;
}
type Transport={storage:ReleaseStorage;locks:ReleaseLock|undefined;actor:string;retainUntilLoaded?:boolean;send:(request:DraftCreationRequest)=>Promise<unknown>};
/** Persist before transport, serialize tabs and never silently replace an
 * unconfirmed request. Tokens are passed through send, never stored here. */
export async function submitDraftCreation(options:Transport&{input:CreateDraftInput;now:()=>Date;newId:()=>string}){
 const input=inputSchema.parse(options.input);
 if(!options.locks)throw Error('Web Locks support is required for safe first-save recovery.');
 return options.locks.request(key(options.actor,input.site,input.type),async()=>{
  const pending=prepare(options.storage,options.actor,input,options.now,options.newId,options.retainUntilLoaded);
  if(options.retainUntilLoaded)attempts(options.storage).set(key(options.actor,input.site,input.type),pending);
  return confirm(options.storage,pending,await options.send(pending.request),options.retainUntilLoaded);
 });
}
/** Recovery always sends the stored request, never the current editor draft. */
export async function retryDraftCreation(options:Transport&{site:string;kind:string}){
 if(!options.locks)throw Error('Web Locks support is required for safe first-save recovery.');
 return options.locks.request(key(options.actor,options.site,options.kind),async()=>{
  const pending=readPendingDraftCreation(options.storage,options.actor,options.site,options.kind);
  if(!pending)throw Error('No unconfirmed first save is stored.');
  return confirm(options.storage,pending,await options.send(pending.request),options.retainUntilLoaded);
 });
}

/** No client-side discard: cancellation must fence delayed creates on the server.
 * If creation already committed, return its receipt without deleting content. */
export async function cancelDraftCreation(options:Omit<Transport,'send'>&{site:string;kind:string;send:(request:{action:'cancel_create';site:string;requestKey:string;type:string})=>Promise<unknown>}){
 if(!options.locks)throw Error('Web Locks support is required for safe first-save recovery.');
 return options.locks.request(key(options.actor,options.site,options.kind),async()=>{
  const pending=readPendingDraftCreation(options.storage,options.actor,options.site,options.kind);
  if(!pending)throw Error('No unconfirmed first save is stored.');
  const envelope=z.object({site:uuid,requestKey:uuid,result:z.discriminatedUnion('status',[
   z.object({status:z.literal('created'),result:z.object({recordId:uuid,revisionId:uuid}).strict()}).strict(),
   z.object({status:z.literal('cancelled')}).strict(),
  ])}).strict().parse(await options.send({action:'cancel_create',site:pending.request.site,requestKey:pending.request.requestKey,type:pending.request.type}));
  if(envelope.site!==pending.request.site||envelope.requestKey!==pending.request.requestKey)throw Error('Cancellation confirmation does not match the pending request.');
  if(envelope.result.status==='created'){
   confirm(options.storage,pending,{site:envelope.site,requestKey:envelope.requestKey,result:envelope.result.result},options.retainUntilLoaded);
  }else{
   const current=readPendingDraftCreation(options.storage,options.actor,options.site,options.kind);
   if(stable(current)!==stable(pending))throw Error('First-save recovery changed before cancellation. Preserve it and retry.');
   const storageKey=key(options.actor,options.site,options.kind);options.storage.removeItem(storageKey);
   if(options.storage.getItem(storageKey)!==null)throw Error('Cancellation confirmed, but local recovery could not be cleared. Retry cancellation.');
   attempts(options.storage).delete(storageKey);
  }
  return envelope.result;
 });
}

/** Clear only after the editor has received the created record. Failed reloads
 * retain the original identity so a second Save cannot create another record. */
export async function acknowledgeDraftCreation(options:{storage:ReleaseStorage;locks:ReleaseLock|undefined;actor:string;site:string;kind:string;record:string}){
 if(!readPendingDraftCreation(options.storage,options.actor,options.site,options.kind)?.confirmed)return;
 if(!options.locks)throw Error('Web Locks support is required for safe first-save recovery.');
 return options.locks.request(key(options.actor,options.site,options.kind),async()=>{
  const pending=readPendingDraftCreation(options.storage,options.actor,options.site,options.kind);
  if(!pending?.confirmed||pending.confirmed.recordId!==options.record)return;
  const storageKey=key(options.actor,options.site,options.kind);options.storage.removeItem(storageKey);
  if(options.storage.getItem(storageKey)!==null)throw Error('The record loaded but first-save recovery could not be cleared.');
  attempts(options.storage).delete(storageKey);
 });
}
