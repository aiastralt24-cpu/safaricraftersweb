import {z} from 'zod';
import inventory from '../../docs/cms/guided-safaris-migration-inventory.json' with {type:'json'};
import {guidedSectionSchemas,type GuidedSectionKind} from './guided-safaris-content.ts';
import {guidedSectionNames,guidedPresentationDefaults} from './guided-safaris-section-drafts.ts';
import {validateComposition} from './composition.ts';
import {newPageSeo,pageSeoSchema} from './page-seo.ts';

const digest=z.string().regex(/^[a-f0-9]{64}$/);
const proofSchema=z.array(z.object({sourcePath:z.string(),sha256:digest}).strict()).max(1000);
const bindingsSchema=z.array(z.object({sourcePath:z.string(),sourceSha256:digest,assetId:z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/).refine(value=>!value.startsWith('review-only-'))}).strict()).max(100);
export const guidedMigrationDependencies=[...inventory.sources,...inventory.media.map(item=>({sourcePath:`public${item.sourcePath}`,sha256:item.sha256}))];
const classes=['guided-hero','guided-introduction','guided-expand-shell','guided-field','guided-photography','guided-person','guided-paths','guided-faq'];
const kinds:GuidedSectionKind[]=['guidedHero','guidedIntroduction','guidedEncounter','guidedFieldCards','guidedPhotography','guidedCompanion','guidedPaths','guidedFaq'];

/** A pure review proposal. Hash matches and caller-provided bindings do not confer
 * media rights, write permissions or publication authority. */
export function planGuidedSafarisMigration(currentHashes:unknown,mediaBindings:unknown=[]){
 const proof=proofSchema.parse(currentHashes),bindings=bindingsSchema.parse(mediaBindings);
 if(proof.length!==guidedMigrationDependencies.length||new Set(proof.map(p=>p.sourcePath)).size!==proof.length||guidedMigrationDependencies.some(expected=>!proof.some(p=>p.sourcePath===expected.sourcePath&&p.sha256===expected.sha256)))throw Error('Bespoke source changed. Recapture and review before migration.');
 if(new Set(bindings.map(b=>b.sourcePath)).size!==bindings.length)throw Error('Duplicate source media binding.');
 for(const binding of bindings){if(!inventory.media.some(m=>m.sourcePath===binding.sourcePath&&m.sha256===binding.sourceSha256))throw Error('Unknown or stale Bespoke image mapping.');if(bindings.some(other=>other.assetId===binding.assetId&&other.sourceSha256!==binding.sourceSha256))throw Error('Different source images need distinct processed assets.');}
 const desktop=inventory.views.find(v=>v.width===1280)!,mobile=inventory.views.find(v=>v.width===390)!;
 if(!desktop||!mobile||desktop.content.length!==8||mobile.content.length!==8)throw Error('Incomplete Bespoke capture.');
 for(const [i,name]of classes.entries())if(desktop.content[i].className!==name||mobile.content[i].className!==name)throw Error('Unexpected Bespoke section ordering.');
 const asset=(sourcePath:string)=>bindings.find(b=>b.sourcePath===sourcePath)?.assetId??`review-only-guided-${inventory.media.findIndex(m=>m.sourcePath===sourcePath)+1}`;
 const media=(sectionIndex:number,imageIndex=0)=>{
  const section=desktop.content[sectionIndex],original=section.images[imageIndex],small=mobile.content[sectionIndex].images[imageIndex];
  if(!original||!small||original.sourcePath!==small.sourcePath||!inventory.media.some(m=>m.sourcePath===original.sourcePath))throw Error('Unsupported Bespoke responsive image capture.');
  const framing=(position:string)=>{const match=/^(\d+(?:\.\d+)?)% (\d+(?:\.\d+)?)%$/.exec(position);if(!match)throw Error('Unsupported source image framing.');return {x:Number(match[1]),y:Number(match[2]),shape:'natural' as const};};
  return {image:{assetId:asset(original.sourcePath),alt:original.alt,decorative:false,...(section.figures[imageIndex]?{caption:section.figures[imageIndex]}:{})},desktopFraming:framing(original.objectPosition),mobileFraming:framing(small.objectPosition)};
 };
 const title=(index:number)=>({eyebrow:desktop.content[index].paragraphs[0],heading:{lines:structuredClone(desktop.content[index].headings[0].lines)}});
 const paragraphs=(index:number)=>desktop.content[index].paragraphs.slice(1).map((text,i)=>({id:`guided-${index}-paragraph-${i+1}`,text}));
 const link=(value:{label:string;href:string|null})=>({label:value.label,href:value.href,newWindow:false});
 const hero=desktop.content[0],field=desktop.content[3],paths=desktop.content[6],faq=desktop.content[7];
 const conditional=inventory.conditionalSections.find(s=>s.condition==='showSpecialistsCta');
 const disabled=inventory.declarations.find(d=>d.name==='showSpecialistsCta')?.expression;
 const optionalLink=conditional?.source.match(/<Link href="([^"]+)">([^<]+)</);
 if(disabled!=='false'||!optionalLink)throw Error('Review changed specialists CTA configuration.');
 const data:unknown[]=[
  {...title(0),copy:hero.paragraphs[1],media:media(0),button:link(hero.links[0]),scrollCue:{label:hero.links[1].label,accessibleLabel:hero.links[1].ariaLabel,anchor:hero.links[1].href}},
  {...title(1),paragraphs:paragraphs(1)},
  {accessibleLabel:desktop.content[2].label,media:media(2),expandOnScroll:true},
  {...title(3),introduction:field.paragraphs[1],mobileLayout:'horizontal',items:field.images.map((_,i)=>({id:`guided-field-${i+1}`,eyebrow:field.paragraphs[2+i*2],heading:{lines:structuredClone(field.headings[i+1].lines)},copy:field.paragraphs[3+i*2],media:media(3,i)}))},
  {...title(4),paragraphs:paragraphs(4),quotation:desktop.content[4].quotes[0],media:media(4)},
  {...title(5),paragraphs:paragraphs(5),media:media(5),button:{enabled:false,link:{label:optionalLink[2].trim(),href:optionalLink[1],newWindow:false}}},
  {...title(6),items:paths.images.map((_,i)=>({id:`guided-path-${i+1}`,eyebrow:paths.pathCards[i].eyebrow,heading:{lines:structuredClone(paths.headings[i+1].lines)},copy:paths.paragraphs[i+1],media:media(6,i),action:{label:paths.pathCards[i].actionLabel,href:paths.pathCards[i].href,newWindow:false}}))},
  {...title(7),items:faq.faq.map((item,i)=>({id:`guided-question-${i+1}`,question:item.question,answer:item.answer})),initialOpenId:faq.faq.some(item=>item.expanded==='true')?`guided-question-${faq.faq.findIndex(item=>item.expanded==='true')+1}`:null},
 ];
 const checked=validateComposition({schemaVersion:1,title:'Bespoke Safaris',sections:kinds.map((kind,i)=>({id:`guided-section-${i+1}`,kind,controls:{...guidedPresentationDefaults(kind),label:guidedSectionNames[kind],headingLevel:i===0?'h1':'h2',animation:[1,3,4,5,6,7].includes(i)?'reveal':'none',...(desktop.content[i].id?{anchor:desktop.content[i].id}:{})},data:guidedSectionSchemas[kind].parse(data[i])}))});
 if(!checked.valid||!checked.page)throw Error('Invalid Bespoke migration composition.');
 const og=(name:string)=>{const items=inventory.metadata.openGraph.filter(m=>m.property===name);if(items.length!==1)throw Error(`Expected one captured ${name}`);return items[0].content;};
 const socialPath=new URL(inventory.metadata.ogImage!).pathname;
 if(!inventory.media.some(m=>m.sourcePath===socialPath))throw Error('Sharing image was not inventoried.');
 const seo=pageSeoSchema.parse({...newPageSeo(),title:inventory.metadata.title,description:inventory.metadata.description,canonical:inventory.metadata.canonical,socialTitle:og('og:title'),socialDescription:og('og:description'),socialImage:{assetId:asset(socialPath),alt:og('og:image:alt'),decorative:false}});
 const missingMedia=inventory.media.filter(m=>!bindings.some(b=>b.sourcePath===m.sourcePath));
 return {mode:'review-only' as const,readyToApply:false as const,path:inventory.path,sourceProof:proof,mediaBindings:bindings,missingMedia,previewPayload:{composition:checked.page,seo},metadata:structuredClone(inventory.metadata),findings:[
  ...(missingMedia.length?[{code:'media_unmapped',message:'Map all original images to verified processed assets.'}]:[]),
  {code:'provider_unverified',message:'Media provenance, processing, rights and availability require trusted backend verification.'},
  {code:'presentation_pending',message:'Focal points are retained; natural framing leaves source-specific crop geometry to the future website renderer. Motion and visual equivalence remain unverified.'},
  {code:'metadata_review',message:'Review captured social metadata and indexing defaults before publication.'},
  {code:'delivery_pending',message:'This proposal saves nothing. Migration application and public release are not connected.'},
 ]};
}
