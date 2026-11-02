import {z} from 'zod';
const uuid=z.string().uuid();
export const recordOwnershipCommand=z.discriminatedUnion('action',[
 z.object({action:z.literal('read'),site:uuid,record:uuid}).strict(),
 z.object({action:z.literal('assign'),site:uuid,record:uuid,owner:uuid,expected:z.number().int().min(0).max(2147483646)}).strict(),
]);
const ownership=z.object({websiteId:uuid,recordId:uuid,ownerId:uuid,ownerEmail:z.string().max(320).nullable(),eligible:z.boolean(),version:z.number().int().min(0).max(2147483647),canAssign:z.boolean(),owners:z.array(z.object({id:uuid,email:z.string().max(320).nullable()}).strict()).max(200)}).strict();
export type RecordOwnership=z.infer<typeof ownership>;
export function verifiedRecordOwnership(value:unknown,site:string,record:string){
 const result=ownership.parse(value);
 if(result.websiteId!==site||result.recordId!==record||new Set(result.owners.map(o=>o.id)).size!==result.owners.length||(!result.canAssign&&result.owners.length)||(!result.eligible&&result.ownerEmail!==null))throw Error('Ownership information is unavailable. Reload before assigning an owner.');
 return result;
}
