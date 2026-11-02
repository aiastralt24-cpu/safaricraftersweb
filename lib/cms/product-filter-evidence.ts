import {z} from 'zod';
import {publicProductCategorySchema} from './published-product.ts';
import {productSchema,newProduct,newProductCategory} from './products.ts';
import {productCategoryFindings} from './product-category-validation.ts';
import {publicProductAttributes} from './product-comparison.ts';
export const productFilterEvidence=z.object({category:productSchema.shape.category,subcategory:productSchema.shape.subcategory,specifications:productSchema.shape.specifications,categories:z.array(publicProductCategorySchema).min(1).max(2)}).strict();
export function projectProductFilters(input:z.infer<typeof productFilterEvidence>,site:string){
 const {categories:source,...values}=productFilterEvidence.parse(input),draft={...newProduct(),...values};
 const categories=source.map(c=>({site,locale:'en',recordId:c.recordId,revisionId:c.revisionId,currentRevision:c.revisionId,payload:{...newProductCategory(),title:c.title,slug:c.slug,parent:c.parent,attributeGroups:c.attributeGroups}}));
 if(productCategoryFindings(draft,{site,locale:'en',categories:categories.map(({currentRevision,...c})=>c)}).some(f=>f.severity==='error'))throw Error('Invalid product filter definitions or values.');
 return publicProductAttributes(draft,categories).filter(a=>a.filterEligible);
}
