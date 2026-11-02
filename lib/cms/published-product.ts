import {publicProductAttributes} from './product-comparison.ts';
import {z} from 'zod';
import {productSchema,productPath,newProductCategory,newProduct} from './products.ts';
import {productCategoryFindings} from './product-category-validation.ts';
import {productAttributeGroups} from './product-attributes.ts';
import {productPreview} from './product-preview.ts';
import {productDraftFindings} from './products.ts';
import {faqSchema} from './faqs.ts';
const uuid=z.string().uuid();
/** SQL must supply only these public fields; never strip unexpected private fields silently. */
export const publicProductContentSchema=z.object(productSchema.shape).omit({internalNotes:true,commerce:true,relationships:true}).strict();
export const publicProductCategorySchema=z.object({recordId:uuid,revisionId:uuid,title:z.string().trim().min(1).max(200),slug:z.string().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),parent:z.object({recordId:uuid}).strict().nullable(),attributeGroups:productAttributeGroups}).strict();
const related=z.object({group:z.enum(['applications','documents','projects','certifications','relatedProducts','accessories','compatibleSystems','replacements']),title:z.string().trim().min(1).max(200),href:z.string().max(2048)}).strict().superRefine((value,ctx)=>{
 const route=value.group==='documents'?/^\/api\/documents\/download\?record=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}&revision=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/:value.group==='applications'?/^\/(applications|industries)\/[a-z0-9]+(?:-[a-z0-9]+)*$/:new RegExp(`^/${value.group==='projects'?'projects':value.group==='certifications'?'certifications':'products'}/[a-z0-9]+(?:-[a-z0-9]+)*$`);
 if(!route.test(value.href))ctx.addIssue({code:'custom',path:['href'],message:'Invalid public related-product route.'});
});
const faq=faqSchema.pick({question:true,answer:true}).refine(v=>v.answer.length>0,'Published FAQs need an answer.');
const envelope=z.object({websiteId:uuid,recordId:uuid,revisionId:uuid,type:z.literal('product'),path:z.string(),locale:z.literal('en'),payload:publicProductContentSchema,categories:z.array(publicProductCategorySchema).min(1).max(2),related:z.array(related).max(240),faqs:z.array(faq).max(30)}).strict();
/** This is a visitor projection, not release authorization. SQL must recheck publication and dependencies. */
export function projectPublishedProduct(input:unknown,path:string,site:string,locale='en'){
 const value=envelope.parse(input),d=value.payload;
 if(locale!=='en'||value.websiteId!==site||value.path!==path||path!==productPath(d.slug))throw Error('Published product identity mismatch.');
 if(value.related.some(r=>r.href===path)||new Set(value.related.map(r=>`${r.group}:${r.href}`)).size!==value.related.length)throw Error('Published product relationships are invalid.');
 // Reuse complete specification checks without synthesizing approval or provider evidence.
 const draft=productSchema.parse({...d,internalNotes:'',commerce:{provider:'none'},relationships:newProduct().relationships});
 const categories=value.categories.map(c=>({site,locale,recordId:c.recordId,revisionId:c.revisionId,currentRevision:c.revisionId,payload:{...newProductCategory(),title:c.title,slug:c.slug,parent:c.parent,attributeGroups:c.attributeGroups}}));
 if(productDraftFindings(draft).some(f=>f.severity==='error')||productCategoryFindings(draft,{site,locale,categories:categories.map(({currentRevision,...evidence})=>evidence)}).some(f=>f.severity==='error'))throw Error('Published product content or definitions are incomplete.');
 // Videos remain unavailable until the release pipeline can prove their rights and delivery.
 if(d.videos.length)throw Error('Published product video evidence is not connected.');
 const {categories:previewCategories,definitionsUnavailable,relatedCounts,seo,...content}=productPreview(draft,categories,{site,locale});
 void previewCategories;void definitionsUnavailable;void relatedCounts;void seo;
 const pins=[d.category,d.subcategory].filter((pin):pin is NonNullable<typeof pin>=>pin!==null);
 return {recordId:value.recordId,revisionId:value.revisionId,path,locale,content:{...content,seo:d.seo},attributes:publicProductAttributes(draft,categories),categories:pins.map(pin=>{const c=value.categories.find(c=>c.recordId===pin.recordId&&c.revisionId===pin.revisionId)!;return {title:c.title,href:'/product-categories/'+c.slug};}),related:value.related,faqs:value.faqs};
}
export type PublishedProduct=ReturnType<typeof projectPublishedProduct>;
