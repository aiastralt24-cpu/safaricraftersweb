import {createHash} from 'node:crypto';
import {z} from 'zod';
import capture from '../../docs/cms/concept-migration-inventory.json' with {type:'json'};

const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const digest=z.string().regex(/^[a-f0-9]{64}$/);
import {conceptMigrationManifestSchema} from './concept-migration-contracts.ts';
export {conceptMigrationManifestSchema} from './concept-migration-contracts.ts';
const proofSchema=z.array(z.object({sourcePath:z.string(),sha256:digest}).strict()).max(2000);

export const conceptCaptureDigest=hash(JSON.stringify(capture));
const usedMedia=new Set<string>();
function collect(value:unknown){if(!value||typeof value!=='object')return;const item=value as Record<string,unknown>;if(typeof item.sourcePath==='string')usedMedia.add(item.sourcePath);for(const child of Object.values(item))collect(child);}
collect(capture.content);collect(capture.viewportContent);collect(capture.states);collect(capture.navigation);collect(capture.heroVideoDeclaration);
export const conceptMigrationMedia=[
 ...capture.media.filter(item=>usedMedia.has(item.sourcePath)).map(item=>({...item,kind:item.sourcePath.endsWith('.mp4')?'video' as const:'image' as const})),
];
export const conceptMigrationDependencies=[
 ...capture.sources,
 ...capture.media.map(item=>({sourcePath:`public${item.sourcePath}`,sha256:item.sha256})),
];
function section(label:string){
 const matches=capture.content.filter(item=>item.navLabel===label);
 if(matches.length!==1)throw Error(`Source section needs review: ${label}`);
 return matches[0];
}
const routeRecords=(label:string,prefix:string,type:'journey'|'photoExpedition')=>section(label).links.filter(link=>link.href?.startsWith(`${prefix}/`)).map(link=>({
 sourceKey:`${type}:${link.href}`,type,path:link.href!,evidence:{label:link.label},
}));
export const conceptMigrationRecords=[
 ...routeRecords('Private journeys','/journeys','journey'),
 ...routeRecords('Photography Tours','/photo-expeditions','photoExpedition'),
 ...capture.states.filter(item=>item.kind==='guest-note').map(({content:note})=>{
  if(note.quotes.length!==1||note.figures.length!==1||note.links.length!==2)throw Error('Guest source structure needs review.');
  const evidence={quote:note.quotes[0],trip:note.figures[0],href:note.links[1].href};
  return {sourceKey:`testimonial:${hash(JSON.stringify(evidence))}`,type:'testimonial' as const,path:null,evidence};
 }),
];
function unique(values:string[],label:string){if(new Set(values).size!==values.length)throw Error(`Duplicate ${label} requires review.`);}
/** Review only: supplied IDs remain untrusted until provider, rights, consent,
 * website/type and revision checks complete. No synthetic record IDs are emitted. */
export function reviewConceptMigration(currentHashes:unknown,mappings:unknown={captureDigest:conceptCaptureDigest,media:[],records:[]}){
 const proof=proofSchema.parse(currentHashes),bindings=conceptMigrationManifestSchema.parse(mappings);
 if(bindings.captureDigest!==conceptCaptureDigest)throw Error('Mappings belong to an older Concept capture. Review them again.');
 unique(conceptMigrationDependencies.map(item=>item.sourcePath),'source dependency');
 unique(proof.map(item=>item.sourcePath),'source proof');
 if(proof.length!==conceptMigrationDependencies.length||conceptMigrationDependencies.some(source=>!proof.some(item=>item.sourcePath===source.sourcePath&&item.sha256===source.sha256)))throw Error('Concept source or media changed. Recapture and review before migration.');
 unique(conceptMigrationRecords.map(item=>item.sourceKey),'source record');
 unique(bindings.media.map(item=>item.sourcePath),'media mapping');
 unique(bindings.media.map(item=>item.assetId),'mapped media identity');
 unique(bindings.records.map(item=>item.sourceKey),'record mapping');
 unique(bindings.records.map(item=>item.recordId),'mapped record identity');
 for(const binding of bindings.media)if(!conceptMigrationMedia.some(item=>item.sourcePath===binding.sourcePath&&item.sha256===binding.sourceSha256))throw Error('Unknown or stale source media mapping.');
 for(const binding of bindings.records)if(!conceptMigrationRecords.some(item=>item.sourceKey===binding.sourceKey))throw Error('Unknown source record mapping.');
 const media=conceptMigrationMedia.map(source=>({...source,proposedAssetId:bindings.media.find(item=>item.sourcePath===source.sourcePath)?.assetId??null}));
 const records=conceptMigrationRecords.map(source=>({...source,proposedRecordId:bindings.records.find(item=>item.sourceKey===source.sourceKey)?.recordId??null}));
 return {schemaVersion:1,mode:'review-only' as const,path:'/concept',readyToApply:false as const,captureDigest:conceptCaptureDigest,capturedAt:capture.capturedAt,
  sourceProof:proof,media,records,missingMedia:media.filter(item=>!item.proposedAssetId),missingRecords:records.filter(item=>!item.proposedRecordId),
  sectionOrder:capture.content.map(item=>item.navLabel),
  findings:[
   {code:'composition_pending',message:'Complete source-preserving composition and desktop/mobile comparison are required before draft application.'},
   {code:'provider_verification_required',message:'Mappings do not prove asset processing/rights or record website/type, consent, verification and publication revision.'},
   {code:'dynamic_departures',message:'Captured expedition records are migration evidence, not a permanent filter on future departures.'},
   {code:'uncaptured_surfaces',message:'Disabled source sections and guest films need separate review; captured video declarations do not verify playback.'},
   {code:'apply_unavailable',message:'This review has no draft application or publication authority.'},
  ],
 };
}
