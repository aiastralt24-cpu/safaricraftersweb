import {navigationLinkForLocale,type LocalizedRouteResolver} from './localized-navigation-link.ts';
import {z} from 'zod';
import {navigationUrlStatus,publicNavigationHosts} from './navigation-routes.ts';
import {emailHref} from './inline-text.ts';
import {sectionDataSchemas,sectionIsVisible,validateComposition} from './composition.ts';
import type {Composition} from './composition.ts';
import {newPageSeo,pageSeoSchema} from './page-seo.ts';
import {resolvedSeoMetadata} from './seo-metadata.ts';
import type {GlobalSettings} from './global-settings.ts';
export const aboutSectionKinds=['hero','text','imageText','cards','cta','downloads','reusableFaq','reusableLeadership'] as const;
type Kind=typeof aboutSectionKinds[number];
export type AboutSection={[K in Kind]:{id:string;kind:K;controls:Composition['sections'][number]['controls'];data:z.infer<(typeof sectionDataSchemas)[K]>}}[Kind];
const envelope=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),type:z.literal('page'),payload:z.object({composition:z.unknown(),seo:pageSeoSchema.optional()}).strict()}).strict();
function links(value:unknown):string[]{
 if(Array.isArray(value))return value.flatMap(links);if(!value||typeof value!=='object')return [];
 return Object.entries(value).flatMap(([key,item])=>key==='href'&&typeof item==='string'?[item]:links(item));
}
function checkText(value:unknown):void{
 if(Array.isArray(value)){value.forEach(checkText);return;}if(!value||typeof value!=='object')return;
 for(const [key,item]of Object.entries(value)){if(['title','label','copy'].includes(key)&&typeof item==='string'&&!item.trim())throw Error('Complete visible headings, labels and copy before publication.');checkText(item);}
 if('href' in value&&'text' in value&&typeof value.text==='string'&&!value.text.trim())throw Error('Inline links need visible text.');
}
export function projectEditorialPage(input:unknown,context:{locale:string;now:Date;allowReusableFaq?:boolean;allowReusableLeadership?:boolean;resolveLocalizedRoute?:LocalizedRouteResolver;documents?:{recordId:string;versionId:string;locale:string;available:boolean}[]}){
 if(!/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(context.locale)||!Number.isFinite(context.now.getTime()))throw Error('About page context is unsupported.');
 if(context.locale!=='en'&&!context.resolveLocalizedRoute)throw Error('Localized editorial pages require verified route resolution.');
 const value=envelope.parse(input),parsed=validateComposition(value.payload.composition);
 if(!parsed.valid||!parsed.page)throw Error('About page composition is invalid.');
 const configured=parsed.page.sections.filter(section=>section.controls.visible);
 for(const section of configured){if(section.kind==='reusableLeadership'&&(!context.allowReusableLeadership||context.locale!=='en'||section.controls.headingLevel==='h1'))throw Error('Reusable leadership requires an enabled English page and a heading below H1.');if(section.kind==='reusableFaq'&&(!context.allowReusableFaq||context.locale!=='en'||section.controls.headingLevel==='h1'))throw Error('Reusable FAQs are connected only for English custom pages.');checkText(section.data);if(section.kind==='cards'&&sectionDataSchemas.cards.parse(section.data).items.length===0)throw Error('Add cards or hide the empty card section.');if(!aboutSectionKinds.includes(section.kind as Kind))throw Error(`About page section ${section.kind} is not connected.`);if(section.controls.regions.length)throw Error('About page region targeting is not connected.');}
 if(context.allowReusableFaq&&new Set(configured.flatMap(section=>section.kind==='reusableFaq'?sectionDataSchemas.reusableFaq.parse(section.data).records.map(r=>r.recordId.toLowerCase()):[])).size>50)throw Error('Use at most 50 distinct reusable FAQs per page.');
 if(context.allowReusableLeadership&&new Set(configured.flatMap(section=>section.kind==='reusableLeadership'?sectionDataSchemas.reusableLeadership.parse(section.data).records.map(r=>r.recordId.toLowerCase()):[])).size>30)throw Error('Use at most 30 distinct leadership profiles per page.');
 const times=new Set([context.now.getTime()]);for(const section of configured)for(const stamp of [section.controls.visibleFrom,section.controls.visibleUntil])if(stamp&&Date.parse(stamp)>context.now.getTime())times.add(Date.parse(stamp));
 for(const time of times){
 const visible=configured.filter(section=>sectionIsVisible(section,{locale:context.locale,now:new Date(time)})),anchors=new Set(['main',...visible.map(section=>section.controls.anchor).filter(Boolean)]);
 for(const section of visible)for(const href of links(section.data)){
  if(href.startsWith('#')){if(!anchors.has(href.slice(1)))throw Error('Use verified public links or local anchors visible throughout the section schedule.');}
  else if(!emailHref.safeParse(href).success){
   if(context.locale==='en'){if(navigationUrlStatus(href)!=='available')throw Error('Use verified public links or local anchors visible throughout the section schedule.');}
   else{const owned=!href.startsWith('/')&&(publicNavigationHosts as readonly string[]).includes(new URL(href).hostname.toLowerCase().replace(/\.$/,''));if(!href.startsWith('/')&&!owned&&navigationUrlStatus(href)!=='available')throw Error('Use verified public links.');navigationLinkForLocale(href,context.locale,context.resolveLocalizedRoute);}
  }
 }
 for(const section of visible)if(context.locale!=='en'&&section.kind==='downloads')for(const item of sectionDataSchemas.downloads.parse(section.data).items){
  const matches=context.documents?.filter(doc=>doc.recordId.toLowerCase()===item.document.recordId.toLowerCase()&&doc.versionId.toLowerCase()===item.versionId.toLowerCase());
  if(matches?.length!==1||!matches[0].available||matches[0].locale!==context.locale)throw Error('Localized document references require exact language and version evidence.');
 }
 const headings=configured.filter(section=>section.controls.headingLevel==='h1'&&sectionIsVisible(section,{locale:context.locale,now:new Date(time)})&&String((section.data as {title?:string}).title??'').trim());if(headings.length!==1)throw Error('About page needs one visible H1 throughout its schedule.');}
 let sections=configured.filter(section=>sectionIsVisible(section,context)).map(section=>({id:section.id,kind:section.kind,controls:section.controls,data:sectionDataSchemas[section.kind as Kind].parse(section.data)})) as AboutSection[];
 if(context.locale!=='en'){
  const localize=(node:unknown):unknown=>Array.isArray(node)?node.map(localize):node&&typeof node==='object'?Object.fromEntries(Object.entries(node).map(([key,child])=>[key,key==='href'&&typeof child==='string'&&!emailHref.safeParse(child).success?navigationLinkForLocale(child,context.locale,context.resolveLocalizedRoute):localize(child)])):node;
  sections=localize(sections) as AboutSection[];
 }
 return {recordId:value.recordId,revisionId:value.revisionId,path:'/about' as const,locale:context.locale,title:parsed.page.title,seo:value.payload.seo??newPageSeo(),sections};
}
export function projectAboutPage(input:unknown,context:{locale:string;now:Date}){
 if(context.locale!=='en')throw Error('About page context is unsupported.');
 return {...projectEditorialPage(input,{...context,allowReusableLeadership:true}),locale:'en' as const};
}
export type PublishedAboutPage=ReturnType<typeof projectAboutPage>;
export function aboutPageMetadata(page:PublishedAboutPage,defaults:GlobalSettings['seo'],origin='https://safaricrafters.com'){return resolvedSeoMetadata(page.seo,defaults,{origin,path:page.path,title:page.title});}
