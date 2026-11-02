import {z} from 'zod';
import type {LocationImportChange} from './location-import-plan.ts';
import type {ImportIssue} from './import-contract.ts';
const reference=z.object({recordId:z.string().uuid(),type:z.enum(['application','project','product','journalArticle','document']),available:z.boolean(),revision:z.string().uuid().nullable()}).strict();
const schema=z.object({assets:z.array(z.object({assetId:z.string(),available:z.boolean()}).strict()).max(500),references:z.array(reference).max(500)}).strict();
export function locationImportLinks(changes:LocationImportChange[]){
 const assets=new Set<string>(),references=new Map<string,{recordId:string;type:'application'|'project'|'product'|'journalArticle'|'document'}>();
 const visit=(value:unknown)=>{if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')for(const [key,item]of Object.entries(value)){if(key==='assetId'&&typeof item==='string')assets.add(item);else visit(item);}};
 for(const {payload} of changes){
  visit(payload);
  for(const [group,type]of [['applications','application'],['projects','project'],['products','product'],['articles','journalArticle'],['documents','document']] as const)for(const row of payload.relationships[group])references.set(`${type}:${row.recordId}`,{type,recordId:row.recordId});
 }
 return {assets:[...assets],references:[...references.values()]};
}
export function verifyLocationImportEvidence(changes:LocationImportChange[],raw:unknown){
 const expected=locationImportLinks(changes),parsed=schema.safeParse(raw);
 if(!parsed.success)return null;
 const evidence=parsed.data;
 if(evidence.assets.length!==expected.assets.length||evidence.assets.some((row,i)=>row.assetId!==expected.assets[i])||evidence.references.length!==expected.references.length||evidence.references.some((row,i)=>row.recordId!==expected.references[i].recordId||row.type!==expected.references[i].type||row.available!==(row.revision!==null)))return null;
 const issues:ImportIssue[]=[];
 for(const change of changes){const links=locationImportLinks([change]);
  for(const asset of links.assets)if(!evidence.assets.find(row=>row.assetId===asset)?.available)issues.push({sheet:'Pages',row:0,field:'media',code:'asset_unavailable',severity:'error',message:`${change.importId}: Image ${asset} is unavailable or lacks current processed-image approval.`});
  for(const ref of links.references)if(!evidence.references.find(row=>row.recordId===ref.recordId&&row.type===ref.type)?.available)issues.push({sheet:'Pages',row:0,field:'relationships',code:'reference_unavailable',severity:'error',message:`${change.importId}: Referenced ${ref.type} ${ref.recordId} is unavailable.`});
 }
 return {evidence,issues};
}
