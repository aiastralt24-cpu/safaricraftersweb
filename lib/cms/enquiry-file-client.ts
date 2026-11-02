import {z} from 'zod';
const uuid=z.string().uuid(),hash=z.string().regex(/^[a-f0-9]{64}$/),field=z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/);
export const enquiryUploadScopeSchema=z.object({site:uuid,form:uuid,revision:uuid,request:uuid}).strict();
export type EnquiryUploadScope=z.infer<typeof enquiryUploadScopeSchema>;
const fileSchema=z.object({id:uuid,field,filename:z.string().min(1).max(200).refine(v=>!v.startsWith('.')&&!/[\x00-\x1f\x7f/\\]/.test(v)),mime:z.enum(['application/pdf','image/jpeg','image/png']),bytes:z.number().int().min(1).max(25000000),sha256:hash}).strict();
const trackerSchema=enquiryUploadScopeSchema.extend({version:z.literal(1),session:uuid,secret:hash,files:z.array(fileSchema).max(50)}).strict().refine(v=>new Set(v.files.map(f=>f.id)).size===v.files.length&&v.files.reduce((sum,f)=>sum+f.bytes,0)<=100000000);
export type EnquiryUploadTracker=z.infer<typeof trackerSchema>;
const sessionSchema=enquiryUploadScopeSchema.extend({id:uuid,state:z.enum(['active','cancelled','consumed']),createdAt:z.string().datetime({offset:true}),expiresAt:z.string().datetime({offset:true})}).strict().refine(v=>Date.parse(v.expiresAt)>Date.parse(v.createdAt)&&Date.parse(v.expiresAt)-Date.parse(v.createdAt)<=1800000);
const statusFileSchema=z.object({uploadId:uuid,field,filename:z.string().min(1).max(200),mime:z.enum(['application/pdf','image/jpeg','image/png']),bytes:z.number().int().min(1).max(25000000),state:z.enum(['reserved','uploaded','processing','retry','rejected','ready'])}).strict();
function matchesScope(actual:EnquiryUploadScope,expected:EnquiryUploadScope){return Object.entries(expected).every(([key,value])=>actual[key as keyof EnquiryUploadScope]===value);}
/** Browser only: persist this credential in sessionStorage before the first request.
 * Never put it in URLs, logs, analytics, localStorage or page markup. */
export function newEnquiryUploadTracker(scope:EnquiryUploadScope,cryptoProvider:Crypto=globalThis.crypto):EnquiryUploadTracker{
 const parsed=enquiryUploadScopeSchema.parse(scope);const secret=Array.from(cryptoProvider.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');
 return trackerSchema.parse({...parsed,version:1,session:cryptoProvider.randomUUID(),secret,files:[]});
}
export function parseEnquiryUploadTracker(text:string,scope:EnquiryUploadScope){
 if(typeof text!=='string'||text.length>50000)throw Error('Upload recovery is invalid.');
 const expected=enquiryUploadScopeSchema.parse(scope),value=trackerSchema.parse(JSON.parse(text));if(!matchesScope(value,expected))throw Error('Upload recovery belongs to another submission.');return value;
}
export function enquiryUploadStorageKey(scope:EnquiryUploadScope){const v=enquiryUploadScopeSchema.parse(scope);return `cms-enquiry-upload:${v.site}:${v.form}:${v.revision}:${v.request}`;}
export function persistEnquiryUploadTracker(storage:Pick<Storage,'setItem'|'getItem'>,input:EnquiryUploadTracker){
 const value=trackerSchema.parse(input),text=JSON.stringify(value);if(text.length>50000)throw Error('Upload recovery is too large.');
 const scope={site:value.site,form:value.form,revision:value.revision,request:value.request},key=enquiryUploadStorageKey(scope),previous=storage.getItem(key);
 if(previous!==null){const old=parseEnquiryUploadTracker(previous,scope);if(old.session!==value.session||old.secret!==value.secret||old.files.some(file=>JSON.stringify(value.files.find(v=>v.id===file.id))!==JSON.stringify(file)))throw Error('An unresolved upload session already exists.');}
 storage.setItem(key,text);if(storage.getItem(key)!==text)throw Error('Upload recovery could not be saved.');return value;
}
/** Reselecting a file after reload must reproduce the same metadata and checksum. */
export async function describeEnquiryUpload(file:File,fieldId:string,id:string,cryptoProvider:Crypto=globalThis.crypto){
 if(file.size<1||file.size>25000000)throw Error('File size is invalid.');
 const mime=z.enum(['application/pdf','image/jpeg','image/png']).parse(file.type);
 const extensions={'application/pdf':/\.pdf$/i,'image/jpeg':/\.jpe?g$/i,'image/png':/\.png$/i};if(!extensions[mime].test(file.name))throw Error('File type does not match its name.');
 const data=await file.arrayBuffer();if(data.byteLength!==file.size)throw Error('File changed while reading.');
 const sha256=Array.from(new Uint8Array(await cryptoProvider.subtle.digest('SHA-256',data)),v=>v.toString(16).padStart(2,'0')).join('');
 return fileSchema.parse({id,field:fieldId,filename:file.name,mime,bytes:file.size,sha256});
}
export function trackEnquiryUpload(input:EnquiryUploadTracker,file:unknown){
 const value=trackerSchema.parse(input),parsed=fileSchema.parse(file),existing=value.files.find(v=>v.id===parsed.id);
 if(existing){if(JSON.stringify(existing)!==JSON.stringify(parsed))throw Error('This upload ID already belongs to another file.');return value;}
 return trackerSchema.parse({...value,files:[...value.files,parsed]});
}
function checkSession(raw:unknown,tracker:EnquiryUploadTracker){const session=sessionSchema.parse(raw);if(session.id!==tracker.session||!matchesScope(session,{site:tracker.site,form:tracker.form,revision:tracker.revision,request:tracker.request}))throw Error('Upload session response mismatch.');return session;}
export function checkEnquiryUploadSessionResponse(raw:unknown,input:EnquiryUploadTracker){const tracker=trackerSchema.parse(input),value=z.object({ok:z.literal(true),status:z.enum(['created','recovered']),session:sessionSchema}).strict().parse(raw);checkSession(value.session,tracker);return value;}
export function checkEnquiryUploadStatus(raw:unknown,input:EnquiryUploadTracker){
 const tracker=trackerSchema.parse(input),value=z.object({ok:z.literal(true),status:z.literal('ok'),session:sessionSchema,files:z.array(statusFileSchema).max(50)}).strict().parse(raw);
 checkSession(value.session,tracker);const seen=new Set<string>();
 for(const f of value.files){const saved=tracker.files.find(v=>v.id===f.uploadId);if(!saved||seen.has(f.uploadId)||saved.field!==f.field||saved.filename!==f.filename||saved.mime!==f.mime||saved.bytes!==f.bytes)throw Error('Upload status response mismatch.');seen.add(f.uploadId);}
 // Missing files can be reservations whose response was lost before commit.
 return value;
}
export function checkEnquiryUploadCancellation(raw:unknown,input:EnquiryUploadTracker){const tracker=trackerSchema.parse(input),value=z.object({ok:z.literal(true),status:z.literal('cancelled'),session:sessionSchema}).strict().parse(raw);const session=checkSession(value.session,tracker);if(session.state!=='cancelled')throw Error('Upload cancellation response mismatch.');return value;}

export function clearCancelledEnquiryUpload(storage:Pick<Storage,'getItem'|'removeItem'>,input:EnquiryUploadTracker,response:unknown){
 const tracker=trackerSchema.parse(input);checkEnquiryUploadCancellation(response,tracker);
 const scope={site:tracker.site,form:tracker.form,revision:tracker.revision,request:tracker.request},key=enquiryUploadStorageKey(scope),text=storage.getItem(key);
 if(text===null)return;
 const current=parseEnquiryUploadTracker(text,scope);if(current.session!==tracker.session||current.secret!==tracker.secret)throw Error('Upload recovery changed before cancellation.');
 storage.removeItem(key);if(storage.getItem(key)!==null)throw Error('Upload recovery could not be cleared.');
}
export function checkEnquiryUploadReservation(raw:unknown,input:EnquiryUploadTracker,uploadId:string){
 const tracker=trackerSchema.parse(input),value=z.object({ok:z.literal(true),status:z.literal('reserved'),file:statusFileSchema}).strict().parse(raw),saved=tracker.files.find(v=>v.id===uploadId),f=value.file;
 if(!saved||f.uploadId!==uploadId||f.field!==saved.field||f.filename!==saved.filename||f.mime!==saved.mime||f.bytes!==saved.bytes)throw Error('Upload reservation response mismatch.');return value;
}
