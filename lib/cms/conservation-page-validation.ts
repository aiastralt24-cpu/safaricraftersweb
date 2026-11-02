import {sectionIsVisible,validateComposition} from './composition.ts';
import {conservationSectionKinds,type ConservationSectionKind} from './conservation-content.ts';
import type {ContentFinding,ValidationRecord} from './content-validation.ts';
/** Advisory draft diagnostics. Trusted release authorization remains a separate gate. */
export function conservationPageFindings(record:ValidationRecord,now=new Date()):ContentFinding[]{
 const findings:ContentFinding[]=[];
 const error=(field:string,code:string,message:string)=>findings.push({field,code,message,severity:'error'});
 if(record.type!=='page'||record.path!=='/conservation-commitment')error('path','conservation_page_route','Use an ordinary page at /conservation-commitment.');
 if((record.locale??'en')!=='en')error('locale','conservation_page_locale','Conservation page delivery currently supports English only.');
 if(Object.keys(record.payload).some(key=>!['composition','seo'].includes(key)))error('payload','conservation_page_fields','Conservation delivery supports composition and SEO only. Preserve additional data before migration.');
 const parsed=validateComposition(record.payload.composition);
 if(!parsed.page)return findings;
 const configured=parsed.page.sections.filter(section=>section.controls.visible);
 parsed.page.sections.forEach((section,index)=>{
  if(!section.controls.visible)return;
  const field=`composition.sections.${index}`;
  if(!conservationSectionKinds.includes(section.kind as ConservationSectionKind))error(`${field}.kind`,'conservation_page_section',`Conservation cannot render ${section.kind}. Hide it until its renderer is connected.`);
  if(section.controls.regions.length)error(`${field}.controls.regions`,'conservation_page_region','Region targeting is not connected for conservation.');
  if(section.kind==='conservationImpact')findings.push({field:`${field}.data.metrics`,code:'conservation_claims_review',severity:'warning',message:'Confirm that the outcome figures and qualifiers remain supported by the cited source. A valid source URL does not verify its claims.'});
 });
 if(!Number.isFinite(now.getTime())){error('composition.sections','conservation_page_time','Use a valid server time to check scheduled content.');return findings;}
 const times=new Set([now.getTime()]);
 for(const section of configured)for(const stamp of [section.controls.visibleFrom,section.controls.visibleUntil])if(stamp&&Date.parse(stamp)>now.getTime())times.add(Date.parse(stamp));
 for(const time of [...times].sort((a,b)=>a-b)){
  const headings=configured.filter(section=>section.controls.headingLevel==='h1'&&sectionIsVisible(section,{locale:'en',now:new Date(time)}));
  if(headings.length!==1){error('composition.sections','conservation_page_heading_schedule',`At ${new Date(time).toISOString()}, this page has ${headings.length} visible H1 headings. Keep one heading visible throughout the schedule.`);break;}
 }
 return findings;
}
