import {z} from 'zod';
import inventory from '../../docs/cms/private-aviation-migration-inventory.json' with {type:'json'};
import {aviationSectionSchemas,type AviationSectionKind} from './private-aviation-content.ts';
import {createAviationSection} from './private-aviation-section-drafts.ts';
import {validateComposition} from './composition.ts';
import {pageSeoSchema,newPageSeo} from './page-seo.ts';
const digest=z.string().regex(/^[a-f0-9]{64}$/);
const proofSchema=z.array(z.object({sourcePath:z.string(),sha256:digest}).strict()).max(1000);
const bindingsSchema=z.array(z.object({sourcePath:z.string(),sourceSha256:digest,assetId:z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/).refine(v=>!v.startsWith('review-only-'))}).strict()).max(100);
export const aviationMigrationDependencies=[...inventory.sources,...inventory.media.map(m=>({sourcePath:`public${m.sourcePath}`,sha256:m.sha256}))];
const kinds:AviationSectionKind[]=['aviationHero','aviationIntroduction','aviationFleet','aviationJourney','aviationServices'];
const classes=['aviation-hero','aviation-intro','aviation-fleet','aviation-journey','aviation-service'];
/** Pure comparison proposal. Caller hashes/bindings prove neither rights nor
 * processing, and this function never writes, approves or publishes content. */
export function planPrivateAviationMigration(currentHashes:unknown,mediaBindings:unknown=[]){
 const proof=proofSchema.parse(currentHashes),bindings=bindingsSchema.parse(mediaBindings);
 if(proof.length!==aviationMigrationDependencies.length||new Set(proof.map(p=>p.sourcePath)).size!==proof.length||aviationMigrationDependencies.some(expected=>!proof.some(p=>p.sourcePath===expected.sourcePath&&p.sha256===expected.sha256)))throw Error('Aviation source changed. Recapture and review before migration.');
 if(new Set(bindings.map(b=>b.sourcePath)).size!==bindings.length)throw Error('Duplicate Aviation source binding.');
 for(const b of bindings){if(!inventory.media.some(m=>m.sourcePath===b.sourcePath&&m.sha256===b.sourceSha256))throw Error('Unknown or stale Aviation media mapping.');if(bindings.some(other=>other.assetId===b.assetId&&other.sourceSha256!==b.sourceSha256))throw Error('Different source media require distinct processed assets.');}
 const desktop=inventory.views.find(v=>v.width===1280)!,mobile=inventory.views.find(v=>v.width===390)!;
 if(!desktop||!mobile||desktop.content.length!==5||mobile.content.length!==5||classes.some((c,i)=>desktop.content[i].className.split(' ')[0]!==c||mobile.content[i].className.split(' ')[0]!==c))throw Error('Incomplete Aviation capture.');
 const asset=(sourcePath:string)=>{const index=inventory.media.findIndex(m=>m.sourcePath===sourcePath);if(index<0)throw Error('Uncaptured Aviation media.');return bindings.find(b=>b.sourcePath===sourcePath)?.assetId??`review-only-aviation-${index+1}`;};
 const frame=(position:string)=>{const match=/^(\d+(?:\.\d+)?)% (\d+(?:\.\d+)?)%$/.exec(position);if(!match)throw Error('Unsupported Aviation focal point.');return {x:Number(match[1]),y:Number(match[2]),shape:'natural' as const};};
 const media=(section:number,index=0)=>{const d=desktop.content[section].images[index],m=mobile.content[section].images[index];if(!d||!m||d.sourcePath!==m.sourcePath)throw Error('Review changed Aviation responsive media.');return {image:{assetId:asset(d.sourcePath),alt:d.alt,decorative:false},desktopFraming:frame(d.objectPosition),mobileFraming:frame(m.objectPosition)};};
 const title=(i:number)=>({eyebrow:desktop.content[i].paragraphs[0],heading:{lines:structuredClone(desktop.content[i].headings[0].lines)}});
 const link=(i:number)=>{const l=desktop.content[i].links[0];if(!l||l.href!=='/plan?experience=private-aviation')throw Error('Review changed Aviation planning intent.');return {...l,newWindow:false};};
 const steps=(items:{title:string;copy:string}[],prefix:string)=>items.map((s,i)=>({id:`${prefix}-${i+1}`,title:s.title,copy:s.copy}));
 const [hero,intro,fleet,journey,services]=desktop.content,video=hero.videos[0],smallVideo=mobile.content[0].videos[0];
 if(!video||!smallVideo||video.sources.length!==1||video.sources[0].type!=='video/mp4'||video.poster!==smallVideo.poster||video.sources[0].src!==smallVideo.sources[0]?.src||video.aspectRatio!=='1920 / 745'||smallVideo.aspectRatio!=='4 / 3'||!video.muted||video.ariaHidden!=='true'||!video.poster||!video.sources[0].src)throw Error('Review changed Aviation hero media.');
 const sourceNote=fleet.paragraphs.at(-1);
 const data:unknown[]=[
 {...title(0),copy:hero.paragraphs[1],button:link(0),media:{poster:{assetId:asset(video.poster),alt:'',decorative:true},background:{kind:'video',desktopAssetId:asset(video.sources[0].src)},desktopFraming:{...frame(video.objectPosition),shape:'panorama'},mobileFraming:{...frame(smallVideo.objectPosition),shape:'landscape'}},captions:{primary:hero.captions[0].text,secondary:hero.captions[1].text,showSecondaryOnMobile:mobile.content[0].captions[1].visible}},
 {...title(1),paragraphs:intro.paragraphs.slice(1,3).map((text,i)=>({id:`aviation-intro-${i+1}`,text})),button:link(1),sequenceLabel:intro.routeSteps[0].accessibleLabel,steps:steps(intro.routeSteps,'aviation-route')},
 {...title(2),introduction:fleet.paragraphs[1],aircraft:fleet.aircraft.map((a,i)=>({id:`aviation-aircraft-${i+1}`,name:a.name,type:a.type,summary:a.summary,media:media(2,i),specifications:a.specifications.map((s,j)=>({id:`aviation-spec-${j+1}`,label:s.label,value:s.value}))})),sourceNote},
 {...title(3),media:media(3),steps:steps(journey.journeySteps,'aviation-journey')},
 {...title(4),introduction:services.paragraphs[1],items:steps(services.services,'aviation-service')},
 ];
 const checked=validateComposition({schemaVersion:1,title:'Private Aviation',sections:kinds.map((kind,i)=>({...createAviationSection(kind,`aviation-section-${i+1}`),data:aviationSectionSchemas[kind].parse(data[i])}))});
 if(!checked.page)throw Error('Invalid Aviation migration composition.');
 const canonical='https://safaricrafters.com/private-aviation';
 const seo=pageSeoSchema.parse({...newPageSeo(),title:inventory.metadata.title,description:inventory.metadata.description,canonical});
 const missingMedia=inventory.media.filter(m=>!bindings.some(b=>b.sourcePath===m.sourcePath));
 return {mode:'review-only' as const,readyToApply:false as const,path:inventory.path,sourceProof:proof,mediaBindings:bindings,missingMedia,previewPayload:{composition:checked.page,seo},metadata:structuredClone(inventory.metadata),metadataChanges:[{field:'canonical',before:inventory.metadata.canonical,proposed:canonical,reason:'The source inherits the homepage canonical. Review the page-specific proposed URL.'},{field:'socialImage',before:inventory.metadata.ogImage,proposed:'inherit',reason:'The inherited global sharing image is outside this page media inventory. Review published global SEO defaults or select an approved page image.'}],findings:[
 ...(missingMedia.length?[{code:'media_unmapped',message:'Map four original images and the original video to verified processed assets.'}]:[]),
 {code:'provider_unverified',message:'Original file provenance, video processing, tenant ownership and current rights require trusted backend checks.'},
 {code:'claims_review',message:'Review aircraft specifications, operating limitations and partnership claims with the client.'},
 {code:'presentation_pending',message:'Source heading lines, focal points and caption behavior are retained; final responsive layout and motion require visual acceptance.'},
 {code:'metadata_review',message:'Review the explicit canonical correction and inherited social image behavior.'},
 {code:'delivery_pending',message:'This proposal saves nothing. Atomic migration application and public release are not connected.'},
 ]};
}
