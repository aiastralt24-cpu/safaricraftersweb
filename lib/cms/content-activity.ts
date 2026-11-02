import {z} from 'zod';
export const activityCursor=z.string().regex(/^[1-9][0-9]{0,18}$/).refine(value=>BigInt(value)<=BigInt('9223372036854775807'));
const uuid=z.string().uuid();
const item=z.object({id:activityCursor,actorId:uuid.nullable(),actorLabel:z.string().max(320).nullable().optional().default(null),action:z.string(),record:uuid,revision:uuid.nullable(),createdAt:z.string().datetime({offset:true}),title:z.string(),type:z.string(),locale:z.string()}).strict();
const schema=z.object({websiteId:uuid,available:z.boolean(),actorLabelsAvailable:z.boolean().optional().default(false),items:z.array(item).max(20),nextCursor:activityCursor.nullable()}).strict();
export type ContentActivity=z.infer<typeof schema>;
export function verifiedContentActivity(input:unknown,site:string,before:string|null=null){
 const result=schema.parse(input);if(result.websiteId!==site)throw Error('Activity website mismatch.');
 if(!result.available&&(result.items.length||result.nextCursor))throw Error('Activity permission mismatch.');
 if(!result.actorLabelsAvailable&&result.items.some(row=>row.actorLabel!==null))throw Error('Activity identity permission mismatch.');
 let previous=before;for(const row of result.items){if(previous!==null&&BigInt(row.id)>=BigInt(previous))throw Error('Activity ordering mismatch.');previous=row.id;}
 if(result.nextCursor!==null&&(!result.items.length||result.nextCursor!==previous))throw Error('Activity cursor mismatch.');return result;
}

export function filterContentActivity(items:ContentActivity['items'],actor:string,action:string){return items.filter(row=>(!actor||(row.actorId??'system')===actor)&&(!action||row.action===action));}
