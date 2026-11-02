import {z} from 'zod';
const uuid=z.string().uuid();
export const leadershipLibraryQuery=z.object({site:uuid,department:z.string().trim().max(120).default(''),search:z.string().trim().max(120).default(''),status:z.enum(['','draft','in_review','changes_requested','approved']).default(''),owned:z.enum(['all','mine']).default('all'),publication:z.enum(['','published','unpublished']).default(''),after:uuid.optional(),limit:z.coerce.number().int().min(1).max(100).default(50)}).strict();
const row=z.object({id:uuid,type:z.literal('leadership'),title:z.string(),path:z.string().regex(/^\/leadership\/[a-z0-9]+(?:-[a-z0-9]+)*$/),locale:z.string(),currentRevision:uuid,reviewStatus:z.enum(['draft','in_review','changes_requested','approved']),publishedRevision:uuid.nullable(),ownerId:uuid}).strict();
export type LeadershipLibraryRow=z.infer<typeof row>;
export function verifiedLeadershipLibrary(value:unknown,limit:number,after?:string){const parsed=z.object({records:z.array(row).max(100),next:uuid.nullable()}).strict().parse(value);
 if(parsed.records.length>limit||parsed.records.some((r,i)=>r.id<=(i?parsed.records[i-1].id:after??''))||(parsed.next!==null&&(parsed.records.length!==limit||parsed.next!==parsed.records.at(-1)?.id)))throw Error('Leadership library response is inconsistent. Refresh the search.');return parsed;}
