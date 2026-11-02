import {z} from 'zod';
import {productCategoryEvidence} from './product-category-validation.ts';
export const productCategoryRevisionQuery=z.object({site:z.string().uuid(),record:z.string().uuid(),revision:z.string().uuid()}).strict();
export const productCategoryRevisionSchema=productCategoryEvidence.extend({currentRevision:z.string().uuid()});
export type ProductCategoryRevision=z.infer<typeof productCategoryRevisionSchema>;
export function verifiedProductCategoryRevision(input:unknown,query:z.infer<typeof productCategoryRevisionQuery>){
 const value=productCategoryRevisionSchema.parse(input);
 if(value.site!==query.site||value.recordId!==query.record||value.revisionId!==query.revision)throw Error('Category revision evidence does not match the requested identity.');return value;
}
