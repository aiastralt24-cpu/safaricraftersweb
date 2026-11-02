import {z} from 'zod';
const uuid=z.string().uuid();
const schema=z.object({websiteId:uuid,leadId:uuid,hasEmail:z.boolean(),items:z.array(z.object({id:uuid,status:z.enum(['new','assigned','contacted','qualified','in_progress','won','lost','invalid']),createdAt:z.string().datetime({offset:true}),version:z.number().int().positive(),reason:z.literal('matching_email')}).strict()).max(20),nextCursor:uuid.nullable()}).strict();
export type LeadDuplicates=z.infer<typeof schema>;
export function verifiedLeadDuplicates(input:unknown,site:string,lead:string,after:string|null=null){
 const value=schema.parse(input);if(value.websiteId!==site||value.leadId!==lead)throw Error('Duplicate enquiry response mismatch.');let previous=after;
 for(const item of value.items){if(item.id===lead||previous&&item.id<=previous)throw Error('Duplicate enquiry ordering mismatch.');previous=item.id;}
 if(!value.hasEmail&&(value.items.length||value.nextCursor)||value.nextCursor!==null&&(value.items.length!==20||value.nextCursor!==previous))throw Error('Duplicate enquiry cursor mismatch.');return value;
}
