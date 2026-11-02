import {z} from 'zod';
import inventory from '../../docs/cms/concept-migration-inventory.json' with {type:'json'};
import {conceptNavigationSchema} from './concept-navigation.ts';
const digest=z.string().regex(/^[a-f0-9]{64}$/);
const proof=z.array(z.object({sourcePath:z.string(),sha256:digest}).strict()).max(2000);
const bindings=z.array(z.object({sourcePath:z.string(),sourceSha256:digest,assetId:z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/).refine(value=>!value.startsWith('review-only-'))}).strict()).max(12);
export const conceptNavigationDependencies=[...inventory.sources,...inventory.media.map(m=>({sourcePath:`public${m.sourcePath}`,sha256:m.sha256}))];
/** A page-owned menu proposal only. No shared navigation or settings mutation. */
export function planConceptNavigationMigration(currentHashes:unknown,mappings:unknown=[]){
 const input=proof.parse(currentHashes),selected=bindings.parse(mappings);
 if(input.length!==conceptNavigationDependencies.length||new Set(input.map(item=>item.sourcePath)).size!==input.length||conceptNavigationDependencies.some(expected=>!input.some(item=>item.sourcePath===expected.sourcePath&&item.sha256===expected.sha256)))throw Error('Concept source changed. Recapture and review the menu.');
 const paths=[...new Set(inventory.navigation.primary.map(item=>item.image.sourcePath))];
 if(new Set(selected.map(item=>item.sourcePath)).size!==selected.length||new Set(selected.map(item=>item.assetId)).size!==selected.length||selected.some(item=>!paths.includes(item.sourcePath)||inventory.media.find(m=>m.sourcePath===item.sourcePath)?.sha256!==item.sourceSha256))throw Error('Concept menu image mappings are duplicated, stale or unknown.');
 const missingMedia=paths.filter(path=>!selected.some(item=>item.sourcePath===path)).map(path=>inventory.media.find(item=>item.sourcePath===path)!);
 const source=structuredClone(inventory.navigation);
 const navigation=conceptNavigationSchema.parse({...source,schemaVersion:1,primary:source.primary.map((item,index)=>({...item,image:{assetId:selected.find(binding=>binding.sourcePath===item.image.sourcePath)?.assetId??`review-only-concept-menu-${index+1}`,alt:item.image.alt,decorative:item.image.decorative}}))});
 return {mode:'review-only' as const,readyToApply:false as const,owner:{type:'page' as const,path:'/concept'},sourceProof:input,navigation,missingMedia,findings:[
  {code:'menu_ownership',message:'This menu belongs to the Concept page revision. It must not replace the shared website navigation.'},
  {code:'menu_media_verification',message:'Mapped images need verified processing, source provenance and current usage rights.'},
  {code:'menu_link_review',message:'Review local route availability and any changed links before release.'},
  {code:'menu_delivery_pending',message:'Menu authoring, page integration and accessible public rendering are not connected. Nothing was saved or published.'},
 ]};
}
