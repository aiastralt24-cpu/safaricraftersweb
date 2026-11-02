import {z} from 'zod';
const digest=z.string().regex(/^[a-f0-9]{64}$/);
export const aboutMediaEvidenceSchema=z.array(z.object({assetId:z.string(),sourceSha256:digest,sourceMatches:z.boolean(),revision:z.number().int().positive().nullable(),processedSha256:digest.nullable(),available:z.boolean()}).strict()).min(1).max(4);
export function verifyAboutMigrationMedia(bindings:{assetId:string;sourceSha256:string}[],input:unknown){
 const parsed=aboutMediaEvidenceSchema.safeParse(input);
 if(!parsed.success||parsed.data.length!==bindings.length||new Set(bindings.map(item=>item.assetId)).size!==bindings.length||parsed.data.some((item,index)=>item.assetId!==bindings[index].assetId||item.sourceSha256!==bindings[index].sourceSha256))throw Error('About migration media evidence is missing or mismatched.');
 if(parsed.data.some(item=>item.available&&(!item.sourceMatches||!item.revision||!item.processedSha256)))throw Error('About migration media evidence is contradictory.');
 return {verified:parsed.data.every(item=>item.available),evidence:parsed.data,unavailable:parsed.data.filter(item=>!item.available).map(item=>item.assetId)};
}
