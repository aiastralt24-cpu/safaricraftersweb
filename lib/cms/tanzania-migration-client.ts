import {z} from 'zod';
import {journalSourceDigest as hash} from './journal-migration-client.ts';
import {planTanzaniaMigration,tanzaniaMigrationDependencies} from './tanzania-migration.ts';
const uuid=z.string().uuid(),digest=z.string().regex(/^[a-f0-9]{64}$/),asset=z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/),object=z.record(z.string(),z.unknown());
export const tanzaniaSelectionSchema=z.object({site:uuid,recordId:uuid.nullable(),expectedRevision:uuid.nullable(),bindings:z.array(z.object({sourcePath:z.string(),sourceSha256:digest,assetId:asset}).strict()).length(12)}).strict().refine(s=>Boolean(s.recordId)===Boolean(s.expectedRevision));
export type TanzaniaMigrationSelection=z.infer<typeof tanzaniaSelectionSchema>;
const evidence=z.array(z.object({assetId:asset,sourceSha256:digest,sourceMatches:z.boolean(),revision:z.number().int().positive().nullable(),processedSha256:digest.nullable(),available:z.boolean()}).strict()).length(12);
const reviewSchema=z.object({version:z.literal('tanzania-migration-review-1'),selection:tanzaniaSelectionSchema.extend({action:z.literal('review')}),sourceDigest:digest,reviewDigest:digest,before:object.nullable(),proposal:object,metadata:object,verification:z.object({verified:z.boolean(),evidence,unavailable:z.array(asset).max(12)}).strict(),applyAvailable:z.boolean(),findings:z.array(z.object({code:z.string(),message:z.string()}).strict()).max(30),notice:z.string()}).strict();
export type TanzaniaMigrationReview=z.infer<typeof reviewSchema>;
/** Verify full proposal and scope before displaying a review; grants no write authority. */
export async function verifyTanzaniaReview(input:unknown,selection:TanzaniaMigrationSelection){
 const selected=tanzaniaSelectionSchema.parse(selection),value=reviewSchema.parse(input),plan=planTanzaniaMigration(tanzaniaMigrationDependencies,selected.bindings);
 if(await hash(value.selection)!==await hash({action:'review',...selected})||Boolean(value.before)!==Boolean(selected.recordId)||plan.missingMedia.length)throw Error('Tanzania review target changed.');
 const rows=value.verification.evidence;
 if(rows.some((e,i)=>e.assetId!==selected.bindings[i].assetId||e.sourceSha256!==selected.bindings[i].sourceSha256||(e.available&&(!e.sourceMatches||!e.revision||!e.processedSha256))))throw Error('Tanzania image evidence changed.');
 const verification={verified:rows.every(e=>e.available),evidence:rows,unavailable:rows.filter(e=>!e.available).map(e=>e.assetId)};
 const source=await hash({sourceProof:plan.sourceProof,bindings:selected.bindings,payload:plan.previewPayload});
 if(value.applyAvailable!==verification.verified||await hash(value.verification)!==await hash(verification)||await hash(value.proposal)!==await hash(plan.previewPayload)||await hash(value.metadata)!==await hash(plan.metadata)||source!==value.sourceDigest||value.reviewDigest!==await hash({version:value.version,site:selected.site,recordId:selected.recordId,expectedRevision:selected.expectedRevision,source,verification}))throw Error('Tanzania review content or verification changed.');
 return value;
}

const pendingSchema=z.object({version:z.literal(1),site:uuid,actorId:uuid,requestKey:uuid,sourceDigest:digest,reviewDigest:digest,selection:tanzaniaSelectionSchema,evidence}).strict().refine(v=>v.site===v.selection.site&&v.evidence.every((e,i)=>e.assetId===v.selection.bindings[i].assetId&&e.sourceSha256===v.selection.bindings[i].sourceSha256&&e.available&&e.sourceMatches&&Boolean(e.revision)&&Boolean(e.processedSha256)));
export type PendingTanzaniaMigration=z.infer<typeof pendingSchema>;
export function tanzaniaRecoveryKey(site:string,actor:string){return `cms-tanzania-migration:${uuid.parse(site)}:${uuid.parse(actor)}`;}
export function readPendingTanzaniaMigration(text:string|null,site:string,actorId:string){
 if(text===null)return null;if(new TextEncoder().encode(text).length>20000)throw Error('Recovery data is too large.');
 const value=pendingSchema.parse(JSON.parse(text));if(value.site!==site||value.actorId!==actorId)throw Error('Recovery belongs to another account or website.');return value;
}
export async function makePendingTanzaniaMigration(actorId:string,selection:TanzaniaMigrationSelection,input:unknown,requestKey:string){
 const review=await verifyTanzaniaReview(input,selection);if(!review.applyAvailable)throw Error('Resolve image verification before applying.');
 return pendingSchema.parse({version:1,site:selection.site,actorId,requestKey,sourceDigest:review.sourceDigest,reviewDigest:review.reviewDigest,selection,evidence:review.verification.evidence});
}
const result=z.object({recordId:uuid,revisionId:uuid}).strict();
function identity(value:{requestKey:string;sourceDigest:string;reviewDigest:string;result:z.infer<typeof result>},pending:PendingTanzaniaMigration){
 if(value.requestKey!==pending.requestKey||value.sourceDigest!==pending.sourceDigest||value.reviewDigest!==pending.reviewDigest||(pending.selection.recordId&&value.result.recordId!==pending.selection.recordId)||value.result.revisionId===pending.selection.expectedRevision)throw Error('Tanzania migration result does not match this request.');return value.result;
}
export function verifyTanzaniaReceipt(input:unknown,pending:PendingTanzaniaMigration){return identity(z.object({requestKey:uuid,sourceDigest:digest,reviewDigest:digest,result,replayed:z.boolean()}).strict().parse(input),pending);}
export function verifyTanzaniaRecovery(input:unknown,pending:PendingTanzaniaMigration){
 const value=z.discriminatedUnion('status',[z.object({status:z.literal('unconfirmed'),message:z.string()}).strict(),z.object({status:z.literal('complete'),requestKey:uuid,sourceDigest:digest,reviewDigest:digest,createdAt:z.string().datetime({offset:true}),result}).strict()]).parse(input);
 return value.status==='unconfirmed'?null:identity(value,pending);
}
export function tanzaniaApplyCommand(pending:PendingTanzaniaMigration){const value=pendingSchema.parse(pending);return {action:'apply' as const,...value.selection,requestKey:value.requestKey,reviewDigest:value.reviewDigest,evidence:value.evidence};}
