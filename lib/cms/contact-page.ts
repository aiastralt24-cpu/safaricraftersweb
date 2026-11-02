import {z} from 'zod';
import {sectionDataSchemas,sectionIsVisible,validateComposition,type Composition} from './composition.ts';
import {contactSectionKinds,type ContactSectionKind} from './contact-content.ts';
import {newPageSeo,pageSeoSchema} from './page-seo.ts';
import {resolvedSeoMetadata} from './seo-metadata.ts';
import type {GlobalSettings} from './global-settings.ts';
const envelope=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),type:z.literal('page'),payload:z.object({composition:z.unknown(),seo:pageSeoSchema.optional()}).strict()}).strict();
export type ContactPageContext={locale:string;now:Date};
export type ContactPageSection={[K in ContactSectionKind]:{id:string;kind:K;controls:Composition['sections'][number]['controls'];data:z.infer<(typeof sectionDataSchemas)[K]>}}[ContactSectionKind];
function checkContext(context:ContactPageContext){if(context.locale!=='en'||!Number.isFinite(context.now.getTime()))throw Error('Contact page context is unsupported.');}
/** Structural projection only, not release authorization. Form IDs require
 * separate same-site published-revision resolution; media still needs rights checks. */
export function projectContactPage(input:unknown,context:ContactPageContext){
 checkContext(context);const value=envelope.parse(input),parsed=validateComposition(value.payload.composition);
 if(!parsed.valid||!parsed.page)throw Error('Contact page composition is invalid.');
 const configured=parsed.page.sections.filter(section=>section.controls.visible);
 for(const section of configured){
  if(!contactSectionKinds.includes(section.kind as ContactSectionKind))throw Error(`Contact section ${section.kind} is not connected.`);
  if(section.controls.regions.length)throw Error('Contact region targeting is not connected.');
  if(section.kind==='contactEnquiry'&&!sectionDataSchemas.contactEnquiry.parse(section.data).form)throw Error('Contact enquiry needs an explicit form reference.');
 }
 const times=new Set([context.now.getTime()]);
 for(const section of configured)for(const stamp of [section.controls.visibleFrom,section.controls.visibleUntil])if(stamp&&Date.parse(stamp)>context.now.getTime())times.add(Date.parse(stamp));
 for(const time of times){
  const visible=configured.filter(section=>sectionIsVisible(section,{locale:'en',now:new Date(time)}));
  if(visible.filter(s=>s.kind==='contactIntro').length!==1||visible.filter(s=>s.kind==='contactEnquiry').length!==1)throw Error('Contact page needs one introduction and one enquiry panel throughout its schedule.');
  if(visible.filter(s=>s.controls.headingLevel==='h1').length!==1||visible.find(s=>s.kind==='contactIntro')?.controls.headingLevel!=='h1')throw Error('Contact introduction must provide the only visible H1 throughout its schedule.');
 }
 const sections=configured.filter(section=>sectionIsVisible(section,context)).map(section=>({id:section.id,kind:section.kind,controls:section.controls,data:sectionDataSchemas[section.kind as ContactSectionKind].parse(section.data)})) as ContactPageSection[];
 const enquiry=sections.find(section=>section.kind==='contactEnquiry')!;
 if(enquiry.kind!=='contactEnquiry'||!enquiry.data.form)throw Error('Contact form reference unavailable.');
 const requiredFormIds=[...new Set(configured.filter(section=>section.kind==='contactEnquiry').map(section=>sectionDataSchemas.contactEnquiry.parse(section.data).form!.recordId))];
 return {recordId:value.recordId,revisionId:value.revisionId,path:'/contact' as const,locale:'en' as const,title:parsed.page.title,seo:value.payload.seo??newPageSeo(),sections,formId:enquiry.data.form.recordId,requiredFormIds};
}
export type PublishedContactPage=ReturnType<typeof projectContactPage>;
export type ContactPageConfig={site:string;readPage:(site:string,path:string,locale:string)=>Promise<unknown>};
/** Reads the published-page source only. This does not resolve the form or make
 * the returned page safe to serve; the public runtime must supply those gates. */
export async function readPublishedContactPage(config:ContactPageConfig|null,context:ContactPageContext){
 checkContext(context);if(!config||!z.string().uuid().safeParse(config.site).success)throw Error('Contact delivery is not configured.');
 const input=await config.readPage(config.site,'/contact','en');return input===null?null:projectContactPage(input,context);
}
export function contactPageMetadata(page:PublishedContactPage,defaults:GlobalSettings['seo'],origin='https://safaricrafters.com'){
 return resolvedSeoMetadata(page.seo,defaults,{origin,path:page.path,title:page.title});
}
