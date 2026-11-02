import type {ProductDraft} from './products.ts';
import type {ProductCategoryRevision} from './product-category-revision.ts';
import {regionKey} from './product-attributes.ts';
import {specificationDisplay} from './product-preview.ts';

/** Only call after the public boundary validates exact category evidence and typed values. */
export function publicProductAttributes(draft:ProductDraft,categories:ProductCategoryRevision[]){
 const pins=[draft.category,draft.subcategory].filter(pin=>pin!==null);
 return pins.flatMap(pin=>categories.filter(c=>c.recordId===pin.recordId&&c.revisionId===pin.revisionId)).flatMap(category=>
  [...category.payload.attributeGroups].sort((a,b)=>a.position-b.position).flatMap(group=>
   [...group.attributes].sort((a,b)=>a.position-b.position).filter(a=>a.filterEligible||a.comparisonEligible).flatMap(attribute=>
    (attribute.regions.length?attribute.regions:[null]).map(region=>{
     const scope=regionKey(region),value=draft.specifications.find(row=>row.attributeId===attribute.id&&regionKey(row.region)===scope)?.value??null;
     // Different category meanings, units, types, labels or choice sets never merge by label alone.
     const key=JSON.stringify([category.payload.slug,attribute.id,attribute.label,attribute.valueType,attribute.unit,[...attribute.allowedValues].sort(),scope]);
     return {key,category:category.payload.title,label:attribute.label,unit:attribute.unit,region:scope,valueType:attribute.valueType,filterEligible:attribute.filterEligible,comparisonEligible:attribute.comparisonEligible,value,display:specificationDisplay(value??undefined)};
    })
   )
  )
 );
}
export type PublicProductAttribute=ReturnType<typeof publicProductAttributes>[number];
export function productComparisonRows(products:{attributes:PublicProductAttribute[]}[]){
 const definitions=new Map<string,PublicProductAttribute>();
 for(const product of products)for(const attribute of product.attributes)if(attribute.comparisonEligible&&!definitions.has(attribute.key))definitions.set(attribute.key,attribute);
 return [...definitions.values()].map(attribute=>({key:attribute.key,label:attribute.label,category:attribute.category,unit:attribute.unit,region:attribute.region,values:products.map(product=>product.attributes.find(row=>row.key===attribute.key&&row.comparisonEligible)?.display??'Not comparable')}));
}
export function comparisonSlugs(input:string|string[]|undefined){
 const values=input===undefined?[]:Array.isArray(input)?input:[input];
 if(values.length<2||values.length>4||new Set(values).size!==values.length||values.some(v=>v.length>100||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v)))return null;
 return values;
}
