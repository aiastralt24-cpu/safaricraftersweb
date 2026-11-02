import {validateComposition,sectionIsVisible} from './composition.ts';
import {guidedLinkSchema} from './guided-safaris-content.ts';
import {projectGuidedSafarisPage} from './guided-safaris-page.ts';
import {navigationUrlStatus} from './navigation-routes.ts';
import type {ContentFinding,ValidationRecord} from './content-validation.ts';
/** Same-site links require exact paths; external HTTPS validation asserts syntax,
 * not remote availability. Published paths must come from trusted site evidence. */
export function guidedLinkAvailable(href:string,anchors:ReadonlySet<string>,publishedPaths:ReadonlySet<string>){
 if(!guidedLinkSchema.safeParse({label:'Link',href,newWindow:false}).success)return false;
 if(href.startsWith('#'))return anchors.has(href.slice(1));
 let local=href;
 if(href.startsWith('https:')){
  const url=new URL(href),host=url.hostname.toLowerCase().replace(/\.$/,'');
  if(host!=='safaricrafters.com'&&!host.endsWith('.safaricrafters.com'))return true;
  if(!['safaricrafters.com','www.safaricrafters.com'].includes(host)||url.port)return false;
  local=url.pathname+url.search+url.hash;
  const originalPath=href.match(/^https:\/\/[^/?#]+(.*)$/i)?.[1]||'/';
  if(originalPath!==local)return false;
 }
 if(local==='/plan?guided=true')return true;
 if(local.includes('?')||local.includes('#'))return false;
 return navigationUrlStatus(local)==='available'||publishedPaths.has(local);
}
export function guidedPageFindings(record:ValidationRecord,now=new Date()):ContentFinding[]{
 const findings:ContentFinding[]=[],seen=new Set<string>();
 const error=(field:string,code:string,message:string)=>{const key=`${field}:${code}`;if(!seen.has(key)){seen.add(key);findings.push({field,code,message,severity:'error'});}};
 if(record.type!=='page'||record.path!=='/guided-bespoke-safaris'||(record.locale??'en')!=='en'){error('path','guided_identity','Bespoke publication requires an English page at /guided-bespoke-safaris.');return findings;}
 try{projectGuidedSafarisPage({recordId:'00000000-0000-4000-8000-000000000001',revisionId:'00000000-0000-4000-8000-000000000002',type:record.type,payload:record.payload},{locale:record.locale??'en',now});}
 catch(reason){error('composition','guided_structure',reason instanceof Error&&!('issues'in reason)?reason.message:'Complete the Bespoke composition and SEO fields.');}
 const parsed=validateComposition(record.payload.composition);if(!parsed.valid||!parsed.page||!Number.isFinite(now.getTime()))return findings;
 const sections=parsed.page.sections,times=new Set([now.getTime()]),published=new Set(record.guidedPublishedPaths??[]);
 for(const section of sections)if(section.controls.visible)for(const date of [section.controls.visibleFrom,section.controls.visibleUntil])if(date&&Date.parse(date)>now.getTime())times.add(Date.parse(date));
 for(const time of times){
  const visible=sections.filter(s=>sectionIsVisible(s,{locale:'en',now:new Date(time)})),anchors=new Set(['main',...visible.map(s=>s.controls.anchor).filter((anchor):anchor is string=>Boolean(anchor))]);
  const check=(href:string,field:string)=>{if(!guidedLinkAvailable(href,anchors,published))error(field,'guided_link_unverified','Choose a verified public destination or an anchor visible throughout this section’s schedule.');};
  for(const section of visible){
   const index=sections.findIndex(s=>s.id===section.id),field=`composition.sections.${index}.data`,data=section.data as Record<string,any>;
   if(section.kind==='guidedHero'){check(data.button.href,`${field}.button.href`);check(data.scrollCue.anchor,`${field}.scrollCue.anchor`);}
   if(section.kind==='guidedCompanion'&&data.button?.enabled)check(data.button.link.href,`${field}.button.link.href`);
   if(section.kind==='guidedPaths')data.items.forEach((item:{action:{href:string}},i:number)=>check(item.action.href,`${field}.items.${i}.action.href`));
  }
 }
 return findings;
}
