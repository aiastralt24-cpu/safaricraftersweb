import {z} from 'zod';
import type {ExpeditionImportChange} from './photo-expedition-import-plan.ts';
import type {ImportIssue} from './import-contract.ts';
const evidenceSchema=z.object({assets:z.array(z.object({assetId:z.string(),available:z.boolean()}).strict()).max(500),references:z.array(z.object({recordId:z.string().uuid(),type:z.enum(['specialist','form']),available:z.boolean(),locale:z.string().optional()}).strict()).max(500)}).strict();
export function expeditionImportLinks(changes:ExpeditionImportChange[]){
 const assets=new Set<string>(),refs=new Map<string,{recordId:string;type:'specialist'|'form'}>();
 const visit=(value:unknown)=>{if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')for(const [key,item] of Object.entries(value)){if((key==='assetId'||key==='captionsAssetId')&&typeof item==='string')assets.add(item);else visit(item);}};
 for(const change of changes){visit(change.payload);for(const ref of change.payload.specialists)refs.set(`specialist:${ref.recordId}`,{recordId:ref.recordId,type:'specialist'});const form=change.payload.enquiry.form;if(form)refs.set(`form:${form.recordId}`,{recordId:form.recordId,type:'form'});}
 return {assets:[...assets],references:[...refs.values()]};
}
export function verifyExpeditionImportEvidence(changes:ExpeditionImportChange[],raw:unknown){
 const expected=expeditionImportLinks(changes),parsed=evidenceSchema.safeParse(raw);if(!parsed.success)return null;
 const evidence=parsed.data;
 if(evidence.assets.length!==expected.assets.length||evidence.references.length!==expected.references.length||evidence.assets.some((item,index)=>item.assetId!==expected.assets[index])||evidence.references.some((item,index)=>item.recordId!==expected.references[index].recordId||item.type!==expected.references[index].type))return null;
 const issues:ImportIssue[]=[];
 for(const change of changes){
  const fail=(field:string,code:string,message:string)=>issues.push({sheet:'Pages',row:0,field,code,severity:'error',message:`${change.importId}: ${message}`});
  for(const asset of expeditionImportLinks([change]).assets)if(!evidence.assets.find(item=>item.assetId===asset)?.available)fail('media','asset_unavailable',`Media ${asset} is unavailable or lacks current processed-image approval.`);
  const check=(recordId:string,type:'specialist'|'form',field:string)=>{const found=evidence.references.find(item=>item.recordId===recordId&&item.type===type);if(!found?.available||found.locale!==change.locale)fail(field,'reference_unavailable','Related record is unavailable, has the wrong type or belongs to another language.');};
  change.payload.specialists.forEach((ref,index)=>check(ref.recordId,'specialist',`specialists.${index}`));
  if(change.payload.enquiry.form)check(change.payload.enquiry.form.recordId,'form','enquiry.form');
  if(change.payload.video)fail('video','film_verification_pending','Video and captions need dedicated media verification before this import can be saved. Existing films have not been removed.');
 }
 return {evidence,issues};
}
