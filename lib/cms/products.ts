import {z} from 'zod';
import {journalBlockSchema} from './journal.ts';
import {image} from './composition-media.ts';
import {safeHref} from './composition.ts';
import {newPageSeo,pageSeoSchema,pageSeoFindings} from './page-seo.ts';
import {productAttributeGroups,productKey,productRegion,productSpecifications,regionKey} from './product-attributes.ts';
import type {ContentFinding} from './content-validation.ts';
const uuid=z.string().uuid(),slug=z.string().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),title=z.string().trim().min(1).max(200),text=z.string().max(2000);
const ref=z.object({recordId:uuid}).strict(),refs=z.array(ref).max(30).refine(rows=>new Set(rows.map(r=>r.recordId.toLowerCase())).size===rows.length,'Select each related record once.');
const pinnedCategory=z.object({recordId:uuid,revisionId:uuid}).strict();
const labels=z.array(z.string().trim().min(1).max(500)).max(50).refine(rows=>new Set(rows.map(r=>r.toLowerCase())).size===rows.length,'Use distinct entries.');
const body=z.array(journalBlockSchema).max(200).refine(rows=>new Set(rows.map(r=>r.id)).size===rows.length,'Content blocks require unique identities.');
const productGid=z.string().regex(/^gid:\/\/shopify\/Product\/[1-9][0-9]*$/),variantGid=z.string().regex(/^gid:\/\/shopify\/ProductVariant\/[1-9][0-9]*$/);
/** CMS owns editorial information. Commerce identifiers are mappings, never prices, inventory or approval authority. */
export const productCommerceSchema=z.discriminatedUnion('provider',[
 z.object({provider:z.literal('none')}).strict(),
 z.object({provider:z.literal('shopify'),productId:productGid,variants:z.array(z.object({variantKey:productKey,variantId:variantGid}).strict()).max(100)}).strict(),
]);
export const productCategorySchema=z.object({schemaVersion:z.literal(1),title,slug,summary:text,parent:ref.nullable(),attributeGroups:productAttributeGroups,seo:pageSeoSchema,internalNotes:text}).strict();
export type ProductCategoryDraft=z.infer<typeof productCategorySchema>;
export function newProductCategory():ProductCategoryDraft{return {schemaVersion:1,title:'New product category',slug:'new-category',summary:'',parent:null,attributeGroups:[],seo:newPageSeo(),internalNotes:''};}
export const productSchema=z.object({
 schemaVersion:z.literal(1),title,slug,code:z.string().max(120),brand:z.string().max(200),category:pinnedCategory.nullable(),subcategory:pinnedCategory.nullable(),summary:text,body,
 benefits:labels,features:labels,suitableUses:labels,unsuitableUses:labels,gallery:z.array(image).max(30),
 videos:z.array(z.object({id:productKey,title,url:safeHref.refine(v=>v.startsWith('https://'),'Use an HTTPS video URL.'),transcript:z.string().max(50000)}).strict()).max(20),
 specifications:productSpecifications,
 variants:z.array(z.object({id:productKey,title,code:z.string().max(120),size:z.string().max(200),colour:z.string().max(200),finish:z.string().max(200),packaging:text,specifications:productSpecifications}).strict()).max(100),
 packaging:text,colours:labels,finishes:labels,installation:body,precautions:body,warranty:body,
 availability:z.array(productRegion).max(100),lifecycle:z.enum(['active','comingSoon','discontinued']),lifecycleNote:text,
 relationships:z.object({applications:refs,documents:refs,projects:refs,certifications:refs,faqs:refs,relatedProducts:refs,accessories:refs,compatibleSystems:refs,replacements:refs}).strict(),
 enquiry:z.object({label:title,href:safeHref}).strict().nullable(),commerce:productCommerceSchema,seo:pageSeoSchema,internalNotes:text,
}).strict().superRefine((value,ctx)=>{
 const unique=(values:string[],path:string)=>{if(new Set(values).size!==values.length)ctx.addIssue({code:'custom',path:[path],message:'Use distinct identities.'});};
 unique(value.variants.map(v=>v.id),'variants');unique(value.videos.map(v=>v.id),'videos');unique(value.availability.map(regionKey),'availability');
 if(value.subcategory&&!value.category)ctx.addIssue({code:'custom',path:['subcategory'],message:'Choose a parent category first.'});
 if(value.subcategory&&value.subcategory.recordId.toLowerCase()===value.category?.recordId.toLowerCase())ctx.addIssue({code:'custom',path:['subcategory'],message:'Category and subcategory must be different records.'});
 if(value.commerce.provider==='shopify'){
  unique(value.commerce.variants.map(v=>v.variantKey),'commerce');unique(value.commerce.variants.map(v=>v.variantId),'commerce');
  value.commerce.variants.forEach((mapping,i)=>{if(!value.variants.some(v=>v.id===mapping.variantKey))ctx.addIssue({code:'custom',path:['commerce','variants',i],message:'Map an existing editorial variant.'});});
 }
});
export type ProductDraft=z.infer<typeof productSchema>;
export function newProduct():ProductDraft{return {schemaVersion:1,title:'New product',slug:'new-product',code:'',brand:'',category:null,subcategory:null,summary:'',body:[],benefits:[],features:[],suitableUses:[],unsuitableUses:[],gallery:[],videos:[],specifications:[],variants:[],packaging:'',colours:[],finishes:[],installation:[],precautions:[],warranty:[],availability:[],lifecycle:'active',lifecycleNote:'',relationships:{applications:[],documents:[],projects:[],certifications:[],faqs:[],relatedProducts:[],accessories:[],compatibleSystems:[],replacements:[]},enquiry:null,commerce:{provider:'none'},seo:newPageSeo(),internalNotes:''};}
export const productPath=(value:string)=>`/products/${value}`;
export const productCategoryPath=(value:string)=>`/product-categories/${value}`;
const saveFields={action:z.literal('save'),site:uuid,record:uuid.nullable(),expectedRevision:uuid.nullable(),requestKey:uuid.optional(),locale:z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/).default('en')};
const identity=(value:{record:string|null;expectedRevision:string|null;requestKey?:string})=>value.record===null?value.expectedRevision===null&&Boolean(value.requestKey):value.expectedRevision!==null&&value.requestKey===undefined;
export const productSaveCommand=z.object({...saveFields,payload:productSchema}).strict().refine(identity,'Creates need a recovery key; updates need the current revision.');
export const productCategorySaveCommand=z.object({...saveFields,payload:productCategorySchema}).strict().refine(identity,'Creates need a recovery key; updates need the current revision.');
export function productDraftFindings(input:unknown):ContentFinding[]{
 const parsed=productSchema.safeParse(input);if(!parsed.success)return parsed.error.issues.map(issue=>({field:issue.path.join('.'),code:'product_field',severity:'error',message:issue.message}));
 const value=parsed.data,findings:ContentFinding[]=[];
 for(const [field,missing,message] of [['code',!value.code.trim(),'Provide the product code.'],['category',!value.category,'Select a category and its definitions.'],['summary',!value.summary.trim(),'Add a product summary.'],['body',!value.body.length,'Add detailed product information.'],['enquiry',!value.enquiry,'Provide an enquiry action.'],['lifecycleNote',value.lifecycle==='discontinued'&&!value.lifecycleNote.trim(),'Explain discontinuation and replacement availability.']] as const)if(missing)findings.push({field,code:'product_required',severity:'error',message});
 return [...findings,...pageSeoFindings(value.seo)];
}
