import {z} from 'zod';
import inventory from '../../docs/cms/conservation-migration-inventory.json' with {type:'json'};
import {validateComposition} from './composition.ts';
import {newPageSeo,pageSeoSchema} from './page-seo.ts';
import {conservationSectionKeys,conservationSectionNames,conservationSectionKinds} from './conservation-content.ts';
import {conservationContentSchema} from './conservation-content.ts';
const digest=z.string().regex(/^[a-f0-9]{64}$/);
const proofSchema=z.array(z.object({sourcePath:z.string(),sha256:digest}).strict()).max(30);
const bindingsSchema=z.array(z.object({sourcePath:z.string(),sourceSha256:digest,assetId:z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/)}).strict()).max(5);
export const conservationMigrationDependencies=[...inventory.sources,...inventory.media.map(value=>({sourcePath:`public${value.sourcePath}`,sha256:value.sha256}))];
/** Source-preserving proposal only; mapped IDs do not prove asset availability or rights. */
export function planConservationMigration(currentHashes:unknown,mediaBindings:unknown=[]){
 const proof=proofSchema.parse(currentHashes),bindings=bindingsSchema.parse(mediaBindings);
 if(proof.length!==conservationMigrationDependencies.length||new Set(proof.map(value=>value.sourcePath)).size!==proof.length||conservationMigrationDependencies.some(expected=>!proof.some(value=>value.sourcePath===expected.sourcePath&&value.sha256===expected.sha256)))throw Error('Conservation source changed. Recapture and review before migration.');
 if(new Set(bindings.map(value=>value.sourcePath)).size!==bindings.length||new Set(bindings.map(value=>value.assetId)).size!==bindings.length)throw Error('Use distinct processed image mappings.');
 for(const binding of bindings)if(binding.assetId.startsWith('review-only-')||!inventory.media.some(media=>media.sourcePath===binding.sourcePath&&media.sha256===binding.sourceSha256))throw Error('Unknown or stale image mapping.');
 const missingMedia=inventory.media.filter(media=>!bindings.some(binding=>binding.sourcePath===media.sourcePath));
 const picture=(value:{sourcePath:string;alt:string})=>{const index=inventory.media.findIndex(media=>media.sourcePath===value.sourcePath);if(index<0)throw Error('Uncaptured image');return {assetId:bindings.find(binding=>binding.sourcePath===value.sourcePath)?.assetId??`review-only-conservation-${index+1}`,alt:value.alt,decorative:false};};
 const body=structuredClone(inventory.content);
 const content=conservationContentSchema.parse({...body,hero:{...body.hero,image:picture(body.hero.image)},fieldRecords:{...body.fieldRecords,items:body.fieldRecords.items.map(item=>({...item,image:picture(item.image)}))}});
 const composition=validateComposition({schemaVersion:1,title:'Conservation Commitment',sections:conservationSectionKinds.map((kind,index)=>({id:`conservation-${index+1}`,kind,controls:{label:conservationSectionNames[kind],headingLevel:index===0?'h1':'h2',background:['conservationHero','conservationRecords','conservationFootprint'].includes(kind)?'forest':'paper',mediaAlign:'start',mobileOrder:'mediaFirst'},data:content[conservationSectionKeys[kind]]}))});
 if(!composition.valid||!composition.page)throw Error('Conservation migration composition is invalid.');
 // The captured title already includes the site's title template. Preserve it as
 // an explicit absolute override; applying a new default must not change it.
 const canonical=new URL(inventory.metadata.canonical),socialUrl=new URL(inventory.metadata.openGraph.image,canonical);
 if(socialUrl.origin!==canonical.origin||socialUrl.search||socialUrl.hash)throw Error('Social image requires explicit source review.');
 const sourceImages=[body.hero.image,...body.fieldRecords.items.map(item=>item.image)];
 const socialSource=sourceImages.find(image=>image.sourcePath===socialUrl.pathname);
 if(!socialSource)throw Error('Social image is missing from the captured source image inventory.');
 const seo=pageSeoSchema.parse({...newPageSeo(),title:inventory.metadata.title,description:inventory.metadata.description,canonical:inventory.metadata.canonical,socialTitle:inventory.metadata.openGraph.title,socialDescription:inventory.metadata.openGraph.description,socialImage:picture(socialSource)});

 return {previewPayload:{composition:composition.page,seo},mode:'review-only' as const,readyToApply:false as const,path:inventory.path,sourceProof:proof,mediaBindings:bindings,missingMedia,content,metadata:structuredClone(inventory.metadata),findings:[
  ...(missingMedia.length?[{code:'media_unmapped',message:'Replace review-only images with verified processed CMS assets.'}]:[]),
  {code:'provider_unverified',message:'Mapped image processing, rights and availability still require trusted backend checks.'},
  {code:'source_claims_review',message:'Existing metrics and project claims are preserved, not independently verified; review their attribution and currency.'},
  {code:'delivery_pending',message:'Draft editing and layout preview are available; public rendering, trusted release checks and migration application are not connected. No content was saved or published.'},
 ]};
}
