import {createHash} from 'node:crypto';
import {z} from 'zod';
import {notificationEmailSchema} from './lead-notification-email.ts';
const uuid=z.string().uuid();
export const notificationProviderExpectation=z.object({dispatchId:uuid,providerMessageId:uuid,firstAttemptAt:z.iso.datetime({offset:true}),message:notificationEmailSchema}).strict();
const providerRecord=z.object({object:z.literal('email'),id:uuid,from:z.string(),to:z.array(z.string()).min(1).max(20),subject:z.string(),text:z.string(),html:z.union([z.null(),z.literal('')]),cc:z.array(z.string()).length(0),bcc:z.array(z.string()).length(0),reply_to:z.array(z.string()).length(0),scheduled_at:z.null(),created_at:z.string(),tags:z.array(z.object({name:z.literal('cms_dispatch'),value:uuid}).strict()).length(1)});
export function notificationDispatchTag(id:string){return {name:'cms_dispatch',value:uuid.parse(id)};}
/** Only pass evidence obtained by the server's authenticated provider GET. This
 * pure verifier is not authorization and must never accept browser evidence. */
export function verifyResendNotificationEvidence(raw:unknown,expectedRaw:unknown,observedAt=Date.now()){
 const expected=notificationProviderExpectation.parse(expectedRaw),record=providerRecord.parse(raw);
 if(!Number.isFinite(observedAt)||record.id!==expected.providerMessageId||record.tags[0].value!==expected.dispatchId)throw Error('Notification provider identity mismatch.');
 const message=notificationEmailSchema.parse({from:record.from,to:record.to,subject:record.subject,text:record.text});
 if(JSON.stringify(message)!==JSON.stringify(expected.message))throw Error('Notification provider message mismatch.');
 // The provider documents PostgreSQL-style UTC timestamps as well as ISO timestamps.
 const timestamp=record.created_at.replace(/^([0-9]{4}-[0-9]{2}-[0-9]{2}) /,'$1T').replace(/([+-][0-9]{2})$/,'$1:00');
 const acceptedAt=z.iso.datetime({offset:true}).parse(timestamp),accepted=Date.parse(acceptedAt);
 if(accepted<Date.parse(expected.firstAttemptAt)-5000||accepted>observedAt+5000)throw Error('Notification provider time mismatch.');
 return {provider:'resend' as const,dispatchId:expected.dispatchId,providerMessageId:record.id,acceptedAt,observedAt:new Date(observedAt).toISOString(),messageDigest:createHash('sha256').update('cms-notification-email-v1\0').update(JSON.stringify(message)).digest('hex')};
}
/** Retrieval only: this function never sends, retries or changes an email. */
export function createResendNotificationEvidenceReader(apiKey:string,fetcher:typeof fetch=fetch,now:()=>number=Date.now){
 if(!apiKey||apiKey.length>4096||/\s/.test(apiKey))throw Error('Notification provider is not configured.');
 return async(expectedRaw:unknown)=>{
  const expected=notificationProviderExpectation.parse(expectedRaw);
  try{
   const response=await fetcher(`https://api.resend.com/emails/${expected.providerMessageId}`,{method:'GET',headers:{Authorization:`Bearer ${apiKey}`},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw Error();const reader=response.body?.getReader();if(!reader)throw Error();const chunks:Uint8Array[]=[];let bytes=0;
   try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>128000)throw Error();chunks.push(value);}}finally{await reader.cancel();}
   const raw=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));
   return verifyResendNotificationEvidence(raw,expected,now());
  }catch{throw Error('Notification provider evidence could not be verified.');}
 };
}
