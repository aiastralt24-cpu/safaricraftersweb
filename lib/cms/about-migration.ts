import {z} from 'zod';
import inventory from '../../docs/cms/about-migration-inventory.json' with {type:'json'};
import {projectAboutPage} from './about-page.ts';
import {newPageSeo} from './page-seo.ts';
const digest=z.string().regex(/^[a-f0-9]{64}$/);
const proofSchema=z.array(z.object({sourcePath:z.string(),sha256:digest}).strict()).max(30);
const bindingSchema=z.array(z.object({sourcePath:z.string(),sourceSha256:digest,assetId:z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/)}).strict()).max(4);
export const aboutMigrationDependencies=[...inventory.sources,...inventory.media.map(media=>({sourcePath:`public${media.sourcePath}`,sha256:media.sha256}))];
const identity={recordId:'00000000-0000-4000-8000-000000000001',revisionId:'00000000-0000-4000-8000-000000000002',type:'page' as const};
/** Local review artifact only. This function has no apply/publish operation or authority. */
export function planAboutMigration(currentHashes:unknown,mediaBindings:unknown=[]){
 const proof=proofSchema.parse(currentHashes),bindings=bindingSchema.parse(mediaBindings);
 if(proof.length!==aboutMigrationDependencies.length||new Set(proof.map(item=>item.sourcePath)).size!==proof.length||aboutMigrationDependencies.some(source=>!proof.some(item=>item.sourcePath===source.sourcePath&&item.sha256===source.sha256)))throw Error('About source or image bytes changed. Recapture and review before migration.');
 if(new Set(bindings.map(binding=>binding.sourcePath)).size!==bindings.length||new Set(bindings.map(binding=>binding.assetId)).size!==bindings.length)throw Error('Use one distinct processed asset mapping per source image.');
 for(const binding of bindings)if(!inventory.media.some(media=>media.sourcePath===binding.sourcePath&&media.sha256===binding.sourceSha256)||binding.assetId.startsWith('review-only-'))throw Error('Unknown/stale source image or review placeholder in asset mappings.');
 const missingMedia=inventory.media.filter(media=>!bindings.some(binding=>binding.sourcePath===media.sourcePath));
 const image=(source:{sourcePath:string;alt:string|null},credit?:string)=>{
  if(!source.alt?.trim())throw Error('Source image needs alternative text review.');
  const index=inventory.media.findIndex(media=>media.sourcePath===source.sourcePath);if(index<0)throw Error('Uncaptured source image.');
  return {assetId:bindings.find(binding=>binding.sourcePath===source.sourcePath)?.assetId??`review-only-about-${index+1}`,alt:source.alt,decorative:false,...(credit?{credit}:{})};
 };
 const heading=(source:{text:string;parts:{text:string;emphasis:boolean}[]})=>{
  if(source.parts.map(part=>part.text).join('').replace(/\s+/g,' ').trim()!==source.text)throw Error('Heading fragments do not match source text.');
  const emphasized=source.parts.filter(part=>part.emphasis);if(emphasized.length>1)throw Error('Multiple heading emphases need explicit migration support.');
  return {title:source.text,...(emphasized.length?{titleAccent:emphasized[0].text}:{})};
 };
 const focal=(position:string)=>{const parsed=/^(\d+(?:\.\d+)?)% (\d+(?:\.\d+)?)%$/.exec(position);if(!parsed)throw Error('Unsupported source focal point.');return {x:Number(parsed[1]),y:Number(parsed[2])};};
 const {hero,story,leadership,principles}=inventory.content;
 if([...leadership.profiles.map(profile=>profile.role),...principles.entries.map(entry=>entry.heading)].some(item=>item.parts.some(part=>part.emphasis)))throw Error('Profile/principle heading emphasis needs explicit migration support.');
 const controls=(label:string,background='paper')=>({label,background,animation:'reveal',width:'content',headingLevel:'h2'});
 const payload={composition:{schemaVersion:1,title:'About',sections:[
  {id:'about-hero',kind:'hero',controls:{...controls('About hero','ink'),headingLevel:'h1',width:'full'},data:{layout:'overlay',eyebrow:hero.eyebrow,...heading(hero.heading),copy:hero.copy,desktop:image(hero.image,hero.credit),desktopFraming:{shape:'natural',...focal(hero.image.objectPosition)},buttons:[]}},
  {id:'about-story',kind:'text',controls:controls('Our story'),data:{layout:'split',eyebrow:story.eyebrow,...heading(story.heading),body:[...story.paragraphs.map(text=>({kind:'paragraph',text})),...story.links.map(link=>({kind:'link',...link,style:'button'}))]}},
  {id:'about-leadership',kind:'cards',controls:controls('Founder and field leadership'),data:{layout:'leadership',eyebrow:leadership.eyebrow,...heading(leadership.heading),introduction:leadership.intro,columns:2,items:leadership.profiles.map((profile,index)=>({id:`about-profile-${index+1}`,eyebrow:profile.name,title:profile.role.text,copy:profile.paragraphs.join('\n\n'),image:image(profile.image),portrait:{shape:profile.image.sourcePath.endsWith('/trikansh-sharma.jpg')?'square':'tall',...focal(profile.image.objectPosition)}}))}},
  {id:'about-principles',kind:'cards',controls:controls('What guides us','forest'),data:{layout:'numbered',eyebrow:principles.eyebrow,...heading(principles.heading),introduction:principles.intro,columns:2,items:principles.entries.map((entry,index)=>{if(entry.number!==String(index+1).padStart(2,'0')||entry.links.length>1)throw Error('Principle numbering/links require review.');return {id:`about-principle-${index+1}`,eyebrow:entry.eyebrow,title:entry.heading.text,copy:entry.paragraphs.join('\n\n'),...(entry.links[0]?{link:{...entry.links[0],newWindow:false}}:{})};})}},
 ]},seo:{...newPageSeo(),title:'About',description:inventory.metadata.description}};
 const projected=projectAboutPage({...identity,payload},{locale:'en',now:new Date('2026-10-22T00:00:00Z')});
 return {schemaVersion:1,mode:'review-only' as const,path:'/about',readyToApply:false as const,sourceProof:proof,mediaBindings:bindings,missingMedia,findings:[
  ...(missingMedia.length?[{code:'media_unmapped',message:'Preview-only image IDs must be replaced with verified processed assets before draft application.'}]:[]),
  {code:'media_provider_unverified',message:'Asset mappings are proposals; availability, rights and processed bytes require backend verification.'},
  {code:'full_page_review',message:'Compare complete desktop/mobile layout and motion, including visible mobile hero credits, before applying.'},
  {code:'apply_workflow_pending',message:'About migration draft application and recovery are not connected. This artifact cannot publish content.'},
 ],previewPayload:{composition:{...payload.composition,sections:projected.sections},seo:projected.seo}};
}
