import {z} from 'zod';
import inventory from '../../docs/cms/contact-migration-inventory.json' with {type:'json'};
import {contactContentSchema,contactSectionKinds,contactSectionKeys,contactSectionNames} from './contact-content.ts';
import {newPageSeo,pageSeoSchema} from './page-seo.ts';
import {validateComposition} from './composition.ts';
const source=inventory.routes.find(route=>route.path==='/contact');
if(!source?.image||!source.contactContent)throw Error('Contact inventory is incomplete.');
const captured=source;
const digest=z.string().regex(/^[a-f0-9]{64}$/);
const proofSchema=z.array(z.object({sourcePath:z.string(),sha256:digest}).strict()).max(30);
const bindingSchema=z.object({sourcePath:z.string(),sourceSha256:digest,assetId:z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/).refine(value=>!value.startsWith('review-only-'))}).strict();
export const contactMigrationDependencies=[...inventory.sources,...inventory.media.map(item=>({sourcePath:`public${item.sourcePath}`,sha256:item.sha256}))];
/** Pure source proposal: intentionally no form binding,
 * database access or write authorization. A media ID alone is not eligibility. */
export function planContactMigration(currentHashes:unknown,mediaBinding:unknown=null,socialMediaBinding:unknown=null){
 const proof=proofSchema.parse(currentHashes),binding=mediaBinding===null?null:bindingSchema.parse(mediaBinding);
 if(proof.length!==contactMigrationDependencies.length||new Set(proof.map(value=>value.sourcePath)).size!==proof.length||contactMigrationDependencies.some(expected=>!proof.some(value=>value.sourcePath===expected.sourcePath&&value.sha256===expected.sha256)))throw Error('Contact source changed. Recapture and review before migration.');
 const socialBinding=socialMediaBinding===null?null:bindingSchema.parse(socialMediaBinding);
 const original=captured.image!;
 if(binding&&(binding.sourcePath!==original.sourcePath||binding.sourceSha256!==original.sha256))throw Error('Unknown or stale contact image mapping.');
 const og=(property:string)=>{const values=captured.metadata.openGraph.filter(item=>item.property===property);if(values.length!==1)throw Error(`Expected one captured ${property}`);return values[0].content;};
 const socialPath=new URL(og('og:image')).pathname,socialSource=inventory.media.find(item=>item.sourcePath===socialPath);
 if(!socialSource)throw Error('Social image was not inventoried.');
 if(socialBinding&&(socialBinding.sourcePath!==socialSource.sourcePath||socialBinding.sourceSha256!==socialSource.sha256))throw Error('Unknown or stale social image mapping.');
 if(binding&&socialBinding&&binding.assetId===socialBinding.assetId&&binding.sourceSha256!==socialBinding.sourceSha256)throw Error('Different source images need distinct processed assets.');
 const missingMedia=[...(!binding?[original]:[]),...(!socialBinding?[socialSource]:[])];
 const seo=pageSeoSchema.parse({...newPageSeo(),title:captured.title,description:captured.description,canonical:captured.metadata.canonical,socialTitle:og('og:title'),socialDescription:og('og:description'),socialImage:{assetId:socialBinding?.assetId??'review-only-contact-social',alt:og('og:image:alt'),decorative:false}});
 const body=structuredClone(captured.contactContent!);
 const content=contactContentSchema.parse({...body,intro:{...body.intro,image:{assetId:binding?.assetId??'review-only-contact-image',alt:original.alt,caption:body.intro.image.caption,decorative:false}}});
 const composition=validateComposition({schemaVersion:1,title:'Contact Us',sections:contactSectionKinds.map((kind,index)=>({id:`contact-${index+1}`,kind,controls:{label:contactSectionNames[kind],headingLevel:index===0?'h1':'h2',background:index===0?'paper':'white'},data:content[contactSectionKeys[kind]]}))});
 if(!composition.valid||!composition.page)throw Error('Invalid contact proposal composition.');
 return {previewComposition:composition.page,previewPayload:{composition:composition.page,seo},mode:'review-only' as const,readyToApply:false as const,path:'/contact',sourceProof:proof,mediaBinding:binding,socialMediaBinding:socialBinding,missingMedia,content,metadata:{title:captured.title,description:captured.description,...structuredClone(captured.metadata)},legacyForms:inventory.routes.map(route=>({path:route.path,form:structuredClone(route.form)})),findings:[
  ...(missingMedia.length?[{code:'media_unmapped',message:'Select verified processed copies of the contact photograph and sharing image.'}]:[]),
  ...(new URL(seo.canonical).pathname!=='/contact'?[{code:'canonical_review',message:'The captured contact canonical points to another page. Review the intended contact canonical before publication.'}]:[]),
  {code:'social_metadata_review',message:'Captured Twitter and Open Graph tags are retained in source metadata. The current CMS shares one title/description/image across networks; reconcile differences and inherited URL/site metadata before publication.'},
  {code:'indexing_review',message:'Captured robot directives are retained as evidence. Confirm indexing/following and site defaults before publication.'},
  {code:'provider_unverified',message:'Image processing, rights and availability require trusted backend verification.'},
  {code:'form_mapping_pending',message:'Contact and corporate forms need published revision bindings, preserved field defaults/placeholders and verified lead/consent mapping.'},
  {code:'delivery_pending',message:'Draft editing and content preview are available; form integration, website rendering, release checks and migration application are not connected. No content was saved.'},
 ]};
}
