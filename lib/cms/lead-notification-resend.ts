import {notificationDispatchTag} from './notification-provider-evidence.ts';
import {z} from 'zod';
import {notificationEmailSchema} from './lead-notification-email.ts';
const requestSchema=z.object({idempotencyKey:z.string().refine(v=>v.startsWith('cms-notification:')&&z.string().uuid().safeParse(v.slice('cms-notification:'.length)).success),firstAttemptAt:z.iso.datetime({offset:true}),message:notificationEmailSchema}).strict();
/** Single provider attempt, never a retry loop. The caller must durably freeze the
 * message, key and firstAttemptAt before the first call and store its receipt.
 * Ambiguous attempts beyond the provider's window need reconciliation, not resend. */
export function createResendNotificationTransport(apiKey:string,fetcher:typeof fetch=fetch,now:()=>number=Date.now){
 if(!apiKey||apiKey.length>4096||/[\s]/.test(apiKey))throw Error('Notification provider is not configured.');
 return async(raw:unknown,timeoutMs=10000):Promise<{provider:'resend';messageId:string}>=>{
  const request=requestSchema.parse(raw);
  if(!Number.isInteger(timeoutMs)||timeoutMs<100||timeoutMs>90000)throw Error('Invalid notification timeout.');
  const age=now()-Date.parse(request.firstAttemptAt);
  // Leave room for this request to complete within the 24-hour idempotency window.
  if(!Number.isFinite(age)||age<0||age+timeoutMs>=24*60*60*1000)throw Error('Notification delivery requires reconciliation.');
  try{
   const response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','Idempotency-Key':request.idempotencyKey},body:JSON.stringify({...request.message,tags:[notificationDispatchTag(request.idempotencyKey.slice('cms-notification:'.length))]}),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(timeoutMs)});
   if(!response.ok)throw Error('Provider rejection');
   const reader=response.body?.getReader();if(!reader)throw Error('Missing receipt');
   const chunks:Uint8Array[]=[];let bytes=0;
   try{while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>4096)throw Error('Oversized receipt');chunks.push(part.value);}}finally{await reader.cancel();}
   const buffer=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.byteLength;}
   const receipt=z.object({id:z.string().uuid()}).strict().parse(JSON.parse(new TextDecoder().decode(buffer)));
   return {provider:'resend',messageId:receipt.id};
  }catch{throw Error('Notification provider acceptance could not be confirmed.');}
 };
}
