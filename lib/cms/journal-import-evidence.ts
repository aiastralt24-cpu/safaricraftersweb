import {z} from 'zod';
import type {JournalImportChange} from './journal-import-plan.ts';
import type {ImportIssue} from './import-contract.ts';
const evidenceSchema=z.array(z.object({assetId:z.string(),available:z.boolean()}).strict()).max(500);
export function journalImportLinks(changes:JournalImportChange[]){
 const assets=new Set<string>();
 const visit=(value:unknown)=>{if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')for(const [key,item]of Object.entries(value)){if(key==='assetId'&&typeof item==='string')assets.add(item);else visit(item);}};
 changes.forEach(change=>visit(change.payload));return {assets:[...assets]};
}
export function verifyJournalImportEvidence(changes:JournalImportChange[],raw:unknown){
 const expected=journalImportLinks(changes),parsed=evidenceSchema.safeParse(raw);
 if(!parsed.success||parsed.data.length!==expected.assets.length||parsed.data.some((asset,i)=>asset.assetId!==expected.assets[i]))return null;
 const evidence=parsed.data,issues:ImportIssue[]=[];
 for(const change of changes)for(const asset of journalImportLinks([change]).assets)if(!evidence.find(item=>item.assetId===asset)?.available)issues.push({sheet:'Pages',row:0,field:'media',code:'asset_unavailable',severity:'error',message:`${change.importId}: Image ${asset} is unavailable or lacks current processed-image approval.`});
 return {evidence,issues};
}
