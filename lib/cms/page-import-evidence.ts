import {z} from 'zod';
import type {PageImportChange} from './page-import-plan.ts';
import type {ImportIssue} from './import-contract.ts';
const documentSchema=z.object({recordId:z.string().uuid(),versionId:z.string().uuid(),available:z.boolean()}).strict();
const evidenceSchema=z.object({assets:z.array(z.object({assetId:z.string(),available:z.boolean()}).strict()).max(500),documents:z.array(documentSchema).max(5000)}).strict();
const pair=(value:{recordId:string;versionId:string})=>`${value.recordId.toLowerCase()}:${value.versionId.toLowerCase()}`;

/** Collect from the complete proposed snapshot, including retained and hidden sections. */
export function pageImportLinks(changes:PageImportChange[]){
 const assets=new Set<string>(),documents=new Map<string,{recordId:string;versionId:string}>();
 const visit=(value:unknown)=>{if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')for(const [key,item] of Object.entries(value)){if(key==='assetId'&&typeof item==='string')assets.add(item);else visit(item);}};
 for(const change of changes){
  visit(change.payload);
  for(const section of change.payload.composition.sections)if(section.kind==='downloads'){
   const data=section.data as {items:{document:{recordId:string};versionId:string}[]};
   for(const item of data.items){const reference={recordId:item.document.recordId.toLowerCase(),versionId:item.versionId.toLowerCase()};documents.set(pair(reference),reference);}
  }
 }
 return {assets:[...assets],documents:[...documents.values()]};
}

/** Evidence must be server-produced and match this snapshot exactly. Null fails closed. */
export function verifyPageImportEvidence(changes:PageImportChange[],raw:unknown){
 const expected=pageImportLinks(changes),parsed=evidenceSchema.safeParse(raw);
 if(!parsed.success)return null;
 const evidence=parsed.data;
 if(evidence.assets.length!==expected.assets.length||evidence.assets.some((value,i)=>value.assetId!==expected.assets[i])
  ||evidence.documents.length!==expected.documents.length||evidence.documents.some((value,i)=>pair(value)!==pair(expected.documents[i])))return null;
 const unavailableAssets=new Set(evidence.assets.filter(value=>!value.available).map(value=>value.assetId));
 const unavailableDocuments=new Set(evidence.documents.filter(value=>!value.available).map(pair));
 const issues:ImportIssue[]=[];
 for(const change of changes){
  const links=pageImportLinks([change]);
  for(const asset of links.assets)if(unavailableAssets.has(asset))issues.push({sheet:'Pages',row:0,field:'media',code:'asset_unavailable',severity:'error',message:`${change.importId}: Image ${asset} is unavailable or lacks current processed-image approval.`});
  for(const document of links.documents)if(unavailableDocuments.has(pair(document)))issues.push({sheet:'Pages',row:0,field:'downloads',code:'download_unavailable',severity:'error',message:`${change.importId}: Document ${document.recordId}, version ${document.versionId}, is unavailable in this page language. Check publication, PDF rights and dates.`});
 }
 return {evidence,issues};
}
