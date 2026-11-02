import {z} from 'zod';
import {sectionDataSchemas,sectionIsVisible,validateComposition,type Composition} from './composition.ts';
import {conservationSectionKinds,type ConservationSectionKind} from './conservation-content.ts';
import {newPageSeo,pageSeoSchema} from './page-seo.ts';
import {resolvedSeoMetadata} from './seo-metadata.ts';
import type {GlobalSettings} from './global-settings.ts';

const envelope=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),type:z.literal('page'),payload:z.object({composition:z.unknown(),seo:pageSeoSchema.optional()}).strict()}).strict();
export type ConservationPageContext={locale:string;now:Date};
export type ConservationPageSection={[K in ConservationSectionKind]:{id:string;kind:K;controls:Composition['sections'][number]['controls'];data:z.infer<(typeof sectionDataSchemas)[K]>}}[ConservationSectionKind];
function checkContext(context:ConservationPageContext){
 if(context.locale!=='en'||!Number.isFinite(context.now.getTime()))throw Error('Conservation page context is unsupported.');
}
/** Shared content projection only. This does not authorize publication or establish image rights. */
export function projectConservationPage(input:unknown,context:ConservationPageContext){
 checkContext(context);
 const value=envelope.parse(input),parsed=validateComposition(value.payload.composition);
 if(!parsed.valid||!parsed.page)throw Error('Conservation page composition is invalid.');
 const configured=parsed.page.sections.filter(section=>section.controls.visible);
 for(const section of configured){
  if(!conservationSectionKinds.includes(section.kind as ConservationSectionKind))throw Error(`Conservation section ${section.kind} is not connected.`);
  if(section.controls.regions.length)throw Error('Conservation region targeting is not connected.');
 }
 // A scheduled change must never remove the page's only top-level heading.
 const times=new Set([context.now.getTime()]);
 for(const section of configured)for(const stamp of [section.controls.visibleFrom,section.controls.visibleUntil])if(stamp&&Date.parse(stamp)>context.now.getTime())times.add(Date.parse(stamp));
 for(const time of times){
  const visible=configured.filter(section=>sectionIsVisible(section,{locale:'en',now:new Date(time)}));
  if(visible.filter(section=>section.controls.headingLevel==='h1').length!==1)throw Error('Conservation page needs one visible H1 throughout its schedule.');
 }
 const sections=configured.filter(section=>sectionIsVisible(section,context)).map(section=>({id:section.id,kind:section.kind,controls:section.controls,data:sectionDataSchemas[section.kind as ConservationSectionKind].parse(section.data)})) as ConservationPageSection[];
 return {recordId:value.recordId,revisionId:value.revisionId,path:'/conservation-commitment' as const,locale:'en' as const,title:parsed.page.title,seo:value.payload.seo??newPageSeo(),sections};
}
export type PublishedConservationPage=ReturnType<typeof projectConservationPage>;
export type ConservationPageConfig={site:string;readPage:(site:string,path:string,locale:string)=>Promise<unknown>};
export async function readPublishedConservationPage(config:ConservationPageConfig|null,context:ConservationPageContext){
 checkContext(context);
 if(!config||!z.string().uuid().safeParse(config.site).success)throw Error('Conservation delivery is not configured.');
 const input=await config.readPage(config.site,'/conservation-commitment','en');
 return input===null?null:projectConservationPage(input,context);
}
export function conservationPageMetadata(page:PublishedConservationPage,defaults:GlobalSettings['seo'],origin='https://safaricrafters.com'){
 return resolvedSeoMetadata(page.seo,defaults,{origin,path:page.path,title:page.title});
}
