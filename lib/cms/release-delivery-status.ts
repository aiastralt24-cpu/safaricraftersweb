import {z} from 'zod';
const uuid=z.string().uuid();
export const releaseDeliveryStatusSchema=z.object({site:uuid,request:uuid,release:uuid,status:z.enum(['committed','cancelled']),items:z.array(z.object({record:uuid,revision:uuid,deliveryJob:uuid,status:z.enum(['pending','running','retry_pending','failed','delivered','superseded']),attempts:z.number().int().min(0).max(8)}).strict()).max(50)}).strict().superRefine((value,ctx)=>{
 if((value.status==='cancelled'&&value.items.length!==0)||(value.status==='committed'&&value.items.length===0)||new Set(value.items.map(item=>item.record)).size!==value.items.length||new Set(value.items.map(item=>item.deliveryJob)).size!==value.items.length)ctx.addIssue({code:'custom',message:'Invalid release delivery members.'});
});
export function summarizeReleaseDelivery(input:unknown){
 const result=releaseDeliveryStatusSchema.parse(input);
 if(result.status==='cancelled')return {result,summary:'cancelled' as const};
 const statuses=result.items.map(item=>item.status);
 const summary=statuses.includes('failed')?'needs_attention':statuses.includes('superseded')?'superseded':statuses.every(status=>status==='delivered')?'delivered':'in_progress';
 return {result,summary} as const;
}
