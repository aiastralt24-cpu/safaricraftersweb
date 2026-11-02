import {z} from 'zod';
import {productCategoryEvidence,productCategoryFindings} from './product-category-validation.ts';
import type {ProductImportChange} from './product-import-plan.ts';
import type {ImportIssue} from './import-contract.ts';
const evidenceSchema=z.array(z.object({importId:z.string().min(1).max(128),categories:z.array(productCategoryEvidence).max(2)}).strict()).max(25);
/** The server must supply actor-scoped saved revisions, never definitions from the upload or client. */
export function productImportCategoryIssues(changes:ProductImportChange[],site:string,evidence:unknown):ImportIssue[]{
 const issues:ImportIssue[]=[];
 const fail=(row:number,field:string,message:string)=>issues.push({sheet:'Pages',row,field,severity:'error',code:'category_evidence',message});
 const parsed=evidenceSchema.safeParse(evidence);
 if(!z.string().uuid().safeParse(site).success||!parsed.success||changes.length>25||new Set(changes.map(c=>c.importId)).size!==changes.length){fail(1,'category','Invalid product category evidence context.');return issues;}
 if(parsed.data.length!==changes.length||new Set(parsed.data.map(e=>e.importId)).size!==changes.length||parsed.data.some(e=>!changes.some(c=>c.importId===e.importId))){fail(1,'category','Provide exactly one scoped category-evidence result per imported product.');return issues;}
 changes.forEach(change=>{
  const result=parsed.data.find(e=>e.importId===change.importId)!;
  for(const finding of productCategoryFindings(change.payload,{site,locale:change.locale,categories:result.categories}))fail(change.sourceRow,finding.field,finding.message);
 });
 return issues;
}
