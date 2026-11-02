import {z} from 'zod';
import {documentDateSchema} from './documents.ts';
const uuid=z.string().uuid();
export const dateMonitorQuery=z.object({site:uuid,after:uuid.optional(),scope:z.enum(['published','draft']).default('published'),filter:z.enum(['attention','expired','expiring','review','invalid','all']).default('attention')}).strict();
const row=z.object({record:uuid,revision:uuid,title:z.string(),locale:z.string(),expiresOn:documentDateSchema.nullable(),reviewOn:documentDateSchema.nullable(),expired:z.boolean(),expiring:z.boolean(),reviewOverdue:z.boolean(),invalidDates:z.boolean(),expiryPolicy:z.enum(['warn','blockPublication','removeAvailability']).nullable()}).strict();
const schema=z.object({websiteId:uuid,scope:dateMonitorQuery.shape.scope,filter:dateMonitorQuery.shape.filter,asOf:documentDateSchema,items:z.array(row).max(20),nextCursor:uuid.nullable()}).strict();
export type DocumentDateMonitor=z.infer<typeof schema>;
export function verifiedDateMonitor(input:unknown,query:z.infer<typeof dateMonitorQuery>){
 const value=schema.parse(input);if(value.websiteId!==query.site||value.scope!==query.scope||value.filter!==query.filter)throw Error('Document date report mismatch.');
 let previous=query.after??null;const end=new Date(value.asOf+'T00:00:00Z');end.setUTCDate(end.getUTCDate()+30);const horizon=end.toISOString().slice(0,10);
 for(const item of value.items){if(previous&&item.record<=previous)throw Error('Document date cursor mismatch.');previous=item.record;
 if(item.expired!==Boolean(item.expiresOn&&item.expiresOn<value.asOf)||item.expiring!==Boolean(item.expiresOn&&item.expiresOn>=value.asOf&&item.expiresOn<=horizon)||item.reviewOverdue!==Boolean(item.reviewOn&&item.reviewOn<value.asOf))throw Error('Document date status mismatch.');
 const matches={all:true,attention:item.expired||item.expiring||item.reviewOverdue||item.invalidDates,expired:item.expired,expiring:item.expiring,review:item.reviewOverdue,invalid:item.invalidDates};if(!matches[query.filter])throw Error('Document date filter mismatch.');
 }if(value.nextCursor!==null&&(!value.items.length||value.nextCursor!==previous))throw Error('Document date continuation mismatch.');return value;
}
