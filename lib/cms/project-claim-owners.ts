import {z} from 'zod';
const uuid=z.string().uuid();
const scope={site:uuid,record:uuid,revision:uuid};
export const projectClaimOwnerCommand=z.discriminatedUnion('action',[
 z.object({action:z.literal('list'),...scope}).strict(),
 z.object({action:z.literal('assign'),...scope,claim:uuid,owner:uuid.nullable(),expected:z.number().int().min(0).max(2147483646)}).strict(),
]);
const schema=z.object({websiteId:uuid,recordId:uuid,revisionId:uuid,canAssign:z.boolean(),owners:z.array(z.object({id:uuid,email:z.string().nullable()}).strict()).max(200),claims:z.array(z.object({claimId:uuid,ownerId:uuid.nullable(),version:z.number().int().nonnegative(),eligible:z.boolean()}).strict()).max(30)}).strict();
export type ProjectClaimOwners=z.infer<typeof schema>;
export function verifiedProjectClaimOwners(input:unknown,site:string,record:string,revision:string){const value=schema.parse(input);if(value.websiteId!==site||value.recordId!==record||value.revisionId!==revision||new Set(value.owners.map(o=>o.id)).size!==value.owners.length||new Set(value.claims.map(c=>c.claimId)).size!==value.claims.length||value.claims.some(c=>!c.ownerId&&c.eligible))throw Error('Project claim assignment response mismatch.');return value;}
