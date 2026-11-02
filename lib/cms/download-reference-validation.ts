import {z} from 'zod';
import {sectionDataSchemas,type Composition} from './composition.ts';
import type {ContentFinding} from './content-validation.ts';
export const downloadReferenceStatusSchema=z.array(z.object({recordId:z.string().uuid(),versionId:z.string().uuid(),available:z.boolean()}).strict()).max(5000);
export type DownloadReferenceStatus=z.infer<typeof downloadReferenceStatusSchema>;
export function downloadReferenceFindings(page:Composition|undefined,status?:DownloadReferenceStatus):ContentFinding[]{
 if(!page)return [];
 const refs=page.sections.flatMap((section,index)=>section.kind==='downloads'?sectionDataSchemas.downloads.parse(section.data).items.map((item,itemIndex)=>({recordId:item.document.recordId,versionId:item.versionId,field:`composition.sections.${index}.data.items.${itemIndex}.document`})) : []);
 if(!refs.length)return [];
 const key=(ref:{recordId:string;versionId:string})=>`${ref.recordId.toLowerCase()}:${ref.versionId.toLowerCase()}`;
 const expected=new Set(refs.map(key)),parsed=downloadReferenceStatusSchema.safeParse(status);
 const error=(field:string,code:string,message:string):ContentFinding=>({field,severity:'error',code,message});
 if(!parsed.success)return [error('composition','download_evidence_missing','Request a trusted check to verify the selected document versions and current PDF eligibility.')];
 const actual=new Set(parsed.data.map(key));
 if(actual.size!==parsed.data.length||actual.size!==expected.size||[...actual].some(id=>!expected.has(id)))return [error('composition','download_evidence_mismatch','Document checks do not match the saved download selections. Request another trusted check.')];
 const available=new Map(parsed.data.map(item=>[key(item),item.available]));
 return refs.filter(ref=>!available.get(key(ref))).map(ref=>error(ref.field,'download_unavailable','This document version is no longer eligible in this page language. Update the selection and check publication, PDF rights and dates.'));
}
