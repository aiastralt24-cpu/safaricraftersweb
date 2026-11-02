import {z} from 'zod';
import inventory from '../../docs/cms/kenya-source-inventory.json' with {type:'json'};
import {kenyaPlaces,kenyaCombinations} from '../../content/kenya-editorial.ts';
import {kenyaSectionKinds,kenyaSectionSchemas} from './kenya-country-sections.ts';
import {createKenyaSection} from './kenya-section-drafts.ts';
import {validateComposition} from './composition.ts';
import {newPageSeo,pageSeoSchema} from './page-seo.ts';
const hash=z.string().regex(/^[a-f0-9]{64}$/);
const proofSchema=z.array(z.object({sourcePath:z.string(),sha256:hash}).strict()).max(500);
const bindingsSchema=z.array(z.object({sourcePath:z.string(),sourceSha256:hash,assetId:z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/).refine(id=>!id.startsWith('review-only-'))}).strict()).max(100);
export const kenyaMigrationDependencies=[...inventory.sources,...inventory.media.map(m=>({sourcePath:`public${m.sourcePath}`,sha256:m.sha256}))];
/** Produces a review artifact only. Asset selections are not permission or rights evidence. */
export function planKenyaMigration(currentHashes:unknown,mediaBindings:unknown=[]){
 const proof=proofSchema.parse(currentHashes),bindings=bindingsSchema.parse(mediaBindings);
 if(proof.length!==kenyaMigrationDependencies.length||new Set(proof.map(p=>p.sourcePath)).size!==proof.length||kenyaMigrationDependencies.some(e=>!proof.some(p=>p.sourcePath===e.sourcePath&&p.sha256===e.sha256)))throw Error('Kenya source changed. Recapture and review before migration.');
 if(new Set(bindings.map(b=>b.sourcePath)).size!==bindings.length)throw Error('Duplicate Kenya media binding.');
 for(const b of bindings){if(!inventory.media.some(m=>m.sourcePath===b.sourcePath&&m.sha256===b.sourceSha256))throw Error('Unknown or stale Kenya media binding.');if(bindings.some(other=>other.assetId===b.assetId&&other.sourceSha256!==b.sourceSha256))throw Error('Different source images need distinct processed assets.');}
 const desktop=inventory.views.find(v=>v.width===1280),mobile=inventory.views.find(v=>v.width===390);
 if(!desktop||!mobile||desktop.content.length!==10||JSON.stringify(desktop.content)!==JSON.stringify(mobile.content)||JSON.stringify(desktop.metadata)!==JSON.stringify(mobile.metadata))throw Error('Review changed Kenya responsive content before migration.');
 const [hero,facts,opening,places,gallery,luxury,itineraries,faq,planner,related]=desktop.content;
 const heading=(h:typeof hero.headings[number])=>({lines:structuredClone(h.lines)});
 const headingText=(h:typeof hero.headings[number])=>h.lines.map(l=>l.runs.map(r=>r.text).join('')).join(' ');
 const titled=(s:typeof hero)=>({eyebrow:s.paragraphs[0],heading:heading(s.headings[0])});
 const image=(m:typeof hero.images[number],credit?:string)=>{const index=inventory.media.findIndex(entry=>entry.sourcePath===m.sourcePath);if(index<0)throw Error('Uncaptured Kenya image.');return {assetId:bindings.find(b=>b.sourcePath===m.sourcePath)?.assetId??`review-only-kenya-${index+1}`,alt:m.alt,decorative:false,...(credit?{credit}:{})};};
 // Values absent from the DOM (place subtitles and undisplayed itinerary copy)
 // come from the source module included in the exact dependency proof.
 const sourceAgrees=kenyaPlaces.length===places.images.length&&kenyaCombinations.length===itineraries.images.length&&kenyaPlaces.every((p,i)=>p.title===headingText(places.headings[i+1])&&p.copy===places.paragraphs[i+1]&&p.focus===places.small[i]&&places.links[i*2].href===places.links[i*2+1].href)&&kenyaCombinations.every((c,i)=>c.title===headingText(itineraries.headings[i+1])&&c.image.src===itineraries.images[i].sourcePath&&c.image.alt===itineraries.images[i].alt);
 if(!sourceAgrees)throw Error('Kenya editorial source and captured content disagree.');
 const focal=/^(\d+(?:\.\d+)?)% (\d+(?:\.\d+)?)%$/.exec(hero.images[0].objectPosition);if(!focal)throw Error('Review Kenya hero focal point.');
 const data=[
 {title:headingText(hero.headings[0]),accent:hero.headings[0].lines.flatMap(l=>l.runs).filter(r=>r.emphasis).map(r=>r.text).join(''),copy:hero.paragraphs[1],meta:hero.paragraphs[0],image:image(hero.images[0],hero.paragraphs[2]),focalPoint:{x:Number(focal[1]),y:Number(focal[2])},breadcrumbs:[...hero.links.map((l,i)=>({id:`crumb-${i}`,label:l.label,href:l.href})),{id:'current',label:headingText(hero.headings[0])}]},
 {accessibleLabel:facts.label,items:facts.headings.map((h,i)=>({id:`fact-${i}`,label:headingText(h),value:facts.paragraphs[i],note:facts.small[i]}))},
 {...titled(opening),lead:opening.paragraphs[1],paragraphs:opening.paragraphs.slice(2).map((text,i)=>({id:`intro-${i}`,text}))},
 {...titled(places),items:kenyaPlaces.map((p,i)=>({id:p.slug,title:p.title,subtitle:p.subtitle,copy:p.copy,focus:p.focus,image:image(places.images[i]),button:{label:places.links[i*2+1].label,href:places.links[i*2+1].href},imageLinkLabel:places.links[i*2].ariaLabel}))},
 {heading:heading(gallery.headings[0]),copy:gallery.paragraphs[0],accessibleLabel:'Kenya field photographs',images:gallery.images.map((m,i)=>({id:`gallery-${i}`,image:image(m,'Safari Crafters archive')}))},
 {...titled(luxury),image:image(luxury.images[0]),caption:luxury.captions[0],paragraphs:luxury.paragraphs.slice(1).map((text,i,a)=>({id:`luxury-${i}`,text,emphasized:i===a.length-1}))},
 {...titled(itineraries),items:kenyaCombinations.map((c,i)=>({id:c.slug,title:c.title,label:c.note,copy:c.copy,image:image(itineraries.images[i]),button:{label:'Start planning',href:itineraries.links[i].href}}))},
 {...titled(faq),items:faq.faq.map((f,i)=>({id:`faq-${i}`,...f}))},
 {...titled(planner),copy:planner.paragraphs[1],button:{label:planner.links[0].label,href:planner.links[0].href}},
 {...titled(related),items:related.links.map((l,i)=>{const title=headingText(related.headings[i+1]),copy=related.paragraphs[i+1],prefix=title+copy;if(!l.label.startsWith(prefix))throw Error('Review Kenya related-country labels.');return {id:`related-${i}`,title,copy,button:{label:l.label.slice(prefix.length),href:l.href}};})},
 ];
 const checked=validateComposition({schemaVersion:1,title:'Kenya',sections:kenyaSectionKinds.map((kind,i)=>({...createKenyaSection(kind,`kenya-section-${i+1}`),data:kenyaSectionSchemas[kind].parse(data[i])}))});
 if(!checked.valid||!checked.page)throw Error('Invalid Kenya migration composition.');
 return {mode:'review-only' as const,readyToApply:false as const,path:inventory.path,sourceProof:proof,previewPayload:{composition:checked.page,seo:pageSeoSchema.parse({...newPageSeo(),title:desktop.metadata.title,description:desktop.metadata.description,canonical:desktop.metadata.canonical})},mediaBindings:bindings,missingMedia:inventory.media.filter(m=>!bindings.some(b=>b.sourcePath===m.sourcePath)),metadata:structuredClone(desktop.metadata),findings:[
 {code:'media_review',message:'Verify each processed asset, same-site access, rights and availability through the trusted backend. No rights or uncaptured credits are inferred.'},
 {code:'retained_itinerary_copy',message:'Itinerary copy is retained from the source module; the current website does not display it.'},
 {code:'metadata_review',message:'Review inherited social imagery and indexing policy. Captured structured data is evidence, not executable content.'},
 {code:'delivery_pending',message:'No draft was saved. Migration apply, trusted publication and visitor delivery remain pending.'},
 ]};
}
