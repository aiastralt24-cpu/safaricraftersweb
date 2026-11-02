import {z} from 'zod';
import {faqSchema} from './faqs.ts';
import type {ContentFinding} from './content-validation.ts';
const uuid=z.string().uuid();
export const faqEvidenceSchema=z.object({websiteId:uuid,recordId:uuid,revisionId:uuid,references:z.array(z.object({type:z.enum(['page','product','destination','document']),recordId:uuid,available:z.boolean(),published:z.boolean(),locale:z.string().nullable()}).strict()).max(120),links:z.array(z.object({href:z.string(),available:z.boolean()}).strict()).max(10000)}).strict();
export function validateFaqContent(input:{site:string;record:string;revision:string;type:string;path:string|null;locale?:string;payload:unknown},evidence:unknown,now=new Date()){
 const findings:ContentFinding[]=[],error=(field:string,code:string,message:string)=>findings.push({field,code,message,severity:'error'}),parsed=faqSchema.safeParse(input.payload),checked=faqEvidenceSchema.safeParse(evidence);
 if(input.type!=='faq'||input.path!==null)error('type','faq_identity','FAQs must be reusable records without a standalone URL.');
 if(input.locale!=='en')error('locale','faq_locale_not_ready','FAQ delivery for this language is not connected yet.');
 if(!parsed.success)for(const issue of parsed.error.issues)error(issue.path.join('.'),'faq_field',issue.message);
 const bound=checked.success&&checked.data.websiteId===input.site&&checked.data.recordId===input.record&&checked.data.revisionId===input.revision;
 if(!bound)error('evidence','faq_evidence_missing','Current server evidence for this saved revision is unavailable.');
 if(parsed.success){const v=parsed.data;
 if(!v.answer.some(b=>b.kind==='paragraph'||b.kind==='quote'?Boolean(b.text.trim()):b.kind==='list'?b.items.some(i=>Boolean(i.trim())):b.kind==='table'?b.rows.some(r=>r.some(c=>Boolean(c.trim()))):false))error('answer','faq_answer_required','Add substantive answer content. A link alone is not an answer.');
 if(v.reviewOn&&v.reviewOn<now.toISOString().slice(0,10))error('reviewOn','faq_review_overdue','Review this answer and update its review date before publishing.');
 if(v.relationships.products.length)error('relationships.products','faq_product_delivery_not_ready','Public product delivery is not connected yet. Keep these relationships in a draft.');
 if(bound&&checked.success){const e=checked.data,refs=([['pages','page'],['products','product'],['destinations','destination'],['documents','document']] as const).flatMap(([key,type])=>v.relationships[key].map(r=>({...r,type,key})));
 if(e.references.length!==refs.length||e.references.some(r=>!refs.some(x=>x.type===r.type&&x.recordId===r.recordId)))error('relationships','faq_evidence_mismatch','Related-record evidence does not match this draft.');
 for(const ref of refs){const rows=e.references.filter(r=>r.type===ref.type&&r.recordId===ref.recordId);if(rows.length!==1||!rows[0].available||!rows[0].published||rows[0].locale!==input.locale||ref.recordId===input.record)error(`relationships.${ref.key}`,'faq_reference_unavailable','Choose a published related record in this website and language.');}
 const hrefs=new Set<string>();const walk=(value:unknown)=>{if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')for(const [key,child]of Object.entries(value)){if(key==='href'&&typeof child==='string'&&(child.startsWith('/')||child.startsWith('#')))hrefs.add(child);else walk(child);}};walk(v.answer);
 if(e.links.length!==hrefs.size||e.links.some(l=>!hrefs.has(l.href)))error('links','faq_evidence_mismatch','Internal-link evidence does not match this answer.');
 for(const href of hrefs){const rows=e.links.filter(l=>l.href===href);if(rows.length!==1||!rows[0].available)error('links','faq_link_unavailable','An internal link does not resolve to an available page or supported anchor.');}
 }}
 return {validatorVersion:'faq-1',contentChecksPass:!findings.some(f=>f.severity==='error'),findings};
}
