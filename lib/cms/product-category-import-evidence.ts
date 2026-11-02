import {z} from 'zod';
import {productAttributeGroups} from './product-attributes.ts';
import type {ProductCategoryImportChange} from './product-category-import-plan.ts';
import type {ImportIssue} from './import-contract.ts';
const schema=z.object({assets:z.array(z.object({assetId:z.string(),available:z.boolean()}).strict()).max(500),references:z.array(z.object({recordId:z.string().uuid(),type:z.literal('productCategory'),available:z.boolean(),revision:z.string().uuid().nullable(),locale:z.string().nullable(),parent:z.object({recordId:z.string().uuid()}).strict().nullable(),attributeGroups:productAttributeGroups.nullable()}).strict()).max(500)}).strict();
export function productCategoryImportLinks(changes:ProductCategoryImportChange[]){
 const assets=new Set<string>(),references=new Map<string,{recordId:string;type:'productCategory'}>();
 for(const {payload} of changes){if(payload.seo.socialImage)assets.add(payload.seo.socialImage.assetId);if(payload.parent)references.set(payload.parent.recordId,{recordId:payload.parent.recordId,type:'productCategory'});}
 return {assets:[...assets],references:[...references.values()]};
}
export function verifyProductCategoryImportEvidence(changes:ProductCategoryImportChange[],raw:unknown){
 const expected=productCategoryImportLinks(changes),parsed=schema.safeParse(raw);if(!parsed.success)return null;const evidence=parsed.data;
 if(evidence.assets.length!==expected.assets.length||evidence.assets.some((row,i)=>row.assetId!==expected.assets[i])||evidence.references.length!==expected.references.length||evidence.references.some((row,i)=>row.recordId!==expected.references[i].recordId||row.available!==(row.revision!==null)||row.available&&(row.locale===null||row.attributeGroups===null)||!row.available&&(row.locale!==null||row.parent!==null||row.attributeGroups!==null)))return null;
 const issues:ImportIssue[]=[];
 for(const change of changes){const add=(field:string,message:string)=>issues.push({sheet:'Pages',row:0,field,code:'reference_unavailable',severity:'error',message:`${change.importId}: ${message}`});
  const asset=change.payload.seo.socialImage?.assetId;if(asset&&!evidence.assets.find(a=>a.assetId===asset)?.available)add('seo.socialImage','Sharing image is unavailable or lacks current processed-image approval.');
  if(change.payload.parent){const parent=evidence.references.find(r=>r.recordId===change.payload.parent!.recordId)!;
   if(!parent.available||parent.locale!==change.locale||parent.parent!==null)add('parent','Choose an accessible top-level category in the same language.');
   else{const proposedParent=changes.find(c=>c.recordId===parent.recordId),groups=proposedParent?.payload.attributeGroups??parent.attributeGroups!;
    if(proposedParent?.payload.parent)add('parent','A parent updated by this import must remain top-level.');
    const inherited=new Set(groups.flatMap(g=>g.attributes.map(a=>a.id)));if(change.payload.attributeGroups.some(g=>g.attributes.some(a=>inherited.has(a.id))))add('attributeGroups','Parent and child attribute identities must not collide.');
   }
  }
 }
 return {evidence,issues};
}
