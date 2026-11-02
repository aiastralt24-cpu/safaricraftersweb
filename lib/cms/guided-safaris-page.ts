import {z} from 'zod';
import {validateComposition,sectionIsVisible,type Composition} from './composition.ts';
import {guidedSectionSchemas,guidedSectionKinds,type GuidedSectionKind} from './guided-safaris-content.ts';
import {pageSeoSchema,newPageSeo} from './page-seo.ts';
const envelope=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),type:z.literal('page'),payload:z.object({composition:z.unknown(),seo:pageSeoSchema.optional()}).strict()}).strict();
export type GuidedPageSection={[K in GuidedSectionKind]:{id:string;kind:K;controls:Composition['sections'][number]['controls'];data:z.infer<(typeof guidedSectionSchemas)[K]>}}[GuidedSectionKind];
/** Structural projection only. Media, links and publication require separate trusted checks. */
export function projectGuidedSafarisPage(input:unknown,context:{locale:string;now:Date}){
 if(context.locale!=='en'||!Number.isFinite(context.now.getTime()))throw Error('Bespoke page context is unsupported.');
 const value=envelope.parse(input),parsed=validateComposition(value.payload.composition);
 if(!parsed.valid||!parsed.page)throw Error('Bespoke page composition is invalid.');
 const configured=parsed.page.sections.filter(section=>section.controls.visible);
 for(const section of configured){if(!guidedSectionKinds.includes(section.kind as GuidedSectionKind))throw Error(`Bespoke section ${section.kind} is not connected.`);if(section.controls.regions.length)throw Error('Bespoke region targeting is not connected.');}
 const boundaries=new Set([context.now.getTime()]);for(const section of configured)for(const stamp of [section.controls.visibleFrom,section.controls.visibleUntil])if(stamp&&Date.parse(stamp)>context.now.getTime())boundaries.add(Date.parse(stamp));
 for(const boundary of boundaries){
  const visible=configured.filter(section=>sectionIsVisible(section,{locale:'en',now:new Date(boundary)}));
  if(visible.filter(s=>s.kind==='guidedHero'&&s.controls.headingLevel==='h1').length!==1||visible.filter(s=>s.controls.headingLevel==='h1').length!==1)throw Error('Bespoke needs one visible hero H1 throughout its schedule.');
  const anchors=new Set(['main',...visible.map(s=>s.controls.anchor).filter(Boolean)]);
  for(const section of visible)if(section.kind==='guidedHero'){const hero=guidedSectionSchemas.guidedHero.parse(section.data);if(!anchors.has(hero.scrollCue.anchor.slice(1)))throw Error('The hero scroll cue needs a visible target throughout its schedule.');}
 }
 const sections=configured.filter(section=>sectionIsVisible(section,context)).map(section=>({id:section.id,kind:section.kind,controls:section.controls,data:guidedSectionSchemas[section.kind as GuidedSectionKind].parse(section.data)})) as GuidedPageSection[];
 return {recordId:value.recordId,revisionId:value.revisionId,path:'/guided-bespoke-safaris' as const,locale:'en' as const,title:parsed.page.title,seo:value.payload.seo??newPageSeo(),sections};
}
