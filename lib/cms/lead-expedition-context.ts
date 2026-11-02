import {z} from 'zod';
import {expeditionEnquirySelectionSchema} from './expedition-enquiry-context.ts';
const uuid=z.string().uuid();
const departure=z.object({id:z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/),date:z.iso.date(),endDate:z.iso.date().optional(),status:z.enum(['New','Filling fast','Full','Available']),availability:z.string().max(200)}).strict().refine(d=>!d.endDate||d.endDate>=d.date);
const snapshot=z.object({recordId:uuid,revisionId:uuid,path:z.string().max(119).regex(/^\/photo-expeditions\/[a-z0-9]+(?:-[a-z0-9]+)*$/),title:z.string().min(1).max(200),programmeStatus:z.enum(['preview','confirmed']),price:z.string().max(200),formId:uuid,formRevisionId:uuid,departure:departure.nullable()}).strict();
/** Historical lead evidence only; never refresh from current page content. */
export function readLeadExpeditionContext(attribution:unknown):{status:'none'}|{status:'invalid'}|{status:'ready';context:z.infer<typeof snapshot>}{
 if(!attribution||typeof attribution!=='object'||Array.isArray(attribution))return {status:'none'};
 const value=attribution as Record<string,unknown>;
 if(!Object.hasOwn(value,'expedition')&&!Object.hasOwn(value,'expeditionSelection'))return {status:'none'};
 const context=snapshot.safeParse(value.expedition),selection=expeditionEnquirySelectionSchema.safeParse(value.expeditionSelection);
 if(!context.success||!selection.success)return {status:'invalid'};
 const c=context.data,s=selection.data;
 if(c.recordId!==s.recordId||c.revisionId!==s.revisionId||c.path!==`/photo-expeditions/${s.slug}`||(c.departure?.id??null)!==s.departureId)return {status:'invalid'};
 return {status:'ready',context:c};
}
