import {z} from 'zod';
import {validateComposition} from './composition.ts';
import type {ContentFinding,ValidationRecord} from './content-validation.ts';
export const homepageReferenceStatusSchema=z.array(z.discriminatedUnion('available',[
 z.object({recordId:z.string().uuid(),available:z.literal(false)}).strict(),
 z.object({recordId:z.string().uuid(),available:z.literal(true),type:z.enum(['journey','photoExpedition','testimonial']),locale:z.literal('en'),revisionId:z.string().uuid()}).strict(),
])).max(10000);
export type HomepageReferenceStatus=z.infer<typeof homepageReferenceStatusSchema>[number];
/** Current published eligibility, including sections scheduled to appear later.
 * Future publication and delivery must recheck these mutable dependencies. */
export function homepageReferenceFindings(record:ValidationRecord,evidence?:HomepageReferenceStatus[],now=new Date()):ContentFinding[]{
 const parsed=validateComposition(record.payload.composition);if(!parsed.valid||!parsed.page)return [];
 const findings:ContentFinding[]=[];
 parsed.page.sections.forEach((section,index)=>{
  if(!section.controls.visible||(section.controls.visibleUntil&&Date.parse(section.controls.visibleUntil)<=now.getTime()))return;
  const type=section.kind==='homepageJourneys'?'journey':section.kind==='homepageGuestNotes'?'testimonial':section.kind==='homepageDepartures'?'photoExpedition':null;
  if(!type)return;
  const key=section.kind==='homepageDepartures'?'overrides':'items';
  const items=(section.data as Record<string,unknown>)[key] as {recordId:string}[];
  items.forEach((item,itemIndex)=>{
   const matching=evidence?.filter(row=>row.recordId===item.recordId),row=matching?.[0];
   if(matching?.length!==1||!row?.available||row.type!==type||row.locale!==(record.locale??'en'))findings.push({field:`composition.sections.${index}.data.${key}.${itemIndex}.recordId`,code:'homepage_reference_unavailable',severity:'error',message:'Choose an eligible published record of the correct type and language. Journey cards need a hero image; guest reviews need verified consent.'});
  });
 });
 return findings;
}
