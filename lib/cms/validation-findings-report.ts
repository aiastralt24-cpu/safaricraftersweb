import {z} from 'zod';
const uuid=z.string().uuid(),date=z.string().datetime({offset:true});
export const findingsQuery=z.object({site:uuid,after:uuid.optional(),severity:z.enum(['all','error','warning']).default('all'),search:z.string().max(200).default('')}).strict();
const finding=z.object({field:z.string(),code:z.string(),severity:z.enum(['error','warning']),message:z.string()}).strict();
const schema=z.object({websiteId:uuid,severity:findingsQuery.shape.severity,search:z.string().max(200),items:z.array(z.object({record:uuid,revision:uuid,title:z.string(),type:z.string(),locale:z.string(),checkedAt:date,expiresAt:date.nullable(),stale:z.boolean(),findings:z.array(finding).min(1).max(25),matchingCount:z.number().int().positive()}).strict()).max(20),nextCursor:uuid.nullable()}).strict();
export type FindingsReport=z.infer<typeof schema>;
export function verifiedFindingsReport(input:unknown,query:z.infer<typeof findingsQuery>){const value=schema.parse(input);if(value.websiteId!==query.site||value.severity!==query.severity||value.search!==query.search)throw Error('Validation report response mismatch.');let previous=query.after??null;
 for(const item of value.items){if(previous&&item.record<=previous)throw Error('Validation report ordering mismatch.');previous=item.record;if(item.findings.length!==Math.min(item.matchingCount,25))throw Error('Validation finding count mismatch.');if(query.severity!=='all'&&item.findings.some(f=>f.severity!==query.severity))throw Error('Validation severity mismatch.');}
 if(value.nextCursor!==null&&(!value.items.length||value.nextCursor!==previous))throw Error('Validation report cursor mismatch.');return value;}
