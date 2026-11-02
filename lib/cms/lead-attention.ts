import {z} from 'zod';
const uuid=z.string().uuid(),instant=z.string().datetime({offset:true});
export const leadAttentionFilter=z.enum(['attention','unassigned','overdue']);
const schema=z.object({websiteId:uuid,filter:leadAttentionFilter,asOf:instant,items:z.array(z.object({id:uuid,status:z.enum(['new','assigned','contacted','qualified','in_progress']),priority:z.enum(['low','normal','high']),version:z.number().int().positive(),createdAt:instant,nextFollowUp:instant.nullable(),unassigned:z.boolean(),overdue:z.boolean()}).strict()).max(20),nextCursor:uuid.nullable()}).strict();
export type LeadAttention=z.infer<typeof schema>;
export function verifiedLeadAttention(input:unknown,site:string,filter:LeadAttention['filter'],after:string|null=null){
 const value=schema.parse(input);if(value.websiteId!==site||value.filter!==filter)throw Error('Enquiry attention response mismatch.');let previous=after;
 for(const item of value.items){if(previous&&item.id<=previous)throw Error('Enquiry attention ordering mismatch.');previous=item.id;
 if(item.overdue!==Boolean(item.nextFollowUp&&Date.parse(item.nextFollowUp)<Date.parse(value.asOf)))throw Error('Enquiry follow-up status mismatch.');
 if(filter==='unassigned'?!item.unassigned:filter==='overdue'?!item.overdue:!item.unassigned&&!item.overdue)throw Error('Enquiry attention filter mismatch.');
 }if(value.nextCursor!==null&&(!value.items.length||value.nextCursor!==previous))throw Error('Enquiry attention cursor mismatch.');return value;
}
