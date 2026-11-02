import {z} from 'zod';
import {validateComposition,sectionIsVisible,type Composition} from './composition.ts';
import {miceSectionKinds,miceSectionSchemas,type MiceSectionKind} from './mice-content.ts';
import {pageSeoSchema,newPageSeo} from './page-seo.ts';
const envelope=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),type:z.literal('page'),payload:z.object({composition:z.unknown(),seo:pageSeoSchema.optional()}).strict()}).strict();
export type MicePageSection={[K in MiceSectionKind]:{id:string;kind:K;controls:Composition['sections'][number]['controls'];data:z.infer<(typeof miceSectionSchemas)[K]>}}[MiceSectionKind];
/** Structural projection only. This does not authorize media, resolve a form,
 * grant publication, or read public content. */
export function projectMicePage(input:unknown,context:{locale:string;now:Date}){
 if(context.locale!=='en'||!Number.isFinite(context.now.getTime()))throw Error('MICE page context is unsupported.');
 const value=envelope.parse(input),parsed=validateComposition(value.payload.composition);
 if(!parsed.valid||!parsed.page)throw Error('MICE composition is invalid.');
 const configured=parsed.page.sections.filter(s=>s.controls.visible);
 for(const s of configured){
  if(!miceSectionKinds.includes(s.kind as MiceSectionKind))throw Error(`MICE section ${s.kind} is not connected.`);
  if(s.controls.regions.length||s.controls.animation!=='none')throw Error('MICE region targeting and animation are not connected.');
  if(s.kind==='miceEnquiry'&&!miceSectionSchemas.miceEnquiry.parse(s.data).form)throw Error('MICE enquiry requires an explicit form reference.');
 }
 const times=new Set([context.now.getTime()]);for(const s of configured)for(const stamp of [s.controls.visibleFrom,s.controls.visibleUntil])if(stamp&&Date.parse(stamp)>context.now.getTime())times.add(Date.parse(stamp));
 for(const time of times){
  const visible=configured.filter(s=>sectionIsVisible(s,{locale:'en',now:new Date(time)}));
  if(visible.filter(s=>s.kind==='miceHero'&&s.controls.headingLevel==='h1').length!==1||visible.filter(s=>s.controls.headingLevel==='h1').length!==1)throw Error('MICE requires exactly one hero H1 throughout its schedule.');
  if(visible.filter(s=>s.kind==='miceEnquiry').length!==1)throw Error('MICE requires one enquiry section throughout its schedule.');
  const anchors=new Set(visible.map(s=>s.controls.anchor).filter(Boolean));
  const check=(node:unknown):void=>{if(Array.isArray(node)){node.forEach(check);return;}if(!node||typeof node!=='object')return;for(const [key,v]of Object.entries(node)){if(key==='href'&&typeof v==='string'&&v.startsWith('#')&&!anchors.has(v.slice(1)))throw Error('MICE link target is unavailable during its schedule.');check(v);}};
  visible.forEach(s=>check(s.data));
 }
 const sections=configured.filter(s=>sectionIsVisible(s,context)).map(s=>({...s,data:miceSectionSchemas[s.kind as MiceSectionKind].parse(s.data)})) as MicePageSection[];
 const formIds=[...new Set(configured.filter(s=>s.kind==='miceEnquiry').map(s=>miceSectionSchemas.miceEnquiry.parse(s.data).form!.recordId))];
 return {recordId:value.recordId,revisionId:value.revisionId,path:'/mice' as const,locale:'en' as const,title:parsed.page.title,seo:value.payload.seo??newPageSeo(),sections,requiredFormIds:formIds};
}
