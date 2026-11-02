import {conceptNavigationSchema} from './concept-navigation.ts';
import {resolvedSeoMetadata} from './seo-metadata.ts';
import type {GlobalSettings} from './global-settings.ts';
import {z} from 'zod';
import {sectionDataSchemas,sectionIsVisible,validateComposition} from './composition.ts';
import {pageSeoSchema,newPageSeo} from './page-seo.ts';
import type {HomepagePublicSection} from './homepage-projection.ts';
// Keep the Concept rollout palette explicit; homepage additions must not enable it implicitly.
export const conceptSectionKinds=['homepageHero','homepageStory','homepageJourneyTypes','homepageJourneys','homepageDepartures','homepageCorporate','homepageAviation','homepagePartners','homepageGuestNotes','homepageConcierge','downloads'] as const;
type Kind=typeof conceptSectionKinds[number];
const envelope=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),type:z.literal('page'),payload:z.object({composition:z.unknown(),seo:pageSeoSchema.optional(),navigation:conceptNavigationSchema.optional()}).strict()}).strict();
/** Independent Concept page projection, not publication authorization. Referenced records still need
 * their eligible published projections; media IDs are never signed/public URLs. */
export function projectConceptPage(input:unknown,context:{locale:string;now:Date}){
 if(context.locale!=='en'||!Number.isFinite(context.now.getTime()))throw Error('Concept context is unsupported.');
 const value=envelope.parse(input),parsed=validateComposition(value.payload.composition);
 if(!parsed.valid||!parsed.page)throw Error('Concept composition is invalid.');
 const configured=parsed.page.sections.filter(section=>section.controls.visible);
 for(const section of configured){
  if(!conceptSectionKinds.includes(section.kind as Kind))throw Error(`Concept section ${section.kind} is not connected.`);
  if(section.controls.regions.length)throw Error('Concept region targeting is not connected.');
 }
 const boundaries=new Set([context.now.getTime()]);
 for(const section of configured)for(const time of [section.controls.visibleFrom,section.controls.visibleUntil])if(time&&Date.parse(time)>context.now.getTime())boundaries.add(Date.parse(time));
 for(const boundary of boundaries){
  const visible=configured.filter(section=>sectionIsVisible(section,{locale:'en',now:new Date(boundary)}));
  if(visible.filter(section=>section.kind==='homepageHero'&&section.controls.headingLevel==='h1').length!==1||visible.filter(section=>section.controls.headingLevel==='h1').length!==1)throw Error('Concept needs one visible hero H1 throughout its schedule.');
 }
 const sections=configured.filter(section=>sectionIsVisible(section,context)).map(section=>{
  const kind=section.kind as Kind;
  if(kind==='homepageStory'){
   const data=sectionDataSchemas.homepageStory.parse(section.data);
   return {id:section.id,kind,controls:section.controls,data:{...data,statistics:data.statistics.map(({source,...statistic})=>statistic)}};
  }
  return {id:section.id,kind,controls:section.controls,data:sectionDataSchemas[kind].parse(section.data)};
 }) as HomepagePublicSection[];
 return {recordId:value.recordId,revisionId:value.revisionId,path:'/concept' as const,locale:'en' as const,title:parsed.page.title,navigation:value.payload.navigation??null,seo:value.payload.seo??newPageSeo(),sections};
}

export function conceptPageMetadata(page:ReturnType<typeof projectConceptPage>,defaults:GlobalSettings['seo'],origin='https://safaricrafters.com'){
 return resolvedSeoMetadata(page.seo,defaults,{origin,path:page.path,title:page.title});
}
