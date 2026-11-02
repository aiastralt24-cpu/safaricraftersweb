import {z} from 'zod';
import type {ContentFinding,ValidationRecord} from './content-validation.ts';
import type {PhotoExpeditionDraft} from './photo-expeditions.ts';
/** Evidence is supplied by a trusted database read, never by an editor's assertion. */
export const expeditionReferenceStatusSchema=z.array(z.discriminatedUnion('available',[
 z.object({recordId:z.string().uuid(),available:z.literal(false)}).strict(),
 z.object({recordId:z.string().uuid(),available:z.literal(true),type:z.enum(['specialist','form']),locale:z.literal('en'),publishedRevisionId:z.string().uuid()}).strict(),
])).max(21);
export type ExpeditionReferenceStatus=z.infer<typeof expeditionReferenceStatusSchema>[number];
export function expeditionReferenceFindings(record:ValidationRecord,value:PhotoExpeditionDraft,input:unknown):ContentFinding[]{
 const findings:ContentFinding[]=[];
 const error=(field:string,message:string)=>findings.push({field,code:'expedition_reference_verification',severity:'error',message});
 const expected=[...value.specialists.map((item,index)=>({recordId:item.recordId,type:'specialist',field:`specialists.${index}.recordId`})),...(value.enquiry.form?[{recordId:value.enquiry.form.recordId,type:'form',field:'enquiry.form.recordId'}]:[])];
 const parsed=expeditionReferenceStatusSchema.safeParse(input);
 if(!parsed.success){if(expected.length||input!==undefined)error('references','Current published reference evidence is unavailable or invalid. Run validation again.');return findings;}
 const selected=new Set(expected.map(item=>item.recordId));
 if(parsed.data.some(item=>!selected.has(item.recordId)))error('references','Reference evidence includes an unexpected record. Run validation again.');
 for(const reference of expected){
  if(reference.recordId===record.record){error(reference.field,'An expedition cannot reference itself.');continue;}
  const matches=parsed.data.filter(item=>item.recordId===reference.recordId);
  if(matches.length!==1||!matches[0].available){error(reference.field,'Select a currently deliverable published record from this website.');continue;}
  const evidence=matches[0];
  if(evidence.type!==reference.type||evidence.locale!==(record.locale??'en'))error(reference.field,'The linked record has the wrong content type or language.');
 }
 return findings;
}
