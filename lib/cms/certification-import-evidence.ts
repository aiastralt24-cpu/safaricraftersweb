import {z} from 'zod';
import type {CertificationImportChange} from './certification-import-plan.ts';
import type {ImportIssue} from './import-contract.ts';
const reference=z.object({recordId:z.string().uuid(),type:z.enum(['location','document','page']),available:z.boolean(),revision:z.string().uuid().nullable()}).strict();
const schema=z.object({assets:z.array(z.object({assetId:z.string(),available:z.boolean()}).strict()).max(500),references:z.array(reference).max(500)}).strict();
export function certificationImportLinks(changes:CertificationImportChange[]){
 const assets=new Set<string>(),references=new Map<string,{recordId:string;type:'location'|'document'|'page'}>();
 const visit=(value:unknown)=>{if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')for(const [key,item]of Object.entries(value)){if(key==='assetId'&&typeof item==='string')assets.add(item);else visit(item);}};
 for(const {payload} of changes){
  visit(payload);
  for(const row of payload.evidence)references.set(`document:${row.recordId}`,{type:'document',recordId:row.recordId});
  for(const [group,type]of [['locations','location'],['pages','page']] as const)for(const row of payload.relationships[group])references.set(`${type}:${row.recordId}`,{type,recordId:row.recordId});
 }
 return {assets:[...assets],references:[...references.values()]};
}
/** Verify draft-reference availability only. Trusted publication checks remain separate. */
export function verifyCertificationImportEvidence(changes:CertificationImportChange[],raw:unknown){
 const expected=certificationImportLinks(changes),parsed=schema.safeParse(raw);
 if(!parsed.success)return null;
 const evidence=parsed.data;
 if(evidence.assets.length!==expected.assets.length||evidence.assets.some((row,i)=>row.assetId!==expected.assets[i])||evidence.references.length!==expected.references.length||evidence.references.some((row,i)=>row.recordId!==expected.references[i].recordId||row.type!==expected.references[i].type||row.available!==(row.revision!==null)))return null;
 const issues:ImportIssue[]=[];
 for(const change of changes){const links=certificationImportLinks([change]);
  for(const asset of links.assets)if(!evidence.assets.find(row=>row.assetId===asset)?.available)issues.push({sheet:'Pages',row:0,field:'media',code:'asset_unavailable',severity:'error',message:`${change.importId}: Image ${asset} is unavailable or lacks current processed-image approval.`});
  for(const ref of links.references)if(!evidence.references.find(row=>row.recordId===ref.recordId&&row.type===ref.type)?.available)issues.push({sheet:'Pages',row:0,field:ref.type==='document'?'evidence':'relationships',code:'reference_unavailable',severity:'error',message:`${change.importId}: Referenced ${ref.type} ${ref.recordId} is unavailable.`});
 }
 return {evidence,issues};
}
