import {sectionIsVisible,validateComposition} from './composition.ts';
import {specialistPageSectionKinds} from './specialist-page.ts';
import type {ContentFinding,ValidationRecord} from './content-validation.ts';

/** Specialist directory page checks run alongside generic composition, SEO and media validation. */
export function specialistPageFindings(record:ValidationRecord,now=new Date()):ContentFinding[]{
 const findings:ContentFinding[]=[];
 const error=(field:string,code:string,message:string)=>findings.push({field,code,message,severity:'error'});
 if(record.type!=='page'||record.path!=='/specialists')error('path','specialist_page_route','Use an ordinary page at /specialists for this directory.');
 if((record.locale??'en')!=='en')error('locale','specialist_page_locale','Specialist page delivery currently supports English only.');
 if(Object.keys(record.payload).some(key=>!['composition','seo'].includes(key)))error('payload','specialist_page_fields','The published Specialists page supports composition and SEO only. Preserve other data separately before migration.');
 const parsed=validateComposition(record.payload.composition);
 if(!parsed.page)return findings; // Generic composition checks report structural field errors.
 const sections=parsed.page.sections;
 if(sections.filter(section=>section.controls.visible&&section.kind==='specialistDirectory').length!==1)error('composition.sections','specialist_page_directory','Keep exactly one specialist directory section visible.');
 sections.forEach((section,index)=>{
  if(!section.controls.visible)return;
  const field=`composition.sections.${index}`;
  if(!specialistPageSectionKinds.includes(section.kind))error(`${field}.kind`,'specialist_page_section',`The Specialists page cannot render ${section.kind} yet. Hide this section until its renderer is connected.`);
  if(section.controls.animation!=='none')error(`${field}.controls.animation`,'specialist_page_animation','Choose no animation until specialist page animation delivery is connected.');
  if(section.controls.regions.length)error(`${field}.controls.regions`,'specialist_page_region','Region targeting is not connected for this page.');
 });
 if(!Number.isFinite(now.getTime())){error('composition.sections','specialist_page_time','The page check needs a valid server time.');return findings;}
 // Visibility changes only at these boundaries. Check now and every future interval start,
 // including exclusive end times; no arbitrary sampling window can miss a later gap.
 const times=new Set<number>([now.getTime()]);
 for(const section of sections)if(section.controls.visible)for(const timestamp of [section.controls.visibleFrom,section.controls.visibleUntil]){
  if(timestamp&&Date.parse(timestamp)>now.getTime())times.add(Date.parse(timestamp));
 }
 for(const time of [...times].sort((a,b)=>a-b)){
  const headings=sections.filter(section=>section.controls.headingLevel==='h1'&&sectionIsVisible(section,{locale:'en',now:new Date(time)})&&typeof (section.data as {title?:unknown}).title==='string'&&Boolean((section.data as {title:string}).title.trim()));
  if(headings.length!==1){error('composition.sections','specialist_page_heading_schedule',`At ${new Date(time).toISOString()}, this page has ${headings.length} visible H1 headings. Keep one nonblank page heading visible throughout the schedule.`);break;}
 }
 return findings;
}
