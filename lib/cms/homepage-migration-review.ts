import {createHash} from 'node:crypto';
import {z} from 'zod';
import capture from '../../docs/cms/homepage-rendered-inventory.json' with {type:'json'};

const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const digest=z.string().regex(/^[a-f0-9]{64}$/);
import {homepageMigrationManifestSchema} from './homepage-migration-contracts.ts';
export {homepageMigrationManifestSchema} from './homepage-migration-contracts.ts';
const proofSchema=z.array(z.object({sourcePath:z.string(),sha256:digest}).strict()).max(2000);

export const homepageCaptureDigest=hash(JSON.stringify(capture));
export const homepageMigrationMedia=[
 ...capture.media.map(item=>({...item,kind:'image' as const})),
 ...capture.videoMedia.map(item=>({...item,kind:'video' as const})),
];
export const homepageMigrationDependencies=[
 ...capture.sourceProof.map(item=>({sourcePath:item.path,sha256:item.sha256})),
 ...homepageMigrationMedia.map(item=>({sourcePath:`public${item.sourcePath}`,sha256:item.sha256})),
];
function section(label:string){
 const matches=capture.sections.filter(item=>item.label===label);
 if(matches.length!==1)throw Error(`Source section needs review: ${label}`);
 return matches[0];
}
const routeRecords=(label:string,prefix:string,type:'journey'|'photoExpedition')=>section(label).links.filter(link=>link.href?.startsWith(`${prefix}/`)).map(link=>({
 sourceKey:`${type}:${link.href}`,type,path:link.href!,evidence:{label:link.label},
}));
export const homepageMigrationRecords=[
 ...routeRecords('Private journeys','/journeys','journey'),
 ...routeRecords('Photography Tours','/photo-expeditions','photoExpedition'),
 ...capture.guestNotes.map(note=>{
  if(note.quotes.length!==1||note.figures.length!==1||note.links.length!==2)throw Error('Guest source structure needs review.');
  const evidence={quote:note.quotes[0],trip:note.figures[0],href:note.links[1].href};
  return {sourceKey:`testimonial:${hash(JSON.stringify(evidence))}`,type:'testimonial' as const,path:null,evidence};
 }),
];
function unique(values:string[],label:string){if(new Set(values).size!==values.length)throw Error(`Duplicate ${label} requires review.`);}
/** Review only: supplied IDs remain untrusted until provider, rights, consent,
 * website/type and revision checks complete. No synthetic record IDs are emitted. */
export function reviewHomepageMigration(currentHashes:unknown,mappings:unknown={captureDigest:homepageCaptureDigest,media:[],records:[]}){
 const proof=proofSchema.parse(currentHashes),bindings=homepageMigrationManifestSchema.parse(mappings);
 if(bindings.captureDigest!==homepageCaptureDigest)throw Error('Mappings belong to an older homepage capture. Review them again.');
 unique(homepageMigrationDependencies.map(item=>item.sourcePath),'source dependency');
 unique(proof.map(item=>item.sourcePath),'source proof');
 if(proof.length!==homepageMigrationDependencies.length||homepageMigrationDependencies.some(source=>!proof.some(item=>item.sourcePath===source.sourcePath&&item.sha256===source.sha256)))throw Error('Homepage source or media changed. Recapture and review before migration.');
 unique(homepageMigrationRecords.map(item=>item.sourceKey),'source record');
 unique(bindings.media.map(item=>item.sourcePath),'media mapping');
 unique(bindings.media.map(item=>item.assetId),'mapped media identity');
 unique(bindings.records.map(item=>item.sourceKey),'record mapping');
 unique(bindings.records.map(item=>item.recordId),'mapped record identity');
 for(const binding of bindings.media)if(!homepageMigrationMedia.some(item=>item.sourcePath===binding.sourcePath&&item.sha256===binding.sourceSha256))throw Error('Unknown or stale source media mapping.');
 for(const binding of bindings.records)if(!homepageMigrationRecords.some(item=>item.sourceKey===binding.sourceKey))throw Error('Unknown source record mapping.');
 const media=homepageMigrationMedia.map(source=>({...source,proposedAssetId:bindings.media.find(item=>item.sourcePath===source.sourcePath)?.assetId??null}));
 const records=homepageMigrationRecords.map(source=>({...source,proposedRecordId:bindings.records.find(item=>item.sourceKey===source.sourceKey)?.recordId??null}));
 return {schemaVersion:1,mode:'review-only' as const,path:'/',readyToApply:false as const,captureDigest:homepageCaptureDigest,capturedAt:capture.capturedAt,
  sourceProof:proof,media,records,missingMedia:media.filter(item=>!item.proposedAssetId),missingRecords:records.filter(item=>!item.proposedRecordId),
  sectionOrder:capture.sections.map(item=>item.label),
  findings:[
   {code:'composition_pending',message:'Complete source-preserving composition and desktop/mobile comparison are required before draft application.'},
   {code:'provider_verification_required',message:'Mappings do not prove asset processing/rights or record website/type, consent, verification and publication revision.'},
   {code:'dynamic_departures',message:'Captured expedition records are migration evidence, not a permanent filter on future departures.'},
   {code:'uncaptured_surfaces',message:'Disabled sections, navigation image stack and guest films need separate review; source declarations do not verify video playback.'},
   {code:'apply_unavailable',message:'This review has no draft application or publication authority.'},
  ],
 };
}
