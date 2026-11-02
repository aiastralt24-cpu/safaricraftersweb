import {z} from 'zod';
import {validateComposition,sectionIsVisible,type Composition} from './composition.ts';
import {aviationSectionSchemas,aviationSectionKinds,type AviationSectionKind} from './private-aviation-content.ts';
import {pageSeoSchema,newPageSeo} from './page-seo.ts';
const envelope=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),type:z.literal('page'),payload:z.object({composition:z.unknown(),seo:pageSeoSchema.optional()}).strict()}).strict();
export type AviationPageSection={[K in AviationSectionKind]:{id:string;kind:K;controls:Composition['sections'][number]['controls'];data:z.infer<(typeof aviationSectionSchemas)[K]>}}[AviationSectionKind];
/** Structural projection only. Media, links and publication require separate trusted checks. */
export function projectPrivateAviationPage(input:unknown,context:{locale:string;now:Date}){
 if(context.locale!=='en'||!Number.isFinite(context.now.getTime()))throw Error('Aviation page context is unsupported.');
 const value=envelope.parse(input),parsed=validateComposition(value.payload.composition);
 if(!parsed.valid||!parsed.page)throw Error('Aviation page composition is invalid.');
 const configured=parsed.page.sections.filter(section=>section.controls.visible);
 for(const section of configured){if(!aviationSectionKinds.includes(section.kind as AviationSectionKind))throw Error(`Aviation section ${section.kind} is not connected.`);if(section.controls.regions.length)throw Error('Aviation region targeting is not connected.');}
 const boundaries=new Set([context.now.getTime()]);for(const section of configured)for(const stamp of [section.controls.visibleFrom,section.controls.visibleUntil])if(stamp&&Date.parse(stamp)>context.now.getTime())boundaries.add(Date.parse(stamp));
 for(const boundary of boundaries){
  const visible=configured.filter(section=>sectionIsVisible(section,{locale:'en',now:new Date(boundary)}));
  if(visible.filter(s=>s.kind==='aviationHero'&&s.controls.headingLevel==='h1').length!==1||visible.filter(s=>s.controls.headingLevel==='h1').length!==1)throw Error('Aviation needs one visible hero H1 throughout its schedule.');

 }
 const sections=configured.filter(section=>sectionIsVisible(section,context)).map(section=>({id:section.id,kind:section.kind,controls:section.controls,data:aviationSectionSchemas[section.kind as AviationSectionKind].parse(section.data)})) as AviationPageSection[];
 return {recordId:value.recordId,revisionId:value.revisionId,path:'/private-aviation' as const,locale:'en' as const,title:parsed.page.title,seo:value.payload.seo??newPageSeo(),sections};
}
