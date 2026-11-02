import {z} from 'zod';
import {productCategorySchema,productCategoryPath} from './products.ts';
import {pageSeoFindings} from './page-seo.ts';
import type {ContentFinding} from './content-validation.ts';
const uuid=z.string().uuid();
export const productCategoryValidationEvidence=z.object({websiteId:uuid,recordId:uuid,revisionId:uuid,parent:z.object({recordId:uuid,available:z.boolean(),published:z.boolean(),locale:z.string().nullable(),payload:z.unknown()}).strict().nullable(),media:z.array(z.object({assetId:z.string(),available:z.boolean()}).strict()).max(1)}).strict();
type Input={site:string;record:string;revision:string;type:string;path:string|null;locale?:string;payload:unknown};
export function validateProductCategoryContent(input:Input,evidence:unknown){
 const findings:ContentFinding[]=[],error=(field:string,code:string,message:string)=>findings.push({field,code,message,severity:'error'});
 const parsed=productCategorySchema.safeParse(input.payload),checked=productCategoryValidationEvidence.safeParse(evidence);
 if(input.type!=='productCategory')error('type','product_category_identity','Category checks require a product category.');
 if(input.locale!=='en')error('locale','product_category_locale_not_ready','Category delivery for this language is not connected yet.');
 if(!parsed.success)for(const issue of parsed.error.issues)error(issue.path.join('.'),'product_category_field',issue.message);
 const exact=checked.success&&checked.data.websiteId===input.site&&checked.data.recordId===input.record&&checked.data.revisionId===input.revision;
 if(!exact)error('evidence','product_category_evidence_missing','Current server evidence for this category revision is unavailable.');
 if(parsed.success){const d=parsed.data;
  if(input.path!==productCategoryPath(d.slug))error('slug','product_category_identity','Saved category URL and slug must match.');
  if(!d.summary.trim())error('summary','product_category_required','Describe this category before publication.');
  findings.push(...pageSeoFindings(d.seo));
  if(exact&&checked.success){const e=checked.data;
   if(d.parent){const parent=e.parent,definition=productCategorySchema.safeParse(parent?.payload);
    if(!parent||parent.recordId!==d.parent.recordId||parent.recordId===input.record||!parent.available||!parent.published||parent.locale!==input.locale||!definition.success||definition.data.parent!==null)error('parent','product_category_parent_unavailable','Choose a published top-level category in this website and language.');
    else{const inherited=new Set(definition.data.attributeGroups.flatMap(g=>g.attributes.map(a=>a.id)));if(d.attributeGroups.some(g=>g.attributes.some(a=>inherited.has(a.id))))error('attributeGroups','product_category_attribute_collision','Parent and child categories need distinct attribute identities.');}
   }else if(e.parent!==null)error('parent','product_category_evidence_mismatch','Parent evidence does not match this category.');
   const expected=d.seo.socialImage?.assetId;
   if(expected?(e.media.length!==1||e.media[0].assetId!==expected):e.media.length!==0)error('media','product_category_evidence_mismatch','Image evidence does not match this category.');
   if(expected&&!e.media.some(m=>m.assetId===expected&&m.available))error('seo.socialImage','product_category_image_unavailable','The sharing image needs current processing and approved rights.');
  }
 }
 return {validatorVersion:'productCategory-1',contentChecksPass:!findings.some(f=>f.severity==='error'),findings};
}
