import {z} from 'zod';
import {legalPathSchema} from './legal-page.ts';
import {journalSourceDigest as hash} from './journal-migration-client.ts';
const uuid=z.string().uuid(),digest=z.string().regex(/^[a-f0-9]{64}$/),object=z.record(z.string(),z.unknown());
export const legalMigrationTarget=z.object({path:legalPathSchema,recordId:uuid.nullable(),expectedRevision:uuid.nullable()}).strict().refine(item=>Boolean(item.recordId)===Boolean(item.expectedRevision));
export type LegalMigrationTarget=z.infer<typeof legalMigrationTarget>;
const item=z.object({path:legalPathSchema,recordId:uuid.nullable(),expectedRevision:uuid.nullable(),sourceSha256:digest,payload:object,before:object.nullable()}).strict();
const reviewSchema=z.object({version:z.literal('legal-migration-1'),sourceDigest:digest,reviewDigest:digest,items:z.array(item).min(1).max(3),applyAvailable:z.literal(true),notice:z.string()}).strict();
export type LegalMigrationReview=z.infer<typeof reviewSchema>;
export async function verifyLegalReview(input:unknown,site:string,targets:LegalMigrationTarget[]){
 const value=reviewSchema.parse(input),sorted=[...targets].sort((a,b)=>a.path.localeCompare(b.path));
 if(value.items.length!==sorted.length||new Set(value.items.map(item=>item.path)).size!==sorted.length||value.items.some((item,index)=>item.path!==sorted[index].path||item.recordId!==sorted[index].recordId||item.expectedRevision!==sorted[index].expectedRevision||Boolean(item.before)!==Boolean(item.recordId)))throw Error('Review does not match the selected legal pages.');
 const items=value.items.map(({before,...item})=>item);
 if(value.sourceDigest!==await hash(items.map(({path,sourceSha256,payload})=>({path,sourceSha256,payload})))||value.reviewDigest!==await hash({version:value.version,site,source:value.sourceDigest,items}))throw Error('The legal review content or identity changed.');
 return value;
}
const resultSchema=z.array(z.object({recordId:uuid,revisionId:uuid,path:legalPathSchema,sourceSha256:digest}).strict()).min(1).max(3);
const pendingSchema=z.object({version:z.literal(1),site:uuid,actorId:uuid,requestKey:uuid,sourceDigest:digest,reviewDigest:digest,targets:z.array(legalMigrationTarget).min(1).max(3),sources:z.array(z.object({path:legalPathSchema,sourceSha256:digest}).strict()).min(1).max(3)}).strict().refine(value=>value.targets.length===value.sources.length&&new Set(value.targets.map(item=>item.path)).size===value.targets.length&&new Set(value.sources.map(item=>item.path)).size===value.sources.length&&value.targets.every(target=>value.sources.some(source=>source.path===target.path)));
export type PendingLegalMigration=z.infer<typeof pendingSchema>;
export function legalRecoveryKey(site:string,actor:string){return `cms-legal-migration:${uuid.parse(site)}:${uuid.parse(actor)}`;}
export function readPendingLegalMigration(text:string|null,site:string,actorId:string){if(text===null)return null;if(text.length>10000)throw Error('Recovery data is too large.');const value=pendingSchema.parse(JSON.parse(text));if(value.site!==site||value.actorId!==actorId)throw Error('Recovery belongs to another account or website.');return value;}
export function verifyLegalReceipt(input:unknown,pending:PendingLegalMigration){
 const value=z.object({result:resultSchema}).parse(input).result;
 if(value.length!==pending.targets.length||['path','recordId','revisionId'].some(key=>new Set(value.map(item=>item[key as keyof typeof item])).size!==value.length)||value.some(item=>!pending.sources.some(source=>source.path===item.path&&source.sourceSha256===item.sourceSha256)||!pending.targets.some(target=>target.path===item.path&&(!target.recordId||target.recordId===item.recordId))))throw Error('Migration result does not match this request.');return value;
}
export function verifyLegalRecovery(input:unknown,pending:PendingLegalMigration){
 const value=z.discriminatedUnion('status',[z.object({status:z.literal('unconfirmed'),message:z.string()}).strict(),z.object({status:z.literal('complete'),requestKey:uuid,sourceDigest:digest,reviewDigest:digest,createdAt:z.string(),result:resultSchema}).strict()]).parse(input);
 if(value.status==='unconfirmed')return null;
 if(value.requestKey!==pending.requestKey||value.sourceDigest!==pending.sourceDigest||value.reviewDigest!==pending.reviewDigest)throw Error('Recovery does not match this request.');return verifyLegalReceipt(value,pending);
}
