import {z} from 'zod';
import {productCategorySchema,productSchema} from './products.ts';
import {productSpecificationFindings,regionKey} from './product-attributes.ts';
import type {ContentFinding} from './content-validation.ts';
const uuid=z.string().uuid();
/** Evidence must be loaded server-side under the requesting actor's website permissions. */
export const productCategoryEvidence=z.object({site:uuid,locale:z.string(),recordId:uuid,revisionId:uuid,payload:productCategorySchema}).strict();
export function productCategoryFindings(input:unknown,context:{site:string;locale:string;categories:unknown[]}):ContentFinding[]{
 const draft=productSchema.safeParse(input),evidence=z.array(productCategoryEvidence).max(2).safeParse(context.categories),findings:ContentFinding[]=[];
 const add=(field:string,message:string)=>findings.push({field,code:'product_category',severity:'error',message});
 if(!draft.success||!evidence.success){add('category','The product or authoritative category evidence is invalid.');return findings;}
 const selected=[draft.data.category,draft.data.subcategory].filter((v):v is NonNullable<typeof v>=>v!==null);
 if(!draft.data.category){add('category','Select a category before validating product specifications.');return findings;}
 if(evidence.data.length!==selected.length||new Set(evidence.data.map(v=>v.recordId.toLowerCase())).size!==selected.length){add('category','Load exactly the selected category records.');return findings;}
 const categories=selected.map(pin=>evidence.data.find(v=>v.recordId.toLowerCase()===pin.recordId.toLowerCase()));
 categories.forEach((category,i)=>{
  if(!category||category.site.toLowerCase()!==context.site.toLowerCase()||category.locale!==context.locale||category.revisionId.toLowerCase()!==selected[i].revisionId.toLowerCase())add(i===0?'category':'subcategory','Category evidence must match this website, language and pinned revision.');
 });
 if(findings.length)return findings;
 const root=categories[0]!,child=categories[1];
 if(root.payload.parent!==null)add('category','Select a top-level category; its child belongs in subcategory.');
 if(child?.payload.parent?.recordId.toLowerCase()!==root.recordId.toLowerCase()&&child)add('subcategory','The selected subcategory must belong to this category.');
 // Parent and child retain their own group ordering, but attribute identities must not collide.
 const keys=categories.flatMap(category=>category!.payload.attributeGroups.flatMap(group=>group.attributes.map(attribute=>attribute.id)));
 if(new Set(keys).size!==keys.length)add('subcategory','Parent and child definitions must have distinct attribute identities.');
 if(findings.length)return findings;
 const validate=(rows:typeof draft.data.specifications):ContentFinding[]=>{
  const results:ContentFinding[]=rows.filter(row=>!keys.includes(row.attributeId)).map(row=>({field:'specifications',code:'product_specification',severity:'error',message:`Attribute ${row.attributeId} is not defined by either category.`}));
  for(const category of categories){
   const groups=category!.payload.attributeGroups,ids=new Set(groups.flatMap(group=>group.attributes.map(attribute=>attribute.id)));
   results.push(...productSpecificationFindings(groups,rows.filter(row=>ids.has(row.attributeId))));
  }
  return results;
 };
 findings.push(...validate(draft.data.specifications));
 draft.data.variants.forEach((variant,i)=>{
  // Variants inherit base specifications; only explicit overrides are validated here.
  const overrides=new Map(variant.specifications.map(row=>[JSON.stringify([row.attributeId,regionKey(row.region)]),row]));
  const effective=draft.data.specifications.map(row=>{const key=JSON.stringify([row.attributeId,regionKey(row.region)]);const override=overrides.get(key);overrides.delete(key);return override??row;});
  effective.push(...overrides.values());
  findings.push(...validate(effective).map(f=>({...f,field:`variants.${i}.${f.field}`})));
 });
 return findings;
}
