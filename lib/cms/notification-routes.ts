import {z} from 'zod';
const uuid=z.string().uuid(),email=z.email().max(254).refine(v=>!/[\r\n]/.test(v));
export const notificationRecipients=z.object({label:z.string().trim().min(1).max(100),from:email,to:z.array(email).min(1).max(20).refine(v=>new Set(v.map(s=>s.toLowerCase())).size===v.length)}).strict();
const base={site:uuid,routeId:uuid,expected:uuid.nullable(),requestId:uuid};
export const notificationRouteCommand=z.discriminatedUnion('action',[
 z.object({...base,action:z.literal('save'),payload:notificationRecipients}).strict(),
 z.object({...base,expected:uuid,action:z.enum(['approve','disable']),payload:z.object({}).strict()}).strict(),
]);
export type NotificationRouteCommand=z.infer<typeof notificationRouteCommand>;
export const notificationRouteView=notificationRecipients.extend({websiteId:uuid,routeId:uuid,revisionId:uuid,enabled:z.boolean(),approvedAt:z.iso.datetime({offset:true}).nullable(),approvedBy:uuid.nullable()}).strict();
export function verifyNotificationRouteReceipt(raw:unknown,command:NotificationRouteCommand){
 const value=z.object({websiteId:uuid,requestId:uuid,actorId:uuid,action:z.enum(['save','approve','disable']),route:notificationRouteView}).strict().parse(raw),r=value.route;
 if(value.websiteId!==command.site||value.requestId!==command.requestId||value.action!==command.action||r.websiteId!==command.site||r.routeId!==command.routeId||r.revisionId===command.expected)throw Error('Notification route receipt mismatch.');
 if(command.action==='save'&&(r.label!==command.payload.label||r.from!==command.payload.from||JSON.stringify(r.to)!==JSON.stringify(command.payload.to)))throw Error('Notification recipients changed.');
 if(command.action==='approve'?(!r.enabled||!r.approvedAt||r.approvedBy!==value.actorId):(r.enabled||r.approvedAt!==null||r.approvedBy!==null))throw Error('Notification route approval mismatch.');
 return value;
}
export function verifyNotificationRoutes(raw:unknown,site:string,after:string|null){
 const value=z.object({websiteId:uuid,after:uuid.nullable(),canEdit:z.boolean(),canApprove:z.boolean(),items:z.array(notificationRouteView).max(50)}).strict().parse(raw);
 if(value.websiteId!==site||value.after!==after||new Set(value.items.map(r=>r.routeId)).size!==value.items.length||value.items.some((r,i)=>r.websiteId!==site||(after!==null&&r.routeId<=after)||(i>0&&r.routeId<=value.items[i-1].routeId)))throw Error('Notification route list mismatch.');return value;
}

export function verifyNotificationRouteResolution(raw:unknown,command:NotificationRouteCommand){
 const value=z.object({websiteId:uuid,requestId:uuid,actorId:uuid,routeId:uuid,cancelled:z.boolean(),receipt:z.unknown().nullable()}).strict().parse(raw);
 if(value.websiteId!==command.site||value.requestId!==command.requestId||value.routeId!==command.routeId)throw Error('Notification resolution mismatch.');
 if(value.cancelled){if(value.receipt!==null)throw Error('Invalid cancelled receipt.');}
 else{const receipt=verifyNotificationRouteReceipt(value.receipt,command);if(receipt.actorId!==value.actorId)throw Error('Notification resolution actor mismatch.');}
 return value;
}

export function verifyNotificationRouteHistory(raw:unknown,site:string,routeId:string,after:string|null){
 const value=z.object({websiteId:uuid,routeId:uuid,after:uuid.nullable(),items:z.array(z.object({revisionId:uuid,actorId:uuid,action:z.enum(['save','approve','disable']),createdAt:z.iso.datetime({offset:true}),snapshot:notificationRouteView}).strict()).max(30)}).strict().parse(raw);
 if(value.websiteId!==site||value.routeId!==routeId||value.after!==after||new Set(value.items.map(v=>v.revisionId)).size!==value.items.length)throw Error('Recipient history response mismatch.');
 for(let i=0;i<value.items.length;i++){const v=value.items[i],s=v.snapshot;if(v.revisionId===after||s.websiteId!==site||s.routeId!==routeId||s.revisionId!==v.revisionId)throw Error('Recipient history identity mismatch.');
  if(v.action==='approve'?(!s.enabled||s.approvedBy!==v.actorId||s.approvedAt===null):(s.enabled||s.approvedBy!==null||s.approvedAt!==null))throw Error('Recipient history approval mismatch.');
  // PostgreSQL timestamps retain microseconds; preserve them for ordering instead of Date.parse millisecond truncation.
  if(i){const previous=value.items[i-1];const micros=(text:string)=>{const match=/\.(\d+)/.exec(text);return BigInt(Date.parse(text))*BigInt(1000)+BigInt((match?.[1]??'').padEnd(6,'0').slice(3,6)||'0');};const a=micros(previous.createdAt),b=micros(v.createdAt);if(a<b||(a===b&&previous.revisionId<=v.revisionId))throw Error('Recipient history order mismatch.');}
 }
 return value;
}
