import {z} from 'zod';
import type {ReleaseLock,ReleaseStorage} from './publication-release-recovery.ts';
const uuid=z.string().uuid().transform(v=>v.toLowerCase());
export const translationCreateInput=z.object({action:z.literal('create'),site:uuid,source:uuid,sourceRevision:uuid,locale:z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/),path:z.string().max(500).regex(/^\/[a-z0-9/-]*$/).refine(v=>!v.includes('//')).nullable()}).strict();
export const translationCreateRequest=translationCreateInput.extend({requestKey:uuid});
const resultSchema=z.object({recordId:uuid,revisionId:uuid}).strict();
const receiptSchema=z.object({site:uuid,requestKey:uuid,result:resultSchema}).strict();
const pendingSchema=z.object({version:z.literal(1),actor:uuid,request:translationCreateRequest,createdAt:z.iso.datetime(),confirmed:resultSchema.optional()}).strict();
export type PendingTranslationCreation=z.infer<typeof pendingSchema>;
type Request=z.infer<typeof translationCreateRequest>;
type Transport={storage:ReleaseStorage;locks:ReleaseLock|undefined;actor:string;send:(request:Request)=>Promise<unknown>};
const limit=4000;
function key(actor:string,site:string,source:string){return `cms-translation-pending-v1:${uuid.parse(actor)}:${uuid.parse(site)}:${uuid.parse(source)}`;}
const attempts=new WeakMap<ReleaseStorage,Map<string,PendingTranslationCreation>>();
function remembered(storage:ReleaseStorage){let value=attempts.get(storage);if(!value){value=new Map();attempts.set(storage,value);}return value;}
/** No content or credentials are stored. An ambiguous request never expires. */
export function readPendingTranslation(storage:ReleaseStorage,actor:string,site:string,source:string){
 const raw=storage.getItem(key(actor,site,source));if(raw===null)return null;
 let pending:PendingTranslationCreation;
 try{if(raw.length>limit)throw Error();pending=pendingSchema.parse(JSON.parse(raw));}catch{throw Error('Translation recovery data is invalid. Preserve it for support.');}
 if(pending.actor!==uuid.parse(actor)||pending.request.site!==uuid.parse(site)||pending.request.source!==uuid.parse(source))throw Error('Translation recovery identity mismatch.');
 return pending;
}
function store(storage:ReleaseStorage,storageKey:string,pending:PendingTranslationCreation){
 const raw=JSON.stringify(pending);if(raw.length>limit)throw Error('Translation recovery data is too large. Nothing was sent.');
 storage.setItem(storageKey,raw);if(storage.getItem(storageKey)!==raw)throw Error('Translation recovery could not be stored. Nothing was sent.');
}
async function sendPending(options:Transport,pending:PendingTranslationCreation){
 const storageKey=key(options.actor,pending.request.site,pending.request.source);
 remembered(options.storage).set(storageKey,pending);
 const receipt=receiptSchema.parse(await options.send(pending.request));
 if(receipt.site!==pending.request.site||receipt.requestKey!==pending.request.requestKey||receipt.result.recordId===pending.request.source)throw Error('Translation confirmation does not match the pending request. Retry the same request.');
 const current=readPendingTranslation(options.storage,options.actor,pending.request.site,pending.request.source);
 if(JSON.stringify(current)!==JSON.stringify(pending))throw Error('Translation recovery changed before confirmation. Preserve it and retry.');
 if(pending.confirmed&&JSON.stringify(pending.confirmed)!==JSON.stringify(receipt.result))throw Error('Translation receipt changed. Preserve recovery data for support.');
 const confirmed={...pending,confirmed:receipt.result};store(options.storage,storageKey,confirmed);remembered(options.storage).set(storageKey,confirmed);return receipt.result;
}
export async function submitTranslationCreation(options:Transport&{input:z.input<typeof translationCreateInput>;now:()=>Date;newId:()=>string}){
 const input=translationCreateInput.parse(options.input),storageKey=key(options.actor,input.site,input.source);
 if(!options.locks)throw Error('Web Locks support is required for safe translation creation.');
 return options.locks.request(storageKey,async()=>{
  let pending=readPendingTranslation(options.storage,options.actor,input.site,input.source);const previous=remembered(options.storage).get(storageKey);
  if(previous&&pending&&previous.request.requestKey!==pending.request.requestKey)throw Error('Another tab changed translation recovery. Reload before continuing.');
  pending??=previous??null;
  if(pending){const {requestKey,...original}=pending.request;if(JSON.stringify(original)!==JSON.stringify(input))throw Error('Recover the earlier translation request before creating a different draft.');}
  else pending=pendingSchema.parse({version:1,actor:options.actor,request:{...input,requestKey:options.newId()},createdAt:options.now().toISOString()});
  store(options.storage,storageKey,pending);return sendPending(options,pending);
 });
}
/** Recovery sends the stored snapshot, even if the source was subsequently edited. */
export async function retryTranslationCreation(options:Transport&{site:string;source:string}){
 if(!options.locks)throw Error('Web Locks support is required for safe translation creation.');
 return options.locks.request(key(options.actor,options.site,options.source),async()=>{
  const pending=readPendingTranslation(options.storage,options.actor,options.site,options.source);
  if(!pending)throw Error('No translation request is stored.');return sendPending(options,pending);
 });
}
/** Call only after loading the returned record in the editor. No local discard
 * exists: cancelling an uncertain create needs a server-side request fence. */
export async function acknowledgeTranslationCreation(options:{storage:ReleaseStorage;locks:ReleaseLock|undefined;actor:string;site:string;source:string;record:string}){
 if(!options.locks)throw Error('Web Locks support is required for safe translation creation.');
 const storageKey=key(options.actor,options.site,options.source);
 return options.locks.request(storageKey,async()=>{
  const pending=readPendingTranslation(options.storage,options.actor,options.site,options.source);
  if(!pending?.confirmed||pending.confirmed.recordId!==options.record)return;
  options.storage.removeItem(storageKey);if(options.storage.getItem(storageKey)!==null)throw Error('The translation loaded but recovery could not be cleared.');
  remembered(options.storage).delete(storageKey);
 });
}

export async function cancelTranslationCreation(options:Omit<Transport,'send'>&{site:string;source:string;send:(request:Omit<Request,'action'>&{action:'cancel_create'})=>Promise<unknown>}){
 if(!options.locks)throw Error('Web Locks support is required for safe translation creation.');
 const storageKey=key(options.actor,options.site,options.source);
 return options.locks.request(storageKey,async()=>{
  const pending=readPendingTranslation(options.storage,options.actor,options.site,options.source);
  if(!pending)throw Error('No translation request is stored.');
  const envelope=z.object({site:uuid,requestKey:uuid,result:z.discriminatedUnion('status',[z.object({status:z.literal('cancelled')}).strict(),z.object({status:z.literal('created'),result:resultSchema}).strict()])}).strict().parse(await options.send({...pending.request,action:'cancel_create'}));
  if(envelope.site!==pending.request.site||envelope.requestKey!==pending.request.requestKey)throw Error('Translation cancellation does not match the pending request.');
  if(JSON.stringify(readPendingTranslation(options.storage,options.actor,options.site,options.source))!==JSON.stringify(pending))throw Error('Translation recovery changed before cancellation. Preserve it and retry.');
  if(envelope.result.status==='created'){
   const result=envelope.result.result;
   if(result.recordId===pending.request.source||(pending.confirmed&&JSON.stringify(result)!==JSON.stringify(pending.confirmed)))throw Error('Translation receipt changed. Preserve recovery data for support.');
   const confirmed={...pending,confirmed:result};store(options.storage,storageKey,confirmed);remembered(options.storage).set(storageKey,confirmed);
  }else{
   if(pending.confirmed)throw Error('A confirmed translation cannot be cancelled. Preserve recovery data for support.');
   options.storage.removeItem(storageKey);if(options.storage.getItem(storageKey)!==null)throw Error('Cancellation confirmed but recovery could not be cleared. Retry cancellation.');
   remembered(options.storage).delete(storageKey);
  }
  return envelope.result;
 });
}
