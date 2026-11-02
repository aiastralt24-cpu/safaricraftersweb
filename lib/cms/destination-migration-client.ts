import {z} from 'zod';
export function parseDestinationSnapshot(text:string){
 if(new TextEncoder().encode(text).length>1_000_000)throw Error('Choose a JSON export under 1 MB.');
 let input:unknown;try{input=JSON.parse(text);}catch{throw Error('Choose a valid JSON snapshot.');}
 const value=Array.isArray(input)?input:input&&typeof input==='object'&&'destinations' in input?input.destinations:undefined;
 return z.array(z.record(z.string(),z.unknown())).min(1).max(25).parse(value);
}
const issue=z.object({field:z.string(),severity:z.enum(['error','warning']),message:z.string()});
export const migrationReviewSchema=z.object({applyAvailable:z.boolean(),reviewDigest:z.string().regex(/^[a-f0-9]{64}$/),plan:z.object({count:z.number().int().min(1).max(25),readyDrafts:z.number().int().min(0).max(25),unusedMappings:z.array(z.string()),candidates:z.array(z.object({sourceDigest:z.string().regex(/^[a-f0-9]{64}$/),sourceIndex:z.number().int(),canSaveDraft:z.boolean(),source:z.record(z.string(),z.unknown()),payload:z.record(z.string(),z.unknown()),issues:z.array(issue)})).max(25)})});
export function verifyMigrationReceipt(input:unknown,digests:string[]){
 const value=z.object({result:z.array(z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),sourceKey:z.string()}).passthrough())}).parse(input);
 const keys=value.result.map(item=>item.sourceKey);
 if(keys.length!==digests.length||new Set(keys).size!==keys.length||new Set(value.result.map(item=>item.recordId)).size!==keys.length||digests.some(digest=>!keys.includes(`destination_${digest}`)))throw Error('Migration receipt does not match the reviewed records.');
 return value.result;
}

export function parseDestinationMappings(text:string){
 if(new TextEncoder().encode(text).length>500_000)throw Error('Keep mappings under 500 KB.');
 let input:unknown;try{input=JSON.parse(text);}catch{throw Error('Enter a valid JSON mapping object.');}
 return z.record(z.string(),z.unknown()).parse(input);
}
export function verifyDestinationReview(input:unknown,source:Record<string,unknown>[]){
 const value=migrationReviewSchema.parse(input);
 const canonical=(item:unknown):string=>Array.isArray(item)?'['+item.map(canonical).join(',')+']':item&&typeof item==='object'?'{'+Object.entries(item).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',')+'}':JSON.stringify(item)??'null';
 if(value.plan.count!==source.length||value.plan.candidates.length!==source.length||value.plan.candidates.some((item,index)=>item.sourceIndex!==index||canonical(item.source)!==canonical(source[index])))throw Error('Review does not match this source snapshot.');
 return value;
}

export const pendingDestinationMigrationSchema=z.object({site:z.string().uuid(),requestKey:z.string().uuid(),reviewDigest:z.string().regex(/^[a-f0-9]{64}$/),sourceDigests:z.array(z.string().regex(/^[a-f0-9]{64}$/)).min(1).max(25)}).strict();
export function readPendingDestinationMigration(text:string|null,site:string){
 if(text===null)return null;
 const value=pendingDestinationMigrationSchema.parse(JSON.parse(text));
 if(value.site!==site)throw Error('Saved migration belongs to another website.');
 return value;
}
