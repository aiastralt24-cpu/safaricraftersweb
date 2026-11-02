import {z} from 'zod';
import {homepageMigrationMediaReviewSchema} from './homepage-migration-media.ts';
const uuid=z.string().uuid(),digest=z.string().regex(/^[a-f0-9]{64}$/);
const finding=z.object({sourceKey:z.string().max(1000),recordId:uuid,field:z.string().max(200),code:z.string().max(200),message:z.string().max(2000)}).strict();
export const conceptMigrationEvidenceSchema=z.object({recordComparison:z.object({mode:z.literal('review-only'),readyToApply:z.literal(false),captureDigest:digest,websiteId:uuid,sourceMatches:z.boolean(),revisions:z.array(z.object({recordId:uuid,revisionId:uuid}).strict()).max(1000),findings:z.array(finding).max(10000),limitations:z.array(z.string().max(2000)).max(50)}).strict(),mediaVerification:homepageMigrationMediaReviewSchema}).strict();
export function conceptMigrationCanApply(evidence:z.infer<typeof conceptMigrationEvidenceSchema>){
 return evidence.recordComparison.sourceMatches&&evidence.recordComparison.findings.length===0&&evidence.mediaVerification.imagesVerified&&evidence.mediaVerification.videos.every(video=>video.evidence?.available===true);
}
