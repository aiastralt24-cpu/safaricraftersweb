import {z} from 'zod';
import {productSchema,productPath,productDraftFindings} from './products.ts';
import {productCategoryFindings} from './product-category-validation.ts';
import type {ContentFinding} from './content-validation.ts';
const uuid=z.string().uuid();
export const productReferenceTypes={applications:'application',documents:'document',projects:'project',certifications:'certification',faqs:'faq',relatedProducts:'product',accessories:'product',compatibleSystems:'product',replacements:'product'} as const;
export const productEvidenceSchema=z.object({websiteId:uuid,recordId:uuid,revisionId:uuid,
 categories:z.array(z.object({recordId:uuid,revisionId:uuid,available:z.boolean(),published:z.boolean(),locale:z.string().nullable(),payload:z.unknown()}).strict()).max(2),
 references:z.array(z.object({group:z.enum(['applications','documents','projects','certifications','faqs','relatedProducts','accessories','compatibleSystems','replacements']),type:z.enum(['application','document','project','certification','faq','product']),recordId:uuid,available:z.boolean(),published:z.boolean(),locale:z.string().nullable()}).strict()).max(270),
 media:z.array(z.object({assetId:z.string(),available:z.boolean()}).strict()).max(1000),links:z.array(z.object({href:z.string(),available:z.boolean()}).strict()).max(10000),
 commerce:z.object({provider:z.enum(['none','shopify']),verified:z.boolean()}).strict(),
}).strict();
type Input={site:string;record:string;revision:string;type:string;path:string|null;locale?:string;payload:unknown};
export function validateProductContent(input:Input,evidence:unknown){
 const findings:ContentFinding[]=[],error=(field:string,code:string,message:string)=>findings.push({field,code,message,severity:'error'});
 const parsed=productSchema.safeParse(input.payload),checked=productEvidenceSchema.safeParse(evidence);
 if(!parsed.success)for(const issue of parsed.error.issues)error(issue.path.join('.'),'product_field',issue.message);
 if(input.type!=='product')error('type','product_identity','Product checks require a product record.');
 if(input.locale!=='en')error('locale','product_locale_not_ready','Product delivery for this language is not connected yet.');
 const exact=checked.success&&checked.data.websiteId===input.site&&checked.data.recordId===input.record&&checked.data.revisionId===input.revision;
 if(!exact)error('evidence','product_evidence_missing','Current server evidence for this saved product revision is unavailable.');
 if(parsed.success){const d=parsed.data;
  if(input.path!==productPath(d.slug))error('slug','product_identity','Saved URL and product slug must match.');findings.push(...productDraftFindings(d));
  if(d.videos.length)error('videos','product_video_evidence_not_ready','Product video rights and delivery evidence are not connected yet.');
  if(exact&&checked.success){const e=checked.data,pins=[d.category,d.subcategory].filter((v):v is NonNullable<typeof v>=>v!==null);
   if(e.categories.length!==pins.length||e.categories.some(c=>!pins.some(p=>p.recordId===c.recordId&&p.revisionId===c.revisionId)))error('category','product_category_evidence_mismatch','Category evidence does not match the selected saved revisions.');
   const categories=[];
   for(const pin of pins){const matches=e.categories.filter(c=>c.recordId===pin.recordId&&c.revisionId===pin.revisionId),c=matches[0];if(matches.length!==1||!c.available||!c.published||c.locale!==input.locale){error('category','product_category_unavailable','Each selected category revision must be available and published in this website and language.');continue;}categories.push({site:input.site,locale:c.locale,recordId:c.recordId,revisionId:c.revisionId,payload:c.payload});}
   if(categories.length===pins.length)findings.push(...productCategoryFindings(d,{site:input.site,locale:input.locale??'',categories}));
   const media=new Set<string>(),links=new Set<string>();const walk=(value:unknown)=>{if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')for(const [key,child]of Object.entries(value)){if(key==='assetId'&&typeof child==='string')media.add(child);else if(key==='href'&&typeof child==='string'&&(child.startsWith('/')||child.startsWith('#')))links.add(child);else walk(child);}};walk(d);
   if(e.media.length!==media.size||e.media.some(m=>!media.has(m.assetId)))error('media','product_evidence_mismatch','Image evidence does not match this draft.');
   for(const assetId of media){const matches=e.media.filter(m=>m.assetId===assetId);if(matches.length!==1||!matches[0].available)error('media','product_image_unavailable','Selected images require current processing and approved usage rights.');}
   if(e.links.length!==links.size||e.links.some(l=>!links.has(l.href)))error('links','product_evidence_mismatch','Internal-link evidence does not match this draft.');
   for(const href of links){const matches=e.links.filter(l=>l.href===href);if(matches.length!==1||!matches[0].available)error('links','product_link_unavailable','An internal link is unavailable.');}
   const refs=Object.entries(productReferenceTypes).flatMap(([group,type])=>d.relationships[group as keyof typeof productReferenceTypes].map(r=>({...r,type,group})));
   if(e.references.length!==refs.length||e.references.some(r=>!refs.some(x=>x.group===r.group&&x.type===r.type&&x.recordId===r.recordId)))error('relationships','product_evidence_mismatch','Related-record evidence does not match this draft.');
   for(const ref of refs){const matches=e.references.filter(r=>r.group===ref.group&&r.type===ref.type&&r.recordId===ref.recordId);if(matches.length!==1||!matches[0].available||!matches[0].published||matches[0].locale!==input.locale||ref.recordId===input.record)error(`relationships.${ref.group}`,'product_reference_unavailable','Choose an eligible published related record in this website and language.');}
   if(e.commerce.provider!==d.commerce.provider||!e.commerce.verified)error('commerce','product_commerce_unverified','The commerce mapping has not been verified against its provider.');
  }
 }
 return {validatorVersion:'product-1',contentChecksPass:!findings.some(f=>f.severity==='error'),findings};
}
