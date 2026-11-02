import {z} from 'zod';
import {validateComposition,sectionDataSchemas} from './composition.ts';
import type {ContentFinding} from './content-validation.ts';
export const contactFormStatusSchema=z.array(z.object({recordId:z.string().uuid(),revisionId:z.string().uuid().nullable(),locale:z.string().nullable(),available:z.boolean()}).strict()).max(100);
export type ContactFormStatus=z.infer<typeof contactFormStatusSchema>;
/** Complete trusted snapshot for all configured panels, including future ones. */
export function contactFormFindings(composition:unknown,status:unknown):ContentFinding[]{
 const parsed=validateComposition(composition);if(!parsed.page)return [];
 const refs=parsed.page.sections.flatMap((section,index)=>section.kind==='contactEnquiry'&&section.controls.visible?(()=>{const form=sectionDataSchemas.contactEnquiry.parse(section.data).form;return form?[{recordId:form.recordId.toLowerCase(),field:`composition.sections.${index}.data.form`}]:[];})():[]);
 if(!refs.length)return [];
 const error=(field:string,code:string,message:string):ContentFinding=>({field,code,message,severity:'error'});
 const evidence=contactFormStatusSchema.safeParse(status);
 if(!evidence.success)return [error('composition','contact_form_evidence_missing','Request a trusted check of the linked published forms.')];
 const expected=new Set(refs.map(ref=>ref.recordId)),actual=evidence.data.map(row=>row.recordId.toLowerCase());
 if(new Set(actual).size!==actual.length||actual.length!==expected.size||actual.some(id=>!expected.has(id)))return [error('composition','contact_form_evidence_mismatch','Form evidence does not match this saved page. Request another trusted check.')];
 return refs.filter(ref=>{const row=evidence.data.find(item=>item.recordId.toLowerCase()===ref.recordId)!;return !row.available||!row.revisionId||row.locale!=='en';}).map(ref=>error(ref.field,'contact_form_unavailable','The linked form needs an eligible published English revision in this website.'));
}
