import {z} from 'zod';
import {photoExpeditionSchema} from './photo-expeditions.ts';
import {expeditionMigrationMappingsSchema} from './photo-expedition-migration-contract.ts';
import {journalSourceDigest} from './journal-migration-client.ts';
export {journalSourceDigest as expeditionSourceDigest} from './journal-migration-client.ts';
const object=z.record(z.string(),z.unknown()),digest=z.string().regex(/^[a-f0-9]{64}$/),sourceKey=z.string().regex(/^snapshot:[a-f0-9]{64}$/);
export const expeditionSnapshotSchema=z.array(object).min(1).max(25);
export type ExpeditionSnapshot=z.infer<typeof expeditionSnapshotSchema>;
export type ExpeditionMigrationMappings=z.infer<typeof expeditionMigrationMappingsSchema>;
function json(text:string,limit:number){if(new TextEncoder().encode(text).length>limit)throw Error(`Choose a file smaller than ${limit/1000} KB.`);try{return JSON.parse(text) as unknown;}catch{throw Error('Choose a valid JSON file.');}}
export function parseExpeditionSnapshot(text:string){const value=json(text,1_000_000);return expeditionSnapshotSchema.parse(Array.isArray(value)?value:value&&typeof value==='object'&&'expeditions' in value?value.expeditions:undefined);}
export function parseExpeditionMappings(text:string){return expeditionMigrationMappingsSchema.parse(json(text,500_000));}
const candidate=z.object({sourceIndex:z.number().int().min(0),sourceKey,sourceDigest:digest,source:object,mapping:expeditionMigrationMappingsSchema.valueType.nullable(),payload:object,issues:z.array(z.object({field:z.string(),severity:z.enum(['error','warning']),message:z.string()}).strict()),canSaveDraft:z.boolean()}).strict();
const reviewSchema=z.object({plan:z.object({version:z.literal(1),operation:z.literal('review_only'),sourceDigest:digest,count:z.number().int().min(1).max(25),readyDrafts:z.number().int().min(0).max(25),unusedMappings:z.array(z.string()),candidates:z.array(candidate).min(1).max(25)}).strict(),reviewDigest:digest,applyAvailable:z.boolean(),verification:z.object({media:z.literal(true),references:z.literal(true),publication:z.literal(false)}).strict(),message:z.string()}).strict();
export type ExpeditionMigrationReview=z.infer<typeof reviewSchema>;
export async function verifyExpeditionReview(input:unknown,source:ExpeditionSnapshot,mappings:unknown){
 const review=reviewSchema.parse(input),plan=review.plan,maps=expeditionMigrationMappingsSchema.parse(mappings),records=expeditionSnapshotSchema.parse(source);
 const hashes=await Promise.all(records.map(journalSourceDigest));
 if(plan.count!==records.length||plan.candidates.length!==records.length||plan.sourceDigest!==await journalSourceDigest(records))throw Error('Review does not match this expedition snapshot.');
 for(const [index,item] of plan.candidates.entries()){
  const key=`snapshot:${hashes[index]}`;
  if(item.sourceIndex!==index||item.sourceDigest!==hashes[index]||item.sourceKey!==key||await journalSourceDigest(item.source)!==hashes[index]||await journalSourceDigest(item.mapping)!==await journalSourceDigest(maps[key]??null))throw Error('Review does not match the source and mapping.');
  if(item.canSaveDraft){
   const parsed=photoExpeditionSchema.safeParse(item.payload);
   if(!parsed.success||!item.mapping||item.issues.some(issue=>issue.severity==='error')||parsed.data.slug!==records[index].slug||parsed.data.title!==records[index].title)throw Error('Review contains an invalid ready expedition.');
  }
 }
 const unused=Object.keys(maps).filter(key=>!hashes.some(hash=>key===`snapshot:${hash}`)).sort(),ready=plan.candidates.filter(item=>item.canSaveDraft).length;
 if(await journalSourceDigest([...plan.unusedMappings].sort())!==await journalSourceDigest(unused)||plan.readyDrafts!==ready||review.applyAvailable!==(ready===plan.count&&!unused.length))throw Error('Review readiness is inconsistent.');
 if(review.applyAvailable&&new Set(plan.candidates.map(item=>item.payload.slug)).size!==plan.count)throw Error('Duplicate expedition URLs require review.');
 return review;
}
const results=z.array(z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),sourceKey}).strict()).min(1).max(25);
export function verifyExpeditionReceipt(input:unknown,keys:string[]){
 const value=z.object({result:results}).parse(input).result;
 if(value.length!==keys.length||new Set(keys).size!==keys.length||['recordId','revisionId','sourceKey'].some(key=>new Set(value.map(item=>item[key as keyof typeof item])).size!==keys.length)||keys.some(key=>!value.some(item=>item.sourceKey===key)))throw Error('Receipt does not match every reviewed expedition.');
 return value;
}
const pendingSchema=z.object({version:z.literal(1),site:z.string().uuid(),actorId:z.string().uuid(),requestKey:z.string().uuid(),sourceDigest:digest,reviewDigest:digest,sourceKeys:z.array(sourceKey).min(1).max(25).refine(items=>new Set(items).size===items.length)}).strict();
export type PendingExpeditionMigration=z.infer<typeof pendingSchema>;
export function expeditionRecoveryKey(site:string,actorId:string){return `cms-expedition-migration:${z.string().uuid().parse(site)}:${z.string().uuid().parse(actorId)}`;}
export function readPendingExpeditionMigration(text:string|null,site:string,actorId:string){
 if(text===null)return null;const value=pendingSchema.parse(json(text,10_000));
 if(value.site!==site||value.actorId!==actorId)throw Error('Recovery belongs to another account or website.');return value;
}
export function verifyExpeditionRecovery(input:unknown,pending:PendingExpeditionMigration){
 const saved=pendingSchema.parse(pending);
 const value=z.discriminatedUnion('status',[z.object({status:z.literal('unconfirmed'),message:z.string()}).strict(),z.object({status:z.literal('complete'),requestKey:z.string().uuid(),sourceDigest:digest,reviewDigest:digest,createdAt:z.string().datetime({offset:true}),result:results}).strict()]).parse(input);
 if(value.status==='unconfirmed')return null;
 if(value.requestKey!==saved.requestKey||value.sourceDigest!==saved.sourceDigest||value.reviewDigest!==saved.reviewDigest)throw Error('Recovery does not match this saved request.');
 return verifyExpeditionReceipt(value,saved.sourceKeys);
}
