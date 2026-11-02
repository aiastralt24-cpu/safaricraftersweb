import {z} from 'zod';
const uuid=z.string().uuid();
export const pageUrlImpactCommand=z.object({site:uuid,record:uuid,revision:uuid,path:z.string().min(1).max(500),after:uuid.nullable().default(null)}).strict();
export const pageUrlImpactSchema=z.object({snapshot:z.string().regex(/^[a-f0-9]{32}$/),recordId:uuid,revisionId:uuid,currentPath:z.string().nullable(),proposedPath:z.string(),locale:z.string(),published:z.boolean(),status:z.enum(['fixed_route','invalid_or_reserved','unchanged','occupied','eligible']),redirectDecisionRequired:z.boolean(),coverage:z.literal('visible_saved_local_links_and_record_references'),items:z.array(z.object({recordId:uuid,title:z.string(),type:z.string(),path:z.string().nullable(),locale:z.string(),draftLink:z.boolean(),publishedLink:z.boolean(),draftReference:z.boolean(),publishedReference:z.boolean()}).strict()).max(50),nextCursor:uuid.nullable()}).strict();
export function parsePageUrlImpact(value:unknown,command:z.infer<typeof pageUrlImpactCommand>){
 const result=pageUrlImpactSchema.parse(value);
 if(result.recordId!==command.record||result.revisionId!==command.revision||result.proposedPath!==command.path||result.redirectDecisionRequired!==(result.published&&result.currentPath!==result.proposedPath)
  ||result.items.some((item,index)=>item.recordId<=(index?result.items[index-1].recordId:command.after??'')||![item.draftLink,item.publishedLink,item.draftReference,item.publishedReference].some(Boolean))
  ||result.nextCursor!==null&&(result.items.length!==50||result.nextCursor!==result.items.at(-1)?.recordId))throw Error('The URL impact response does not match this review. Refresh and review again.');
 return result;
}
