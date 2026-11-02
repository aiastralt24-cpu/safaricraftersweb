import {z} from 'zod';
import {verifyHeroVideoMigrationMedia} from './hero-video-migration-media.ts';
import {aboutMediaEvidenceSchema,verifyAboutMigrationMedia} from './about-migration-media.ts';
const pendingVideo=z.object({sourcePath:z.string(),assetId:z.string(),code:z.literal('video_verification_pending'),evidence:aboutMediaEvidenceSchema.element.optional()}).strict();
export const homepageMigrationMediaReviewSchema=z.object({
 verified:z.literal(false),imagesVerified:z.boolean(),
 images:z.array(aboutMediaEvidenceSchema.element.extend({sourcePath:z.string()})).max(1000),
 videos:z.array(pendingVideo).min(1).max(10),
}).strict().superRefine((value,context)=>{
 if(!value.images.length||value.imagesVerified!==value.images.every(item=>item.available))context.addIssue({code:'custom',message:'Image verification summary is inconsistent.'});
 for(const video of value.videos)if(video.evidence&&(video.evidence.assetId!==video.assetId||(video.evidence.available&&(!video.evidence.sourceMatches||!video.evidence.revision||!video.evidence.processedSha256))))context.addIssue({code:'custom',message:'Contradictory video verification evidence.'});
 const all=[...value.images,...value.videos];
 if(new Set(all.map(item=>item.sourcePath)).size!==all.length||new Set(all.map(item=>item.assetId)).size!==all.length)context.addIssue({code:'custom',message:'Duplicate media evidence.'});
 if(value.images.some(item=>item.available&&(!item.sourceMatches||!item.revision||!item.processedSha256)))context.addIssue({code:'custom',message:'Contradictory image verification evidence.'});
});
type Source={sourcePath:string;sha256:string;kind:'image'|'video';proposedAssetId:string|null};
type Read=(bindings:{assetId:string;sourceSha256:string}[])=>Promise<unknown>;
/** Reuses the existing caller-scoped four-image provenance/rights RPC. These are
 * review reads, not an atomic readiness snapshot; apply must recheck under locks. */
export async function reviewHomepageMigrationMedia(sources:Source[],read:Read,readVideos?:Read){
 if(!sources.length||sources.length>1000||sources.some(item=>!item.proposedAssetId))throw Error('Complete media mappings are required.');
 if(new Set(sources.map(item=>item.sourcePath)).size!==sources.length||new Set(sources.map(item=>item.proposedAssetId)).size!==sources.length)throw Error('Duplicate media mapping.');
 const images=sources.filter(item=>item.kind==='image'),videos=sources.filter(item=>item.kind==='video');
 if(!images.length||!videos.length)throw Error('Expected both captured homepage images and hero videos.');
 const batches=[];for(let start=0;start<images.length;start+=4)batches.push(images.slice(start,start+4));
 const evidence=[];
 for(let start=0;start<batches.length;start+=4){
  const results=await Promise.allSettled(batches.slice(start,start+4).map(async batch=>{
   const bindings=batch.map(item=>({assetId:item.proposedAssetId!,sourceSha256:item.sha256}));
   const checked=verifyAboutMigrationMedia(bindings,await read(bindings));
   return checked.evidence.map((item,index)=>({...item,sourcePath:batch[index].sourcePath}));
  }));
  let failure:unknown;let failed=false;
  for(const result of results)if(result.status==='fulfilled')evidence.push(...result.value);else{failed=true;failure??=result.reason;}
  if(failed)throw failure;
 }
 const videoEvidence=new Map<string,z.infer<typeof aboutMediaEvidenceSchema.element>>();
 if(readVideos)for(let start=0;start<videos.length;start+=4){
  const bindings=videos.slice(start,start+4).map(item=>({assetId:item.proposedAssetId!,sourceSha256:item.sha256}));
  const checked=verifyHeroVideoMigrationMedia(bindings,await readVideos(bindings));
  for(const item of checked.evidence)videoEvidence.set(item.assetId,item);
 }
 return homepageMigrationMediaReviewSchema.parse({verified:false,imagesVerified:evidence.every(item=>item.available),images:evidence,videos:videos.map(item=>({sourcePath:item.sourcePath,assetId:item.proposedAssetId!,code:'video_verification_pending',...(videoEvidence.has(item.proposedAssetId!)?{evidence:videoEvidence.get(item.proposedAssetId!)}:{})}))});
}
