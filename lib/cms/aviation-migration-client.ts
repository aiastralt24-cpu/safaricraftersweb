import {z} from 'zod';
import {journalSourceDigest as hash} from './journal-migration-client.ts';
import {aviationMigrationDependencies,planPrivateAviationMigration} from './private-aviation-migration.ts';
import {aviationMediaEvidenceSchema,verifyAviationMigrationMedia} from './aviation-migration-media.ts';
const uuid=z.string().uuid(),digest=z.string().regex(/^[a-f0-9]{64}$/),object=z.record(z.string(),z.unknown());
export const aviationMigrationSelectionSchema=z.object({recordId:uuid.nullable(),expectedRevision:uuid.nullable(),bindings:z.array(z.object({sourcePath:z.string().min(1).max(500),sourceSha256:digest,assetId:z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/)}).strict()).length(5)}).strict().refine(value=>Boolean(value.recordId)===Boolean(value.expectedRevision)&&new Set(value.bindings.map(b=>b.assetId)).size===5&&new Set(value.bindings.map(b=>b.sourcePath)).size===5);
export type AviationMigrationSelection=z.infer<typeof aviationMigrationSelectionSchema>;
const reviewSchema=z.object({version:z.literal('aviation-migration-review-1'),sourceDigest:digest,reviewDigest:digest,before:object.nullable(),proposal:object,metadataChanges:z.array(z.object({field:z.string(),before:z.string(),proposed:z.string(),reason:z.string()}).strict()).length(2),verification:z.object({verified:z.boolean(),evidence:aviationMediaEvidenceSchema,unavailable:z.array(z.string()).max(5)}).strict(),applyAvailable:z.boolean(),findings:z.array(z.object({code:z.string(),message:z.string()}).strict()).max(30),notice:z.string()}).strict();
export type AviationMigrationReview=z.infer<typeof reviewSchema>;
function mediaBindings(selection:AviationMigrationSelection){return selection.bindings.map(({sourcePath,assetId,sourceSha256})=>({kind:sourcePath.endsWith('.mp4')?'video' as const:'image' as const,assetId,sourceSha256}));}
export async function verifyAviationReview(input:unknown,site:string,selection:AviationMigrationSelection){
 uuid.parse(site);const selected=aviationMigrationSelectionSchema.parse(selection),value=reviewSchema.parse(input),plan=planPrivateAviationMigration(aviationMigrationDependencies,selected.bindings);
 if(plan.missingMedia.length)throw Error('Aviation media mappings are incomplete.');
 const checked=verifyAviationMigrationMedia(mediaBindings(selected),value.verification.evidence);
 if(Boolean(value.before)!==Boolean(selected.recordId)||value.applyAvailable!==checked.verified||await hash(value.verification)!==await hash(checked))throw Error('Aviation review verification does not match this target.');
 if(await hash(value.metadataChanges)!==await hash(plan.metadataChanges)||await hash(value.proposal)!==await hash(plan.previewPayload)||value.sourceDigest!==await hash({sourceProof:plan.sourceProof,bindings:selected.bindings,payload:plan.previewPayload})||value.reviewDigest!==await hash({version:value.version,site,recordId:selected.recordId,expectedRevision:selected.expectedRevision,plan,evidence:checked.evidence}))throw Error('Aviation review content or identity changed.');
 return value;
}
const pendingSchema=z.object({version:z.literal(1),site:uuid,actorId:uuid,requestKey:uuid,sourceDigest:digest,reviewDigest:digest,selection:aviationMigrationSelectionSchema,evidence:aviationMediaEvidenceSchema}).strict().refine(value=>{try{return verifyAviationMigrationMedia(mediaBindings(value.selection),value.evidence).verified;}catch{return false;}});
export type PendingAviationMigration=z.infer<typeof pendingSchema>;
export function aviationRecoveryKey(site:string,actor:string){return `cms-aviation-migration:${uuid.parse(site)}:${uuid.parse(actor)}`;}
export function readPendingAviationMigration(text:string|null,site:string,actorId:string){
 if(text===null)return null;if(new TextEncoder().encode(text).length>20000)throw Error('Recovery data is too large.');
 const value=pendingSchema.parse(JSON.parse(text));if(value.site!==site||value.actorId!==actorId)throw Error('Recovery belongs to another account or website.');return value;
}
export function makePendingAviationMigration(site:string,actorId:string,selection:AviationMigrationSelection,review:AviationMigrationReview,requestKey:string){
 if(!review.applyAvailable)throw Error('Resolve media verification before applying.');
 return pendingSchema.parse({version:1,site,actorId,requestKey,sourceDigest:review.sourceDigest,reviewDigest:review.reviewDigest,selection,evidence:review.verification.evidence});
}
const result=z.object({recordId:uuid,revisionId:uuid}).strict();
function identity(value:{requestKey:string;sourceDigest:string;reviewDigest:string;result:z.infer<typeof result>},pending:PendingAviationMigration){
 if(value.requestKey!==pending.requestKey||value.sourceDigest!==pending.sourceDigest||value.reviewDigest!==pending.reviewDigest||(pending.selection.recordId&&value.result.recordId!==pending.selection.recordId)||value.result.revisionId===pending.selection.expectedRevision)throw Error('Aviation migration result does not match this request.');return value.result;
}
export function verifyAviationReceipt(input:unknown,pending:PendingAviationMigration){return identity(z.object({requestKey:uuid,sourceDigest:digest,reviewDigest:digest,result,replayed:z.boolean()}).strict().parse(input),pending);}
export function verifyAviationRecovery(input:unknown,pending:PendingAviationMigration){
 const value=z.discriminatedUnion('status',[z.object({status:z.literal('unconfirmed'),message:z.string()}).strict(),z.object({status:z.literal('complete'),requestKey:uuid,sourceDigest:digest,reviewDigest:digest,createdAt:z.string().datetime({offset:true}),result}).strict()]).parse(input);
 return value.status==='unconfirmed'?null:identity(value,pending);
}
export function aviationApplyCommand(pending:PendingAviationMigration){const value=pendingSchema.parse(pending);return {action:'apply' as const,site:value.site,...value.selection,requestKey:value.requestKey,reviewDigest:value.reviewDigest,evidence:value.evidence};}
