import {z} from 'zod';
const uuid=z.string().uuid(),instant=z.string().datetime({offset:true});
export const deliveryFilter=z.enum(['attention','failed','retry_pending','pending','running','delivered','superseded','all']);
export const deliveryMonitorQuery=z.object({site:uuid,after:uuid.optional(),filter:deliveryFilter.default('attention')}).strict();
const schema=z.object({websiteId:uuid,filter:deliveryFilter,checkedAt:instant,items:z.array(z.object({id:uuid,record:uuid,revision:uuid.nullable(),title:z.string(),locale:z.string(),operation:z.enum(['publish','unpublish']),status:z.enum(['failed','retry_pending','pending','running','delivered','superseded']),attempts:z.number().int().nonnegative(),createdAt:instant,canRetry:z.boolean().optional().default(false)}).strict()).max(20),nextCursor:uuid.nullable()}).strict();
export type DeliveryMonitor=z.infer<typeof schema>;
export function verifiedDeliveryMonitor(input:unknown,query:z.infer<typeof deliveryMonitorQuery>){const value=schema.parse(input);if(value.websiteId!==query.site||value.filter!==query.filter)throw Error('Delivery monitor response mismatch.');let previous=query.after??null;
 for(const item of value.items){if(previous&&item.id<=previous)throw Error('Delivery monitor ordering mismatch.');previous=item.id;if(item.canRetry&&(item.status!=='failed'||item.attempts<8))throw Error('Delivery retry capability mismatch.');if(query.filter!=='all'&&(query.filter==='attention'?!['failed','retry_pending'].includes(item.status):item.status!==query.filter))throw Error('Delivery monitor filter mismatch.');}
 if(value.nextCursor!==null&&(!value.items.length||value.nextCursor!==previous))throw Error('Delivery monitor cursor mismatch.');return value;}
