import {z} from 'zod';
import {sectionDataSchemas,sectionIsVisible,validateComposition} from './composition.ts';
import type {Composition} from './composition.ts';
import {newPageSeo,pageSeoSchema} from './page-seo.ts';
import {resolvedSeoMetadata} from './seo-metadata.ts';
import type {GlobalSettings} from './global-settings.ts';
import {readPublishedExpeditionDirectory,type ExpeditionDirectoryRead} from './public-expedition-directory.ts';

const envelope=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),type:z.literal('page'),payload:z.object({composition:z.unknown(),seo:pageSeoSchema.optional()}).strict()}).strict();
export type ExpeditionPageContext={locale:string;now:Date;region?:string};
type Controls=Composition['sections'][number]['controls'];
type PublicSection<K extends 'hero'|'text'|'cta'|'downloads'|'expeditionDirectory'>={id:string;kind:K;controls:Controls;data:z.infer<(typeof sectionDataSchemas)[K]>};
export type ExpeditionPageSection=PublicSection<'hero'>|PublicSection<'text'>|PublicSection<'cta'>|PublicSection<'downloads'>|PublicSection<'expeditionDirectory'>;
export const expeditionPageSectionKinds:readonly string[]=['hero','text','cta','downloads','expeditionDirectory'];

/** Projection of a published page, not authorization to publish a draft. */
export function projectExpeditionPage(input:unknown,context:ExpeditionPageContext){
 if(context.locale!=='en'||!Number.isFinite(context.now.getTime()))throw Error('Expedition page context is unsupported.');
 const value=envelope.parse(input),parsed=validateComposition(value.payload.composition);
 if(!parsed.valid||!parsed.page)throw Error('Expedition page composition is invalid.');
 const composition=parsed.page,sections:ExpeditionPageSection[]=[];
 const configured=composition.sections.filter(section=>section.controls.visible);
 if(configured.filter(section=>section.kind==='expeditionDirectory').length!==1)throw Error('Configure exactly one expedition directory.');
 for(const section of configured){
  // Check scheduled content too, so a future date cannot reveal an unsupported section.
  if(!expeditionPageSectionKinds.includes(section.kind))throw Error(`Expedition page section ${section.kind} is not connected yet.`);
  if(section.controls.animation!=='none')throw Error('Expedition page animation is not connected yet.');
  if(section.controls.regions.length)throw Error('Expedition page region targeting is not connected yet.');
  if(!sectionIsVisible(section,context))continue;
  const base={id:section.id,controls:section.controls};
  switch(section.kind){
   case 'downloads':sections.push({...base,kind:'downloads',data:sectionDataSchemas.downloads.parse(section.data)});break;
   case 'hero':sections.push({...base,kind:'hero',data:sectionDataSchemas.hero.parse(section.data)});break;
   case 'text':sections.push({...base,kind:'text',data:sectionDataSchemas.text.parse(section.data)});break;
   case 'cta':sections.push({...base,kind:'cta',data:sectionDataSchemas.cta.parse(section.data)});break;
   case 'expeditionDirectory':sections.push({...base,kind:'expeditionDirectory',data:sectionDataSchemas.expeditionDirectory.parse(section.data)});break;
  }
 }
 const headings=sections.filter(section=>section.controls.headingLevel==='h1'&&section.data.title?.trim());
 if(headings.length!==1)throw Error('Expedition page needs exactly one visible H1 heading.');
 return {recordId:value.recordId,revisionId:value.revisionId,path:'/photo-expeditions' as const,locale:'en' as const,title:composition.title,seo:value.payload.seo??newPageSeo(),sections};
}
export type PublishedExpeditionPage=ReturnType<typeof projectExpeditionPage>;
export type ExpeditionPageConfig={site:string;readPage:(site:string,path:string,locale:string)=>Promise<unknown>;readDirectory:ExpeditionDirectoryRead};
export async function readPublishedExpeditionPage(config:ExpeditionPageConfig|null,context:ExpeditionPageContext){
 if(!config||!z.string().uuid().safeParse(config.site).success)throw Error('Expedition page delivery is not configured.');
 if(context.locale!=='en'||!Number.isFinite(context.now.getTime()))throw Error('Expedition page context is unsupported.');
 const input=await config.readPage(config.site,'/photo-expeditions',context.locale);if(input===null)return null;
 const page=projectExpeditionPage(input,context);
 const expeditions=page.sections.some(section=>section.kind==='expeditionDirectory')?await readPublishedExpeditionDirectory(config.site,config.readDirectory):[];
 return {page,expeditions};
}
export function expeditionPageMetadata(page:PublishedExpeditionPage,defaults:GlobalSettings['seo'],origin='https://safaricrafters.com'){
 return resolvedSeoMetadata(page.seo,defaults,{origin,path:page.path,title:page.title});
}
