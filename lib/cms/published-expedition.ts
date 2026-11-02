import {z} from 'zod';
import {photoExpeditionSchema} from './photo-expeditions.ts';
const uuid=z.string().uuid();
const specialist=z.object({websiteId:uuid,recordId:uuid,publishedRevisionId:uuid,type:z.literal('specialist'),locale:z.literal('en'),name:z.string().trim().min(1).max(200)}).strict();
const form=z.object({websiteId:uuid,recordId:uuid,publishedRevisionId:uuid,type:z.literal('form'),locale:z.literal('en')}).strict();
const envelope=z.object({websiteId:uuid,recordId:uuid,revisionId:uuid,type:z.literal('photoExpedition'),locale:z.literal('en'),payload:photoExpeditionSchema}).strict();
const evidence=z.object({specialists:z.array(specialist).max(20),form}).strict();
/** Projection only. Publication-authorized readers must verify current rights, published
 * reference revisions and form readiness. This function never authorizes draft delivery. */
export function projectPublishedExpedition(input:unknown,site:string,path:string,locale:string,references:unknown,today:string){
 const page=envelope.parse(input),resolved=evidence.parse(references),date=z.iso.date().parse(today),d=page.payload;
 if(page.websiteId!==site||locale!=='en'||path!==`/photo-expeditions/${d.slug}`)throw Error('Published expedition identity mismatch.');
 for(const field of ['category','skill','groupSize','duration','description','intro','mentor','heroTitle','heroCopy','price'] as const)if(!d[field].trim())throw Error('Published expedition content is incomplete.');
 if(!d.image||!d.heroImage||d.video||!d.enquiry.form)throw Error('Published expedition delivery is incomplete or unsupported.');
 for(const items of [d.highlights,d.inclusions,d.exclusions,d.body])if(items.some(item=>!item.text.trim()))throw Error('Published expedition contains empty content.');
 if(d.days.some(day=>!day.title.trim()||!day.copy.trim())||d.faqs.some(faq=>!faq.question.trim()||!faq.answer.trim()))throw Error('Published expedition contains empty content.');
 if(resolved.form.websiteId!==site||resolved.form.recordId!==d.enquiry.form.recordId||resolved.form.recordId===page.recordId)throw Error('Published expedition form mismatch.');
 const requested=new Set(d.specialists.map(item=>item.recordId));
 if(resolved.specialists.length!==requested.size||new Set(resolved.specialists.map(item=>item.recordId)).size!==requested.size||resolved.specialists.some(item=>item.websiteId!==site||!requested.has(item.recordId)||item.recordId===page.recordId))throw Error('Published expedition specialist mismatch.');
 const specialists=d.specialists.map(item=>({...resolved.specialists.find(ref=>ref.recordId===item.recordId)!,role:item.role}));
 const departures=[...d.departures].sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
 const {specialists:rawSpecialists,enquiry,video,...content}=d;void rawSpecialists;void video;
 const {form:rawForm,...enquiryCopy}=enquiry;void rawForm;
 // Dates are calendar facts; Full remains Full and preview programmes never become confirmed.
 return {websiteId:page.websiteId,recordId:page.recordId,revisionId:page.revisionId,locale:page.locale,content:{...content,enquiry:enquiryCopy},specialists,form:resolved.form,today:date,upcoming:departures.filter(item=>item.date>=date),earlier:departures.filter(item=>item.date<date)};
}
export type PublishedExpedition=ReturnType<typeof projectPublishedExpedition>;
