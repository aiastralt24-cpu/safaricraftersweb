import {sectionDataSchemas,sectionIsVisible,validateComposition} from './composition.ts';
import {navigationUrlStatus} from './navigation-routes.ts';
import {emailHref} from './inline-text.ts';
import type {ContentFinding,ValidationRecord} from './content-validation.ts';
/** Check every future visibility boundary. Paths are trusted same-site published evidence. */
export function conceptEditorialFindings(record:ValidationRecord,publishedPaths:readonly string[]=[],now=new Date()):ContentFinding[]{
 const findings:ContentFinding[]=[],seen=new Set<string>();
 const error=(field:string,code:string,message:string)=>{const key=`${field}:${code}`;if(!seen.has(key)){seen.add(key);findings.push({field,code,message,severity:'error'});}};
 if(record.type!=='page'||record.path!=='/concept'||(record.locale??'en')!=='en'){error('path','concept_identity','Concept publication requires an English page at /concept.');return findings;}
 const parsed=validateComposition(record.payload.composition);if(!parsed.valid||!parsed.page)return findings;
 const sections=parsed.page.sections,paths=new Set(publishedPaths),times=new Set([now.getTime()]);
 for(const section of sections)if(section.controls.visible)for(const time of [section.controls.visibleFrom,section.controls.visibleUntil])if(time&&Date.parse(time)>now.getTime())times.add(Date.parse(time));
 for(const time of times){
  const visible=sections.filter(section=>sectionIsVisible(section,{locale:'en',now:new Date(time)}));
  const anchors=new Set(['main',...visible.map(section=>section.controls.anchor).filter(Boolean)]);
  function visit(value:unknown,field:string){
   if(Array.isArray(value)){value.forEach((item,index)=>visit(item,`${field}.${index}`));return;}if(!value||typeof value!=='object')return;
   for(const [key,item]of Object.entries(value)){
    if(key==='href'&&typeof item==='string'){
     const valid=item.startsWith('#')?anchors.has(item.slice(1)):emailHref.safeParse(item).success||navigationUrlStatus(item)==='available'||paths.has(item);
     if(!valid)error(`${field}.${key}`,'concept_link_unverified','Choose a verified public destination or an anchor visible throughout this section’s schedule.');
    }else visit(item,`${field}.${key}`);
   }
  }
  for(const section of visible){
   const index=sections.findIndex(item=>item.id===section.id),field=`composition.sections.${index}.data`;visit(section.data,field);
   if(section.kind==='homepageStory')sectionDataSchemas.homepageStory.parse(section.data).statistics.forEach((statistic,statIndex)=>{if(!statistic.source.trim())error(`${field}.statistics.${statIndex}.source`,'statistic_source_required','Record supporting evidence for this statistic before publication. This evidence stays private.');});
  }
 }
 return findings;
}
