import {tanzaniaLayoutSupported} from './tanzania-layout.ts';
import {z} from 'zod';
import {validateComposition,sectionIsVisible,type Composition} from './composition.ts';
import {tanzaniaSectionKinds,tanzaniaSectionSchemas,type TanzaniaSectionKind} from './tanzania-country-sections.ts';
import {pageSeoSchema,newPageSeo} from './page-seo.ts';
const envelope=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),type:z.literal('page'),payload:z.object({composition:z.unknown(),seo:pageSeoSchema.optional()}).strict()}).strict();
export type TanzaniaPageSection={[K in TanzaniaSectionKind]:{id:string;kind:K;controls:Composition['sections'][number]['controls'];data:z.infer<(typeof tanzaniaSectionSchemas)[K]>}}[TanzaniaSectionKind];
/** Structural projection only. This does not authorize media,
 * grant publication, or read public content. */
export function projectTanzaniaPage(input:unknown,context:{locale:string;now:Date}){
 if(context.locale!=='en'||!Number.isFinite(context.now.getTime()))throw Error('Tanzania page context is unsupported.');
 const value=envelope.parse(input),parsed=validateComposition(value.payload.composition);
 if(!parsed.valid||!parsed.page)throw Error('Tanzania composition is invalid.');
 const configured=parsed.page.sections.filter(s=>s.controls.visible);
 for(const s of configured){
  if(!tanzaniaSectionKinds.includes(s.kind as TanzaniaSectionKind))throw Error(`Tanzania section ${s.kind} is not connected.`);
  if(s.controls.regions.length)throw Error('Tanzania region targeting is not connected.');
  if(!['none','fade','reveal'].includes(s.controls.animation)||!tanzaniaLayoutSupported(s.kind,s.controls))throw Error('Background is image-led on the hero; image ordering applies only to Tanzania places.');
 }
 const times=new Set([context.now.getTime()]);for(const s of configured)for(const stamp of [s.controls.visibleFrom,s.controls.visibleUntil])if(stamp&&Date.parse(stamp)>context.now.getTime())times.add(Date.parse(stamp));
 for(const time of times){
  const visible=configured.filter(s=>sectionIsVisible(s,{locale:'en',now:new Date(time)}));
  if(visible.filter(s=>s.kind==='tanzaniaHero'&&s.controls.headingLevel==='h1').length!==1||visible.filter(s=>s.controls.headingLevel==='h1').length!==1)throw Error('Tanzania requires exactly one hero H1 throughout its schedule.');
  const anchors=new Set(visible.map(s=>s.controls.anchor).filter(Boolean));
  const check=(node:unknown):void=>{if(Array.isArray(node)){node.forEach(check);return;}if(!node||typeof node!=='object')return;for(const [key,v]of Object.entries(node)){if(key==='href'&&typeof v==='string'&&v.startsWith('#')&&!anchors.has(v.slice(1)))throw Error('Tanzania link target is unavailable during its schedule.');check(v);}};
  visible.forEach(s=>check(s.data));
 }
 const sections=configured.filter(s=>sectionIsVisible(s,context)).map(s=>({...s,data:tanzaniaSectionSchemas[s.kind as TanzaniaSectionKind].parse(s.data)})) as TanzaniaPageSection[];
 return {recordId:value.recordId,revisionId:value.revisionId,path:'/destinations/tanzania' as const,locale:'en' as const,title:parsed.page.title,seo:value.payload.seo??newPageSeo(),sections};
}
