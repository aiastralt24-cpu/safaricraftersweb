import {resolvedSeoMetadata} from './seo-metadata.ts';
import type {GlobalSettings} from './global-settings.ts';
import {z} from 'zod';
import {sectionDataSchemas,sectionIsVisible,validateComposition} from './composition.ts';
import type {Composition} from './composition.ts';
import {pageSeoSchema,newPageSeo} from './page-seo.ts';
export const homepageSectionKinds=['homepageHero','homepageStory','homepageJourneyTypes','homepageJourneys','homepageDepartures','homepageCorporate','homepageAviation','homepagePartners','homepageGuestNotes','homepageConcierge','downloads'] as const;
type Kind=typeof homepageSectionKinds[number];
type Data<K extends Kind>=z.infer<(typeof sectionDataSchemas)[K]>;
type PublicData<K extends Kind>=K extends 'homepageStory'?Omit<Data<'homepageStory'>,'statistics'>&{statistics:Omit<Data<'homepageStory'>['statistics'][number],'source'>[]}:Data<K>;
export type HomepagePublicSection={[K in Kind]:{id:string;kind:K;controls:Composition['sections'][number]['controls'];data:PublicData<K>}}[Kind];
const envelope=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),type:z.literal('homepage'),payload:z.object({composition:z.unknown(),seo:pageSeoSchema.optional()}).strict()}).strict();
/** Pure projection, not publication authorization. Referenced records still need
 * their eligible published projections; media IDs are never signed/public URLs. */
export function projectHomepageSections(input:unknown,context:{locale:string;now:Date}){
 if(context.locale!=='en'||!Number.isFinite(context.now.getTime()))throw Error('Homepage context is unsupported.');
 const value=envelope.parse(input),parsed=validateComposition(value.payload.composition);
 if(!parsed.valid||!parsed.page)throw Error('Homepage composition is invalid.');
 const configured=parsed.page.sections.filter(section=>section.controls.visible);
 for(const section of configured){
  if(!homepageSectionKinds.includes(section.kind as Kind))throw Error(`Homepage section ${section.kind} is not connected.`);
  if(section.controls.regions.length)throw Error('Homepage region targeting is not connected.');
 }
 const boundaries=new Set([context.now.getTime()]);
 for(const section of configured)for(const time of [section.controls.visibleFrom,section.controls.visibleUntil])if(time&&Date.parse(time)>context.now.getTime())boundaries.add(Date.parse(time));
 for(const boundary of boundaries){
  const visible=configured.filter(section=>sectionIsVisible(section,{locale:'en',now:new Date(boundary)}));
  if(visible.filter(section=>section.kind==='homepageHero'&&section.controls.headingLevel==='h1').length!==1||visible.filter(section=>section.controls.headingLevel==='h1').length!==1)throw Error('Homepage needs one visible hero H1 throughout its schedule.');
 }
 const sections=configured.filter(section=>sectionIsVisible(section,context)).map(section=>{
  const kind=section.kind as Kind;
  if(kind==='homepageStory'){
   const data=sectionDataSchemas.homepageStory.parse(section.data);
   return {id:section.id,kind,controls:section.controls,data:{...data,statistics:data.statistics.map(({source,...statistic})=>statistic)}};
  }
  return {id:section.id,kind,controls:section.controls,data:sectionDataSchemas[kind].parse(section.data)};
 }) as HomepagePublicSection[];
 return {recordId:value.recordId,revisionId:value.revisionId,path:'/' as const,locale:'en' as const,title:parsed.page.title,seo:value.payload.seo??newPageSeo(),sections};
}

export function homepageMetadata(page:ReturnType<typeof projectHomepageSections>,defaults:GlobalSettings['seo'],origin='https://safaricrafters.com'){
 return resolvedSeoMetadata(page.seo,defaults,{origin,path:page.path,title:page.title});
}
