import {z} from 'zod';
import {productCategorySchema} from './products.ts';
import {productReferenceTypes} from './product-validation.ts';
import {productImportCategoryIssues} from './product-import-category-evidence.ts';
import type {ProductImportChange} from './product-import-plan.ts';
import type {ImportIssue} from './import-contract.ts';
const uuid=z.string().uuid();
const schema=z.object({
 assets:z.array(z.object({assetId:z.string(),available:z.boolean()}).strict()).max(500),
 references:z.array(z.object({recordId:uuid,type:z.enum(['application','document','project','certification','faq','product']),available:z.boolean(),revision:uuid.nullable(),locale:z.string().nullable()}).strict()).max(500),
 categories:z.array(z.object({recordId:uuid,revisionId:uuid,available:z.boolean(),locale:z.string().nullable(),payload:productCategorySchema.nullable()}).strict()).max(50),
}).strict();
/** Derive requested identities from complete proposed snapshots, not client-supplied evidence lists. */
export function productImportLinks(changes:ProductImportChange[]){
 const assets=new Set<string>(),references=new Map<string,{recordId:string;type:typeof productReferenceTypes[keyof typeof productReferenceTypes]}>(),categories=new Map<string,{recordId:string;revisionId:string}>();
 const visit=(value:unknown)=>{if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')for(const [key,item]of Object.entries(value)){if(key==='assetId'&&typeof item==='string')assets.add(item);else visit(item);}};
 for(const {payload} of changes){
  visit(payload);
  for(const [group,type]of Object.entries(productReferenceTypes))for(const ref of payload.relationships[group as keyof typeof productReferenceTypes])references.set(`${type}:${ref.recordId}`,{recordId:ref.recordId,type});
  for(const pin of [payload.category,payload.subcategory])if(pin)categories.set(`${pin.recordId}:${pin.revisionId}`,pin);
 }
 return {assets:[...assets],references:[...references.values()],categories:[...categories.values()]};
}
/** Validate response coverage before interpreting availability. Must receive actor-scoped server RPC output. */
export function verifyProductImportEvidence(changes:ProductImportChange[],site:string,raw:unknown){
 const expected=productImportLinks(changes),parsed=schema.safeParse(raw);if(!parsed.success)return null;const evidence=parsed.data;
 if(evidence.assets.length!==expected.assets.length||evidence.assets.some((r,i)=>r.assetId!==expected.assets[i])||
 evidence.references.length!==expected.references.length||evidence.references.some((r,i)=>r.recordId!==expected.references[i].recordId||r.type!==expected.references[i].type||r.available!==(r.revision!==null)||r.available!==(r.locale!==null))||
 evidence.categories.length!==expected.categories.length||evidence.categories.some((r,i)=>r.recordId!==expected.categories[i].recordId||r.revisionId!==expected.categories[i].revisionId||r.available!==(r.locale!==null)||r.available!==(r.payload!==null)))return null;
 const issues:ImportIssue[]=[];
 for(const change of changes){
  const links=productImportLinks([change]),add=(field:string,message:string)=>issues.push({sheet:'Pages',row:change.sourceRow,field,code:'import_evidence',severity:'error',message});
  for(const assetId of links.assets)if(!evidence.assets.find(a=>a.assetId===assetId)?.available)add('media',`Image ${assetId} is unavailable or lacks current processed-image approval.`);
  for(const ref of links.references){const e=evidence.references.find(r=>r.recordId===ref.recordId&&r.type===ref.type)!;if(!e.available||e.locale!==change.locale||ref.recordId===change.recordId)add('relationships',`Choose an accessible ${ref.type} in the same language, distinct from this product.`);}
 }
 issues.push(...productImportCategoryIssues(changes,site,changes.map(change=>({importId:change.importId,categories:[change.payload.category,change.payload.subcategory].filter(pin=>pin!==null).flatMap(pin=>{
  const e=evidence.categories.find(c=>c.recordId===pin.recordId&&c.revisionId===pin.revisionId)!;
  return e.available?[{site,recordId:e.recordId,revisionId:e.revisionId,locale:e.locale!,payload:e.payload!}]:[];
 })}))));
 return {evidence,issues};
}
