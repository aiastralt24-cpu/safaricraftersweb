import {createHash} from 'node:crypto';
import {z} from 'zod';
import {enquiryFileReservationSchema} from './enquiry-file-session.ts';
import {checkEnquiryFileSessionReceipt,enquiryFileSessionIdentitySchema} from './enquiry-file-session-create.ts';
import {checkEnquiryFileTransfer,type EnquiryFileTransfer} from './enquiry-file-transfer.ts';
import type {EnquiryRpc} from './enquiry-database.ts';
export const enquiryFileControlSchema=z.discriminatedUnion('action',[
 enquiryFileSessionIdentitySchema.extend({action:z.literal('status')}).strict(),
 enquiryFileSessionIdentitySchema.extend({action:z.literal('cancel')}).strict(),
 enquiryFileSessionIdentitySchema.extend({action:z.literal('reserve'),upload:z.string().uuid(),file:enquiryFileReservationSchema}).strict(),
]);
function publicFile(v:EnquiryFileTransfer){return {uploadId:v.id,field:v.field,filename:v.filename,mime:v.mime,bytes:v.bytes,state:v.state};}
/** Possession-authorized control operations. Returned status is not permission to
 * submit or download; mutations recheck session/policy inside database locks. */
export async function controlEnquiryFiles(rpc:EnquiryRpc,consumeRate:()=>Promise<unknown>,input:unknown,token:unknown){
 const command=enquiryFileControlSchema.parse(input),secret=z.string().regex(/^[a-f0-9]{64}$/).parse(token);
 const rate=z.object({allowed:z.boolean(),retryAfter:z.number().int().min(1).max(600)}).strict().parse(await consumeRate());if(!rate.allowed)return {status:'rate_limited' as const,retryAfter:rate.retryAfter};
 const {site,form,revision,request,session}=command,identity={site,form,revision,request,session};
 const hash=createHash('sha256').update(secret).digest('hex'),args={p_site:site,p_form:form,p_revision:revision,p_request:request,p_session:session,p_token_hash:hash};
 if(command.action==='status'){
  const raw=z.object({session:z.unknown(),files:z.array(z.unknown()).max(50)}).strict().parse(await rpc('get_enquiry_file_status',args));
  const receipt=checkEnquiryFileSessionReceipt(raw.session,identity),seen=new Set<string>();
  const files=raw.files.map(item=>{const id=z.object({id:z.string().uuid()}).parse(item).id;const file=checkEnquiryFileTransfer(item,{...identity,upload:id});if(seen.has(id))throw Error('Duplicate attachment status.');seen.add(id);return publicFile(file);});
  return {status:'ok' as const,session:receipt,files};
 }
 if(command.action==='cancel'){
  const receipt=checkEnquiryFileSessionReceipt(await rpc('cancel_enquiry_file_session',args),identity);if(receipt.state!=='cancelled')throw Error('Attachment cancellation mismatch.');
  return {status:'cancelled' as const,session:receipt};
 }
 // Check full scope before calling the session-bound reservation procedure.
 checkEnquiryFileSessionReceipt(await rpc('get_enquiry_file_session',args),identity);
 const raw=await rpc('reserve_enquiry_file',{p_site:site,p_session:session,p_token_hash:hash,p_upload:command.upload,p_file:command.file});
 const file=checkEnquiryFileTransfer(raw,{...identity,upload:command.upload});
 for(const [key,value] of Object.entries(command.file)){if(file[key as keyof EnquiryFileTransfer]!==value)throw Error('Attachment reservation mismatch.');}
 return {status:'reserved' as const,file:publicFile(file)};
}
