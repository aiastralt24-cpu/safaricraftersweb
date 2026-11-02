import {z} from 'zod';
import {sectionDataSchemas,sectionIsVisible,validateComposition} from './composition.ts';
import type {Composition} from './composition.ts';
import {newPageSeo,pageSeoSchema} from './page-seo.ts';
import {resolvedSeoMetadata} from './seo-metadata.ts';
import type {GlobalSettings} from './global-settings.ts';
import type {SpecialistDirectoryCursor} from './public-specialists.ts';
import {readPublishedSpecialists} from './public-specialists.ts';

const envelope=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),type:z.literal('page'),payload:z.object({composition:z.unknown(),seo:pageSeoSchema.optional()}).strict()}).strict();
export type SpecialistPageContext={locale:string;now:Date;region?:string};
type Controls=Composition['sections'][number]['controls'];
type PublicSection<K extends 'hero'|'text'|'cta'|'downloads'|'specialistDirectory'>={id:string;kind:K;controls:Controls;data:z.infer<(typeof sectionDataSchemas)[K]>};
export type SpecialistPageSection=PublicSection<'hero'>|PublicSection<'text'>|PublicSection<'cta'>|PublicSection<'downloads'>|PublicSection<'specialistDirectory'>;
export const specialistPageSectionKinds:readonly string[]=['hero','text','cta','downloads','specialistDirectory'];

/** Projection of a published page, not authorization to publish a draft. */
export function projectSpecialistPage(input:unknown,context:SpecialistPageContext){
 if(context.locale!=='en'||!Number.isFinite(context.now.getTime()))throw Error('Specialist page context is unsupported.');
 const value=envelope.parse(input),parsed=validateComposition(value.payload.composition);
 if(!parsed.valid||!parsed.page)throw Error('Specialist page composition is invalid.');
 const composition=parsed.page,sections:SpecialistPageSection[]=[];
 const configured=composition.sections.filter(section=>section.controls.visible);
 if(configured.filter(section=>section.kind==='specialistDirectory').length!==1)throw Error('Configure exactly one specialist directory.');
 for(const section of configured){
  // Check scheduled content too, so a future date cannot reveal an unsupported section.
  if(!specialistPageSectionKinds.includes(section.kind))throw Error(`Specialist page section ${section.kind} is not connected yet.`);
  if(section.controls.animation!=='none')throw Error('Specialist page animation is not connected yet.');
  if(section.controls.regions.length)throw Error('Specialist page region targeting is not connected yet.');
  if(!sectionIsVisible(section,context))continue;
  const base={id:section.id,controls:section.controls};
  switch(section.kind){
   case 'downloads':sections.push({...base,kind:'downloads',data:sectionDataSchemas.downloads.parse(section.data)});break;
   case 'hero':sections.push({...base,kind:'hero',data:sectionDataSchemas.hero.parse(section.data)});break;
   case 'text':sections.push({...base,kind:'text',data:sectionDataSchemas.text.parse(section.data)});break;
   case 'cta':sections.push({...base,kind:'cta',data:sectionDataSchemas.cta.parse(section.data)});break;
   case 'specialistDirectory':sections.push({...base,kind:'specialistDirectory',data:sectionDataSchemas.specialistDirectory.parse(section.data)});break;
  }
 }
 const headings=sections.filter(section=>section.controls.headingLevel==='h1'&&section.data.title?.trim());
 if(headings.length!==1)throw Error('Specialist page needs exactly one visible H1 heading.');
 return {recordId:value.recordId,revisionId:value.revisionId,path:'/specialists' as const,locale:'en' as const,title:composition.title,seo:value.payload.seo??newPageSeo(),sections};
}
export type PublishedSpecialistPage=ReturnType<typeof projectSpecialistPage>;
export type SpecialistPageConfig={site:string;readPage:(site:string,path:string,locale:string)=>Promise<unknown>;readDirectory:(site:string,locale:string,cursor:SpecialistDirectoryCursor|null)=>Promise<unknown>};
export async function readPublishedSpecialistPage(config:SpecialistPageConfig|null,context:SpecialistPageContext){
 if(!config||!z.string().uuid().safeParse(config.site).success)throw Error('Specialist page delivery is not configured.');
 if(context.locale!=='en'||!Number.isFinite(context.now.getTime()))throw Error('Specialist page context is unsupported.');
 const input=await config.readPage(config.site,'/specialists',context.locale);if(input===null)return null;
 const page=projectSpecialistPage(input,context);
 const profiles=page.sections.some(section=>section.kind==='specialistDirectory')?await readPublishedSpecialists(config.site,context.locale,config.readDirectory):[];
 return {page,profiles};
}
export function specialistPageMetadata(page:PublishedSpecialistPage,defaults:GlobalSettings['seo'],origin='https://safaricrafters.com'){
 return resolvedSeoMetadata(page.seo,defaults,{origin,path:page.path,title:page.title});
}
