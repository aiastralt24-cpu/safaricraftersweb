import {z} from 'zod';
import {aboutMediaEvidenceSchema} from './about-migration-media.ts';
const digest=z.string().regex(/^[a-f0-9]{64}$/);
const bindingsSchema=z.array(z.object({assetId:z.string().uuid(),sourceSha256:digest}).strict()).min(1).max(4);
/** Caller-scoped review evidence only; application must recheck under locks.
 * This checks provenance and rights, not deployment/public playback readiness. */
export function verifyHeroVideoMigrationMedia(input:unknown,evidence:unknown){
 const bindings=bindingsSchema.parse(input),parsed=aboutMediaEvidenceSchema.parse(evidence);
 if(bindings.length!==parsed.length||new Set(bindings.map(item=>item.assetId)).size!==bindings.length)throw Error('Incomplete video evidence.');
 if(parsed.some((item,index)=>item.assetId!==bindings[index].assetId||item.sourceSha256!==bindings[index].sourceSha256))throw Error('Video evidence identity mismatch.');
 if(parsed.some(item=>item.available&&(!item.sourceMatches||!item.revision||!item.processedSha256)))throw Error('Contradictory video evidence.');
 return {verified:parsed.every(item=>item.available),evidence:parsed,unavailable:parsed.filter(item=>!item.available).map(item=>item.assetId)};
}
