import {z} from 'zod';
import {productCategorySchema,productCategoryPath} from './products.ts';
import {pageSeoFindings} from './page-seo.ts';
export const publicProductCategoryContentSchema=productCategorySchema.omit({parent:true,attributeGroups:true,internalNotes:true});
export const publicCategoryParent=z.object({title:z.string().trim().min(1).max(200),href:z.string().max(120).regex(/^\/product-categories\/[a-z0-9]+(?:-[a-z0-9]+)*$/)}).strict().nullable();
const envelope=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),type:z.literal('productCategory'),path:z.string(),locale:z.literal('en'),payload:publicProductCategoryContentSchema,parent:publicCategoryParent}).strict();
export function projectPublishedProductCategory(input:unknown,path:string,locale='en'){
 const value=envelope.parse(input),d=value.payload;
 if(locale!=='en'||value.path!==path||path!==productCategoryPath(d.slug)||value.parent?.href===path)throw Error('Published category identity mismatch.');
 if(!d.summary.trim()||pageSeoFindings(d.seo).some(f=>f.severity==='error'))throw Error('Published category is incomplete.');
 return {recordId:value.recordId,revisionId:value.revisionId,path:value.path,locale:value.locale,content:d,parent:value.parent};
}
export type PublishedProductCategory=ReturnType<typeof projectPublishedProductCategory>;
