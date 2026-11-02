import {z} from 'zod';
import {notificationEmailRouteSchema,notificationEmailSchema} from './lead-notification-email.ts';

const uuid=z.string().uuid();
export const notificationProbeOriginSchema=z.string().url().refine(value=>{
 const url=new URL(value);
 return url.protocol==='https:'&&!url.username&&!url.password&&url.pathname==='/'&&!url.search&&!url.hash&&value===url.origin;
});
export const notificationProbeIdentitySchema=z.object({
 probeId:uuid,websiteId:uuid,routeId:uuid,routeRevision:uuid,deploymentId:uuid,cmsOrigin:notificationProbeOriginSchema,
}).strict();
export type NotificationProbeIdentity=z.infer<typeof notificationProbeIdentitySchema>;

/** Configuration comes from an authorized, current database route, never from a
 * visitor or an editable test-recipient field. This function does not authorize sending. */
export function prepareNotificationProbeEmail(rawIdentity:unknown,rawRoute:unknown){
 const identity=notificationProbeIdentitySchema.parse(rawIdentity),route=notificationEmailRouteSchema.parse(rawRoute);
 if(route.websiteId!==identity.websiteId||route.routeId!==identity.routeId||route.revisionId!==identity.routeRevision)throw Error('Notification verification route mismatch.');
 return notificationEmailSchema.parse({from:route.from,to:route.to,subject:'CMS notification delivery verification',text:[
  'CMS notification delivery verification',
  'An administrator requested this message to verify the configured notification recipients.',
  'This is a setup check, not a customer enquiry or job application.',
  `Verification reference: ${identity.probeId}`,
  '',
  `Open the CMS: ${identity.cmsOrigin}/cms`,
  'Report receipt to the administrator who requested the check. Provider acceptance alone does not confirm inbox delivery.',
 ].join('\n')});
}

export const notificationProbeDispatchSchema=notificationProbeIdentitySchema.extend({
 state:z.enum(['ready','accepted','unavailable','reconciliation_required']),
 firstAttemptAt:z.iso.datetime({offset:true}),idempotencyKey:z.string(),
 message:notificationEmailSchema.nullable(),providerMessageId:uuid.nullable(),
}).strict().superRefine((value,ctx)=>{
 if(value.idempotencyKey!==`cms-notification:${value.probeId}`||
  (value.state==='ready')!==(value.message!==null)||
  (value.state==='accepted')!==(value.providerMessageId!==null))ctx.addIssue({code:'custom',message:'Invalid notification verification state.'});
});
type Dispatch=z.infer<typeof notificationProbeDispatchSchema>;
type Dependencies={
 /** Must recheck authorization, current binding/route and any lease before returning ready. */
 read:(identity:NotificationProbeIdentity)=>Promise<unknown>;
 /** Must atomically freeze the message/key/time before returning. Existing requests
  * must return the same dispatch; caller cannot replace frozen configuration. */
 prepare:(identity:NotificationProbeIdentity)=>Promise<unknown>;
 send:(request:{idempotencyKey:string;firstAttemptAt:string;message:z.infer<typeof notificationEmailSchema>},timeoutMs:number)=>Promise<{provider:'resend';messageId:string}>;
 /** Must durably bind the provider receipt to this exact authorized probe. */
 accept:(identity:NotificationProbeIdentity,providerMessageId:string)=>Promise<unknown>;
 now?:()=>number;
};

/** Server-only orchestration contract. No runtime endpoint is enabled by this
 * module. Storage/authorization adapters are required before use with a provider. */
export async function deliverNotificationProbe(rawIdentity:unknown,dependencies:Dependencies,timeoutMs=10000):Promise<Dispatch>{
 const identity=notificationProbeIdentitySchema.parse(rawIdentity);
 if(!Number.isInteger(timeoutMs)||timeoutMs<1000||timeoutMs>90000)throw Error('Invalid notification verification timeout.');
 const now=dependencies.now??Date.now,deadline=now()+timeoutMs;
 const budget=()=>{const remaining=deadline-now();if(!Number.isFinite(remaining)||remaining<1000)throw Error('Notification verification budget exhausted.');return Math.min(10000,remaining);};
 const verify=(raw:unknown)=>{
  const dispatch=notificationProbeDispatchSchema.parse(raw);
  for(const key of Object.keys(identity) as (keyof NotificationProbeIdentity)[])if(dispatch[key]!==identity[key])throw Error('Notification verification identity mismatch.');
  return dispatch;
 };
 budget();let raw=await dependencies.read(identity);
 if(raw===null){budget();raw=await dependencies.prepare(identity);}
 const dispatch=verify(raw);
 if(dispatch.state==='accepted')return dispatch;
 if(dispatch.state!=='ready'||!dispatch.message)throw Error('Notification verification requires attention.');
 // Reconstruct only to verify the frozen template, never to replace it on retry.
 const expected=prepareNotificationProbeEmail(identity,{websiteId:identity.websiteId,routeId:identity.routeId,revisionId:identity.routeRevision,enabled:true,from:dispatch.message.from,to:dispatch.message.to});
 if(JSON.stringify(dispatch.message)!==JSON.stringify(expected))throw Error('Notification verification message mismatch.');
 const remaining=budget(),age=now()-Date.parse(dispatch.firstAttemptAt);
 if(!Number.isFinite(age)||age<0||age+remaining>=86400000)throw Error('Notification verification requires reconciliation.');
 const receipt=await dependencies.send({idempotencyKey:dispatch.idempotencyKey,firstAttemptAt:dispatch.firstAttemptAt,message:dispatch.message},remaining);
 if(receipt.provider!=='resend'||!uuid.safeParse(receipt.messageId).success)throw Error('Invalid notification verification receipt.');
 // Persist even when the provider consumed the remaining time budget.
 const accepted=verify(await dependencies.accept(identity,receipt.messageId));
 if(accepted.state!=='accepted'||accepted.firstAttemptAt!==dispatch.firstAttemptAt||accepted.providerMessageId!==receipt.messageId)throw Error('Notification verification acceptance could not be confirmed.');
 return accepted;
}
