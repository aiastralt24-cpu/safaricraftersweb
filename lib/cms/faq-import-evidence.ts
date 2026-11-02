import {z} from 'zod';
import type {FaqImportChange} from './faq-import-plan.ts';
import type {ImportIssue} from './import-contract.ts';
const reference=z.object({recordId:z.string().uuid(),type:z.enum(['page','product','destination','document']),available:z.boolean(),revision:z.string().uuid().nullable()}).strict();
const schema=z.object({references:z.array(reference).max(500)}).strict();
export function faqImportLinks(changes:FaqImportChange[]){
 const references=new Map<string,{recordId:string;type:'page'|'product'|'destination'|'document'}>();
 for(const {payload} of changes)for(const [group,type]of [['pages','page'],['products','product'],['destinations','destination'],['documents','document']] as const)for(const row of payload.relationships[group])references.set(`${type}:${row.recordId}`,{type,recordId:row.recordId});
 return {references:[...references.values()]};
}

export function verifyFaqImportEvidence(changes:FaqImportChange[],raw:unknown){
 const expected=faqImportLinks(changes),parsed=schema.safeParse(raw);
 if(!parsed.success)return null;
 const evidence=parsed.data;
 if(evidence.references.length!==expected.references.length||evidence.references.some((row,i)=>row.recordId!==expected.references[i].recordId||row.type!==expected.references[i].type||row.available!==(row.revision!==null)))return null;
 const issues:ImportIssue[]=[];
 for(const change of changes){const links=faqImportLinks([change]);
  for(const ref of links.references)if(!evidence.references.find(row=>row.recordId===ref.recordId&&row.type===ref.type)?.available)issues.push({sheet:'Pages',row:0,field:'relationships',code:'reference_unavailable',severity:'error',message:`${change.importId}: Referenced ${ref.type} ${ref.recordId} is unavailable.`});
 }
 return {evidence,issues};
}
