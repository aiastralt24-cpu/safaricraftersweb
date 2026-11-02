import {z} from 'zod';
import {emailHref} from './inline-text.ts';
import {navigationUrlStatus} from './navigation-routes.ts';
import {sectionIsVisible,validateComposition,sectionDataSchemas} from './composition.ts';
import type {Composition} from './composition.ts';
import {newPageSeo,pageSeoSchema} from './page-seo.ts';
import {resolvedSeoMetadata} from './seo-metadata.ts';
import type {GlobalSettings} from './global-settings.ts';
export const legalPaths=['/legal/privacy','/legal/terms','/legal/cookies'] as const;
export const legalPathSchema=z.enum(legalPaths);
export type LegalPath=z.infer<typeof legalPathSchema>;
const envelope=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),type:z.literal('page'),payload:z.object({composition:z.unknown(),seo:pageSeoSchema.optional()}).strict()}).strict();
type LegalSection={[K in 'text'|'downloads']:{id:string;kind:K;controls:Composition['sections'][number]['controls'];data:z.infer<(typeof sectionDataSchemas)[K]>}}['text'|'downloads'];
export function projectLegalPage(input:unknown,path:LegalPath,context:{locale:string;now:Date}){
 legalPathSchema.parse(path);
 if(context.locale!=='en'||!Number.isFinite(context.now.getTime()))throw Error('Legal page context is unsupported.');
 const value=envelope.parse(input),parsed=validateComposition(value.payload.composition);
 if(!parsed.valid||!parsed.page)throw Error('Legal page composition is invalid.');
 const configured=parsed.page.sections.filter(section=>section.controls.visible);
 for(const section of configured){
  if(section.kind!=='text'&&section.kind!=='downloads')throw Error('Legal pages currently require text sections or document downloads.');
  if(section.controls.animation!=='none'||section.controls.regions.length)throw Error('Legal page animation and region targeting are not connected.');
  if(section.kind==='downloads'){const data=sectionDataSchemas.downloads.parse(section.data);if(!data.title.trim()||data.items.some(item=>!item.label.trim()))throw Error('Complete each document download heading and label.');continue;}
  const data=sectionDataSchemas.text.parse(section.data);
  if((!data.body.length&&!data.title?.trim())||data.body.some(block=>block.kind==='paragraph'||block.kind==='quote'?!block.text.trim():block.kind==='link'?!block.label.trim():block.kind==='table'?!block.caption.trim():block.items.some(item=>!item.trim())))throw Error('Complete each visible legal text section.');
 }
 const times=new Set([context.now.getTime()]);
 for(const section of configured)for(const stamp of [section.controls.visibleFrom,section.controls.visibleUntil])if(stamp&&Date.parse(stamp)>context.now.getTime())times.add(Date.parse(stamp));
 for(const time of times){
  const visible=configured.filter(section=>sectionIsVisible(section,{locale:'en',now:new Date(time)}));
  const anchors=new Set(['main',...visible.map(section=>section.controls.anchor).filter(Boolean)]);
  for(const section of visible.filter(section=>section.kind==='text'))for(const block of sectionDataSchemas.text.parse(section.data).body)for(const href of block.kind==='link'?[block.href]:block.kind==='paragraph'?(block.spans??[]).flatMap(span=>span.href?[span.href]:[]):[])if(href.startsWith('#')?!anchors.has(href.slice(1)):!emailHref.safeParse(href).success&&navigationUrlStatus(href)!=='available')throw Error('Use a verified public link or an anchor visible throughout this section’s schedule.');
  const headings=configured.filter(section=>sectionIsVisible(section,{locale:'en',now:new Date(time)})&&section.controls.headingLevel==='h1'&&String((section.data as {title?:string}).title??'').trim());
  if(headings.length!==1)throw Error('Legal pages need exactly one visible H1 throughout their schedule.');
 }
 const sections:LegalSection[]=configured.filter(section=>sectionIsVisible(section,context)).map(section=>section.kind==='downloads'?{id:section.id,kind:'downloads',controls:section.controls,data:sectionDataSchemas.downloads.parse(section.data)}:{id:section.id,kind:'text',controls:section.controls,data:sectionDataSchemas.text.parse(section.data)});
 return {recordId:value.recordId,revisionId:value.revisionId,path,locale:'en' as const,title:parsed.page.title,seo:value.payload.seo??newPageSeo(),sections};
}
export type PublishedLegalPage=ReturnType<typeof projectLegalPage>;
export function legalPageMetadata(page:PublishedLegalPage,defaults:GlobalSettings['seo'],origin='https://safaricrafters.com'){return resolvedSeoMetadata(page.seo,defaults,{origin,path:page.path,title:page.title});}
