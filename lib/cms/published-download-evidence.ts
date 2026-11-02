import {z} from 'zod';
import {sectionDataSchemas,validateComposition} from './composition.ts';
const uuid=z.string().uuid(),language=z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/);
const ref=z.object({recordId:uuid,versionId:uuid}).strict();
const document=ref.extend({locale:language,available:z.boolean()}).strict();
const envelope=z.object({websiteId:uuid,recordId:uuid,revisionId:uuid,locale:language,documents:z.array(document).max(5000)}).strict();
const key=(r:{recordId:string;versionId:string})=>`${r.recordId.toLowerCase()}:${r.versionId.toLowerCase()}`;
export function pageDownloadReferences(composition:unknown){
 const result=validateComposition(composition);if(!result.valid||!result.page)throw Error('Published page composition is invalid.');
 const refs=result.page.sections.flatMap(section=>section.kind==='downloads'?sectionDataSchemas.downloads.parse(section.data).items.map(item=>({recordId:item.document.recordId.toLowerCase(),versionId:item.versionId.toLowerCase()})):[]);
 return [...new Map(refs.map(item=>[key(item),item])).values()];
}
export function verifiedPublishedDownloadEvidence(input:unknown,expected:{site:string;record:string;revision:string;locale:string},refs:{recordId:string;versionId:string}[]){
 const value=envelope.parse(input),keys=new Set(refs.map(key));
 if(value.websiteId!==expected.site||value.recordId!==expected.record||value.revisionId!==expected.revision||value.locale!==expected.locale||value.documents.length!==keys.size||new Set(value.documents.map(key)).size!==keys.size||value.documents.some(row=>row.locale!==expected.locale||!keys.has(key(row))))throw Error('Published document evidence changed or does not match this page.');
 return value.documents;
}
