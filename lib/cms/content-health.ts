import {z} from 'zod';
const uuid=z.string().uuid();
export const contentHealthRowSchema=z.object({id:uuid,type:z.string(),title:z.string(),locale:z.string(),revision:uuid,publishedRevision:uuid.nullable(),reviewStatus:z.enum(['draft','in_review','changes_requested','approved']),validationState:z.enum(['unsupported','not_checked','stale','passed','failed']),checkedAt:z.string().datetime({offset:true}).nullable(),expiresAt:z.string().datetime({offset:true}).nullable(),errors:z.number().int().nonnegative(),warnings:z.number().int().nonnegative(),canRequest:z.boolean()}).strict();
export type ContentHealthRow=z.infer<typeof contentHealthRowSchema>;
export const contentHealthSchema=z.object({websiteId:uuid,items:z.array(contentHealthRowSchema).max(50),nextCursor:uuid.nullable()}).strict();
export function verifiedContentHealth(input:unknown,site:string,after:string|null=null){
 const value=contentHealthSchema.parse(input);if(value.websiteId!==site)throw Error('Content health website mismatch.');
 let previous=after;
 for(const row of value.items){if(previous!==null&&row.id<=previous)throw Error('Content health pagination mismatch.');previous=row.id;}
 if(value.nextCursor!==null&&(!value.items.length||value.nextCursor!==previous))throw Error('Content health cursor mismatch.');
 return value;
}
export const validationStateLabels={unsupported:'Checks not available',not_checked:'Needs trusted checks',stale:'Checks need refreshing',passed:'Latest checks passed',failed:'Checks found errors'};
export function effectiveValidationState(row:ContentHealthRow,now=Date.now()){
 return (row.validationState==='passed'||row.validationState==='failed')&&(!row.expiresAt||Date.parse(row.expiresAt)<=now)?'stale':row.validationState;
}
