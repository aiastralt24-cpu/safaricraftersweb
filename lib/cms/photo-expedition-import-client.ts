import {z} from 'zod';
import {photoExpeditionSchema} from './photo-expeditions.ts';
import {journalSourceDigest} from './journal-migration-client.ts';
const digest=z.string().regex(/^[a-f0-9]{64}$/);
const target=z.object({sourceKey:z.string().regex(/^expedition_import_[a-f0-9]{64}$/),recordId:z.string().uuid().nullable()}).strict();
export const pendingExpeditionImportSchema=z.object({version:z.literal(1),actorId:z.string().uuid(),site:z.string().uuid(),requestKey:z.string().uuid(),sourceDigest:digest,reviewDigest:digest,targets:z.array(target).min(1).max(25)}).strict();
export type PendingExpeditionImport=z.infer<typeof pendingExpeditionImportSchema>;
export const expeditionImportReviewSchema=z.object({source:z.object({format:z.enum(['xlsx','docx']),sha256:digest,bytes:z.number().int().positive().max(5_000_000)}),reviewDigest:digest,applyAvailable:z.boolean(),verification:z.object({currentRecords:z.boolean(),media:z.boolean(),references:z.boolean(),film:z.boolean()}),plan:z.object({valid:z.boolean(),issues:z.array(z.object({sheet:z.string(),row:z.number().int(),field:z.string(),code:z.string(),severity:z.enum(['error','warning']),message:z.string()})),changes:z.array(z.object({importId:z.string(),operation:z.enum(['create','update']),recordId:z.string().uuid().nullable(),expectedRevision:z.string().uuid().nullable(),locale:z.string(),path:z.string(),payload:photoExpeditionSchema,replacedCollections:z.array(z.string())})).max(25)})});
export async function importSha256(bytes:BufferSource){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');}
export function verifyExpeditionImportReview(input:unknown,source:{hash:string;size:number;format:string}){
 const value=expeditionImportReviewSchema.parse(input);
 if(value.source.sha256!==source.hash||value.source.bytes!==source.size||value.source.format!==source.format)throw Error('Review does not match the selected file.');
 if(value.applyAvailable&&(!value.plan.valid||!value.plan.changes.length||value.plan.issues.some(i=>i.severity==='error')||!value.verification.currentRecords||!value.verification.media||!value.verification.references||value.plan.changes.some(c=>Boolean(c.payload.video))))throw Error('Review readiness is inconsistent.');
 for(const change of value.plan.changes){if(change.locale!=='en'||change.path!==`/photo-expeditions/${change.payload.slug}`||(change.operation==='create'?(change.recordId!==null||change.expectedRevision!==null):(!change.recordId||!change.expectedRevision||change.recordId!==change.importId)))throw Error('Review contains an inconsistent expedition identity.');}
 const ids=value.plan.changes.map(c=>c.importId);if(new Set(ids).size!==ids.length||new Set(value.plan.changes.map(c=>c.path)).size!==ids.length)throw Error('Review contains duplicate expeditions.');
 return value;
}
export function readPendingExpeditionImport(text:string|null,site:string,actorId:string){
 if(text===null)return null;
 if(text.length>20_000)throw Error('Saved import recovery data is invalid.');
 const value=pendingExpeditionImportSchema.parse(JSON.parse(text));if(value.site!==site||value.actorId!==actorId||new Set(value.targets.map(t=>t.sourceKey)).size!==value.targets.length||new Set(value.targets.flatMap(t=>t.recordId?[t.recordId]:[])).size!==value.targets.filter(t=>t.recordId).length)throw Error('Saved import recovery does not match this website.');return value;
}
export function verifyExpeditionImportReceipt(input:unknown,pending:PendingExpeditionImport){
 const value=z.object({requestKey:z.string().uuid(),sourceDigest:digest,reviewDigest:digest,result:z.array(z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),sourceKey:z.string()}).strict()).min(1).max(25)}).parse(input);
 if(value.requestKey!==pending.requestKey||value.sourceDigest!==pending.sourceDigest||value.reviewDigest!==pending.reviewDigest||value.result.length!==pending.targets.length||new Set(value.result.map(r=>r.recordId)).size!==value.result.length||new Set(value.result.map(r=>r.sourceKey)).size!==value.result.length||new Set(value.result.map(r=>r.revisionId)).size!==value.result.length||value.result.some(r=>!pending.targets.some(t=>t.sourceKey===r.sourceKey&&(t.recordId===null||t.recordId===r.recordId))))throw Error('Save receipt does not match this reviewed import. Keep the request ID and check again.');
 return value.result;
}

export async function prepareExpeditionImportRecovery(review:z.infer<typeof expeditionImportReviewSchema>,site:string,actorId:string,requestKey:string){
 const checked=verifyExpeditionImportReview(review,{hash:review.source.sha256,size:review.source.bytes,format:review.source.format});
 if(!checked.applyAvailable)throw Error('Resolve review issues before saving.');
 const targets=await Promise.all(checked.plan.changes.map(async change=>({sourceKey:`expedition_import_${await journalSourceDigest(change.importId)}`,recordId:change.recordId})));
 return readPendingExpeditionImport(JSON.stringify({version:1,site,actorId,requestKey,sourceDigest:checked.source.sha256,reviewDigest:checked.reviewDigest,targets}),site,actorId)!;
}
