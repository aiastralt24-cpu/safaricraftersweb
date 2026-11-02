import {z} from 'zod';
import {releaseManifestSchema} from './publication-release.ts';
const uuid=z.string().uuid(),instant=z.iso.datetime({offset:true});
export const scheduledReleaseRows=z.array(z.object({id:uuid,site:uuid,request:uuid,items:releaseManifestSchema.shape.items,runAt:instant,status:z.enum(['pending','running','published','blocked','cancelled']),attempts:z.number().int().min(0).max(8),errorCode:z.enum(['validation_failed','validation_unavailable','worker_lease_expired','publication_guard_failed']).nullable(),createdAt:instant}).strict()).max(20);
export function parseScheduledReleaseList(value:unknown,site:string){
 const response=z.object({site:uuid,schedules:scheduledReleaseRows,nextCursor:uuid.nullable()}).strict().parse(value);
 const rows=response.schedules;
 if(response.site.toLowerCase()!==site.toLowerCase()||rows.some(row=>row.site.toLowerCase()!==site.toLowerCase()||new Set(row.items.map(item=>item.record.toLowerCase())).size!==row.items.length)||new Set(rows.map(row=>row.id.toLowerCase())).size!==rows.length||response.nextCursor!==(rows.length===20?rows.at(-1)!.id:null))throw Error('Schedule information does not match this website.');
 return response;
}
