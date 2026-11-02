import {z} from 'zod';
import type {DestinationImportChange} from './destination-import-plan.ts';
import type {ImportIssue} from './import-contract.ts';
const evidenceSchema=z.object({assets:z.array(z.object({assetId:z.string(),available:z.boolean()}).strict()).max(500),references:z.array(z.object({recordId:z.string().uuid(),type:z.enum(['journey','photoExpedition','destination']),available:z.boolean(),locale:z.string().optional()}).strict()).max(500)}).strict();
const groups=[['journeys','journey'],['expeditions','photoExpedition'],['pairings','destination']] as const;
export function destinationImportLinks(changes:DestinationImportChange[]){
 const assets=new Set<string>(),refs=new Map<string,{recordId:string;type:'journey'|'photoExpedition'|'destination'}>();
 const visit=(value:unknown)=>{if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')for(const [key,item]of Object.entries(value)){if((key==='assetId'||key==='captionsAssetId')&&typeof item==='string')assets.add(item);else visit(item);}};
 for(const change of changes){visit(change.payload);for(const [field,type]of groups)for(const ref of change.payload[field])refs.set(`${type}:${ref.recordId}`,{recordId:ref.recordId,type});}
 return {assets:[...assets],references:[...refs.values()]};
}
export function verifyDestinationImportEvidence(changes:DestinationImportChange[],raw:unknown){
 const expected=destinationImportLinks(changes),parsed=evidenceSchema.safeParse(raw);
 if(!parsed.success)return null;
 const evidence=parsed.data;
 if(evidence.assets.length!==expected.assets.length||evidence.references.length!==expected.references.length||evidence.assets.some((a,i)=>a.assetId!==expected.assets[i])||evidence.references.some((r,i)=>r.recordId!==expected.references[i].recordId||r.type!==expected.references[i].type))return null;
 const issues:ImportIssue[]=[];
 for(const change of changes){
  const fail=(field:string,code:string,message:string)=>issues.push({sheet:'Pages',row:0,field,code,severity:'error',message:`${change.importId}: ${message}`});
  for(const asset of destinationImportLinks([change]).assets)if(!evidence.assets.find(a=>a.assetId===asset)?.available)fail('media','asset_unavailable',`Image ${asset} is unavailable or lacks current processed-image approval.`);
  for(const [field,type]of groups)change.payload[field].forEach((ref,index)=>{
   const found=evidence.references.find(r=>r.recordId===ref.recordId&&r.type===type);
   if(ref.recordId===change.recordId)fail(`${field}.${index}`,'self_reference','A destination cannot pair with itself.');
   if(!found?.available||found.locale!==change.locale)fail(`${field}.${index}`,'reference_unavailable','Related record is unavailable, has the wrong type or belongs to another language.');
  });
 }
 return {evidence,issues};
}
