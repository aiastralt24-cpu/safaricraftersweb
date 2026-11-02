import {conceptNavigationSchema} from './concept-navigation.ts';
import {conceptMigrationEvidenceSchema,conceptMigrationCanApply} from './concept-migration-evidence.ts';
import {z} from 'zod';
import {homepageMigrationMediaReviewSchema} from './homepage-migration-media.ts';
import {conceptMigrationManifestSchema} from './concept-migration-contracts.ts';
import type {ConceptMigrationManifest} from './concept-migration-contracts.ts';
import {validateComposition} from './composition.ts';
import {pageSeoSchema} from './page-seo.ts';
const uuid=z.string().uuid(),digest=z.string().regex(/^[a-f0-9]{64}$/);
const target=z.object({recordId:uuid.nullable(),expectedRevision:uuid.nullable()}).strict();
const response=z.object({version:z.literal('concept-migration-review-2'),sourceDigest:digest,reviewDigest:digest,captureDigest:digest,target,
 proposal:z.object({composition:z.unknown(),seo:pageSeoSchema,navigation:conceptNavigationSchema}).strict(),
 recordComparison:conceptMigrationEvidenceSchema.shape.recordComparison,
 mediaVerification:homepageMigrationMediaReviewSchema,applyAvailable:z.boolean(),findings:z.array(z.object({code:z.string().max(200),message:z.string().max(2000)}).strict()).max(100),notice:z.string().max(2000),
}).strict();
export function readConceptMappingFile(text:string){
 if(new TextEncoder().encode(text).length>1_000_000)throw Error('The mapping file must be smaller than 1 MB.');
 let parsed;try{parsed=conceptMigrationManifestSchema.parse(JSON.parse(text));}catch{throw Error('Choose a valid concept migration mapping file.');}
 if(!parsed.media.length||!parsed.records.length)throw Error('The mapping file must include images, videos and content records.');
 if(new Set(parsed.media.map(item=>item.sourcePath)).size!==parsed.media.length||new Set(parsed.media.map(item=>item.assetId)).size!==parsed.media.length||new Set(parsed.records.map(item=>item.sourceKey)).size!==parsed.records.length||new Set(parsed.records.map(item=>item.recordId)).size!==parsed.records.length)throw Error('Each source and CMS item must have a unique mapping.');
 return parsed;
}
export function readConceptMigrationReview(input:unknown,selection:{site:string;recordId:string|null;expectedRevision:string|null;mappings:ConceptMigrationManifest}){
 const value=response.parse(input),comparison=value.recordComparison;
 if(value.captureDigest!==selection.mappings.captureDigest||comparison.captureDigest!==value.captureDigest||comparison.websiteId!==selection.site||value.target.recordId!==selection.recordId||value.target.expectedRevision!==selection.expectedRevision)throw Error('This review belongs to a different concept selection. Review again.');
 const wanted=new Map(selection.mappings.records.map(item=>[item.recordId,item.sourceKey]));
 if(comparison.revisions.length!==wanted.size||new Set(comparison.revisions.map(item=>item.recordId)).size!==wanted.size||comparison.revisions.some(item=>!wanted.has(item.recordId)))throw Error('The record review is incomplete.');
 if(comparison.findings.some(item=>wanted.get(item.recordId)!==item.sourceKey)||comparison.sourceMatches!==(comparison.findings.length===0))throw Error('The comparison findings are inconsistent.');
 const expectedMedia=new Map(selection.mappings.media.map(item=>[item.sourcePath,item]));
 const actualMedia=[...value.mediaVerification.images,...value.mediaVerification.videos];
 if(actualMedia.length!==expectedMedia.size||actualMedia.some(item=>expectedMedia.get(item.sourcePath)?.assetId!==item.assetId)||value.mediaVerification.videos.some(item=>item.evidence&&expectedMedia.get(item.sourcePath)?.sourceSha256!==item.evidence.sourceSha256)||value.mediaVerification.images.some(item=>expectedMedia.get(item.sourcePath)?.sourceSha256!==item.sourceSha256))throw Error('The media review is incomplete or belongs to another mapping.');
 if(value.applyAvailable!==conceptMigrationCanApply(value))throw Error('The migration readiness summary is inconsistent.');
 const parsed=validateComposition(value.proposal.composition);if(!parsed.valid||!parsed.page||parsed.page.sections.length!==10)throw Error('The proposed concept composition is incomplete.');
 return {...value,proposal:{...value.proposal,composition:parsed.page}};
}
export type ConceptMigrationReview=ReturnType<typeof readConceptMigrationReview>;

const selectionSchema=z.object({recordId:uuid.nullable(),expectedRevision:uuid.nullable(),mappings:conceptMigrationManifestSchema}).strict().refine(value=>Boolean(value.recordId)===Boolean(value.expectedRevision));
export type ConceptMigrationSelection=z.infer<typeof selectionSchema>;
const pendingSchema=z.object({version:z.literal(1),site:uuid,actorId:uuid,requestKey:uuid,sourceDigest:digest,reviewDigest:digest,selection:selectionSchema,evidence:conceptMigrationEvidenceSchema}).strict().superRefine((value,context)=>{
 const {recordComparison:comparison,mediaVerification:media}=value.evidence,mappings=value.selection.mappings;
 try{readConceptMappingFile(JSON.stringify(mappings));}catch{context.addIssue({code:'custom',message:'Invalid recovery mappings.'});}
 const refs=new Set(mappings.records.map(item=>item.recordId)),expected=new Map(mappings.media.map(item=>[item.sourcePath,item])),actual=[...media.images,...media.videos];
 if(!conceptMigrationCanApply(value.evidence)||comparison.websiteId!==value.site||comparison.captureDigest!==mappings.captureDigest||comparison.revisions.length!==refs.size||new Set(comparison.revisions.map(item=>item.recordId)).size!==refs.size||comparison.revisions.some(item=>!refs.has(item.recordId))||actual.length!==expected.size||actual.some(item=>expected.get(item.sourcePath)?.assetId!==item.assetId)||media.images.some(item=>expected.get(item.sourcePath)?.sourceSha256!==item.sourceSha256)||media.videos.some(item=>expected.get(item.sourcePath)?.sourceSha256!==item.evidence?.sourceSha256))context.addIssue({code:'custom',message:'Recovery evidence does not match the reviewed selection.'});
});
export type PendingConceptMigration=z.infer<typeof pendingSchema>;
export function conceptRecoveryKey(site:string,actor:string){return `cms-concept-migration:${uuid.parse(site)}:${uuid.parse(actor)}`;}
export function readPendingConceptMigration(text:string|null,site:string,actorId:string){
 if(text===null)return null;if(new TextEncoder().encode(text).length>2_000_000)throw Error('Recovery data is too large.');
 const value=pendingSchema.parse(JSON.parse(text));if(value.site!==site||value.actorId!==actorId)throw Error('Recovery belongs to another account or website.');return value;
}
export function makePendingConceptMigration(site:string,actorId:string,selection:ConceptMigrationSelection,review:ConceptMigrationReview,requestKey:string){
 const checked=readConceptMigrationReview(review,{site,...selection});if(!checked.applyAvailable)throw Error('Resolve the content and media findings before applying.');
 return pendingSchema.parse({version:1,site,actorId,requestKey,sourceDigest:checked.sourceDigest,reviewDigest:checked.reviewDigest,selection,evidence:{recordComparison:checked.recordComparison,mediaVerification:checked.mediaVerification}});
}
const migrationResult=z.object({recordId:uuid,revisionId:uuid}).strict();
function checkReceipt(value:{requestKey:string;sourceDigest:string;reviewDigest:string;result:z.infer<typeof migrationResult>},pending:PendingConceptMigration){
 if(value.requestKey!==pending.requestKey||value.sourceDigest!==pending.sourceDigest||value.reviewDigest!==pending.reviewDigest||(pending.selection.recordId&&value.result.recordId!==pending.selection.recordId)||value.result.revisionId===pending.selection.expectedRevision)throw Error('Concept migration result does not match this request.');return value.result;
}
export function verifyConceptReceipt(input:unknown,pending:PendingConceptMigration){return checkReceipt(z.object({requestKey:uuid,sourceDigest:digest,reviewDigest:digest,result:migrationResult,replayed:z.boolean()}).strict().parse(input),pending);}
export function verifyConceptRecovery(input:unknown,pending:PendingConceptMigration){
 const value=z.discriminatedUnion('status',[z.object({status:z.literal('unconfirmed'),message:z.string()}).strict(),z.object({status:z.literal('complete'),requestKey:uuid,sourceDigest:digest,reviewDigest:digest,createdAt:z.string().datetime({offset:true}),result:migrationResult}).strict()]).parse(input);
 return value.status==='unconfirmed'?null:checkReceipt(value,pending);
}
export function conceptApplyCommand(pending:PendingConceptMigration){const value=pendingSchema.parse(pending);return {action:'apply' as const,site:value.site,...value.selection,requestKey:value.requestKey,reviewDigest:value.reviewDigest,evidence:value.evidence};}
