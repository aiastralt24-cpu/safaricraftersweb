import {expeditionReferenceFindings} from './expedition-reference-status.ts';
import type {ExpeditionReferenceStatus} from './expedition-reference-status.ts';
import {z} from 'zod';
import {image,link} from './composition.ts';
import {specialistSchema} from './specialists.ts';
import {newPageSeo,pageSeoSchema,pageSeoFindings} from './page-seo.ts';
import type {ContentFinding,MediaStatus,ValidationRecord} from './content-validation.ts';
const id=z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/),short=z.string().max(200),copy=z.string().max(10000);
const unique=(items:{id:string}[])=>new Set(items.map(item=>item.id)).size===items.length;
const lines=z.array(z.object({id,text:copy}).strict()).max(100).refine(unique,'Each item needs a unique ID.');
export const expeditionDepartureSchema=z.object({id,date:z.iso.date(),endDate:z.iso.date().optional(),status:z.enum(['New','Filling fast','Full','Available']),availability:short,homepageNote:short.optional()}).strict().refine(value=>!value.endDate||value.endDate>=value.date,'Departure end date must not precede its start.');
export const expeditionLabelsSchema=z.object({
 heroEyebrow:short,introductionHeading:short,highlightsHeading:short,itineraryHeading:short,inclusionsHeading:short,exclusionsHeading:short,
 duration:short,route:short,skill:short,groupSize:short,season:short,species:short,price:short,equipment:short,
 departuresHeading:short,emptyDepartures:copy,departureAction:short,previewNote:copy,
 galleryEyebrow:short,galleryHeading:short,galleryCopy:copy,galleryLabel:short,
 faqEyebrow:short,faqHeading:short,faqCopy:copy,
}).strict();
export const photoExpeditionSchema=z.object({
 schemaVersion:z.literal(1),slug:z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),title:short.trim().min(1),
 geography:z.enum(['India','International']),programmeStatus:z.enum(['preview','confirmed']),availabilityReviewedAt:z.union([z.literal(''),z.iso.date()]),
 category:short,skill:short,groupSize:short,duration:short,bestMonths:short,species:copy,equipment:copy,description:z.string().max(2000),intro:z.string().max(50000),
 mentor:short,guide:short,dateLabel:short,price:short,route:short,heroTitle:short,heroCopy:z.string().max(2000),
 image:image.optional(),heroImage:image.optional(),mobileHeroImage:image.optional(),gallery:z.array(z.object({id,image}).strict()).max(100).refine(unique,'Gallery IDs must be unique.'),video:specialistSchema.shape.video,
 departures:z.array(expeditionDepartureSchema).max(200).refine(unique,'Departure IDs must be unique.'),
 days:z.array(z.object({id,label:short,title:short,copy,stay:short}).strict()).max(100).refine(unique,'Itinerary IDs must be unique.'),
 highlights:lines,inclusions:lines,exclusions:lines,body:lines,
 faqs:z.array(z.object({id,question:z.string().max(500),answer:copy}).strict()).max(100).refine(unique,'FAQ IDs must be unique.'),
 specialists:z.array(z.object({recordId:z.string().uuid(),role:z.enum(['mentor','guide'])}).strict()).max(20).refine(items=>new Set(items.map(item=>`${item.role}:${item.recordId}`)).size===items.length,'Select each specialist once per role.'),
 labels:expeditionLabelsSchema,
 booking:z.object({eyebrow:short,heading:short,introduction:copy,paymentHeading:short,cancellationPolicy:copy,paymentNote:copy,priceHeading:short,priceCopy:copy,button:link}).strict(),
 enquiry:z.object({heading:short,introduction:copy,form:z.object({recordId:z.string().uuid()}).strict().optional(),specialistName:short}).strict(),
 seo:pageSeoSchema,
}).strict();
export type PhotoExpeditionDraft=z.infer<typeof photoExpeditionSchema>;
export function newPhotoExpedition():PhotoExpeditionDraft{return {
 schemaVersion:1,slug:'new-expedition',title:'New photography expedition',geography:'India',programmeStatus:'preview',availabilityReviewedAt:'',category:'',skill:'',groupSize:'',duration:'',bestMonths:'',species:'',equipment:'',description:'',intro:'',mentor:'',guide:'',dateLabel:'',price:'',route:'',heroTitle:'',heroCopy:'',gallery:[],departures:[],days:[],highlights:[],inclusions:[],exclusions:[],body:[],faqs:[],specialists:[],seo:newPageSeo(),
 labels:{heroEyebrow:'Photography Tours',introductionHeading:'Photographer-led',highlightsHeading:'Highlights',itineraryHeading:'Expedition rhythm',inclusionsHeading:'Inclusions',exclusionsHeading:'Exclusions',duration:'Duration',route:'Route',skill:'Skill level',groupSize:'Group size',season:'Season',species:'Species focus',price:'Tour price',equipment:'Camera equipment',departuresHeading:'Upcoming departures',emptyDepartures:'New dates being finalised. Enquire to register your interest.',departureAction:'Enquire about departures',previewNote:'',galleryEyebrow:'Field notes in photographs',galleryHeading:'From the field.',galleryCopy:'',galleryLabel:'Photographic journal',faqEyebrow:'Photography tour questions',faqHeading:'Before you set out.',faqCopy:''},
 booking:{eyebrow:'Before you book',heading:'Booking & payment details.',introduction:'',paymentHeading:'Payment schedule and cancellation conditions',cancellationPolicy:'',paymentNote:'',priceHeading:'What does the price cover?',priceCopy:'',button:{label:'Request booking details',href:'/contact',newWindow:false}},
 enquiry:{heading:'Enquire about this expedition',introduction:'',specialistName:''},
};}
export function validatePhotoExpedition(record:ValidationRecord,mediaStatus?:MediaStatus[],referenceStatus?:ExpeditionReferenceStatus[]){
 const findings:ContentFinding[]=[];const error=(field:string,code:string,message:string)=>findings.push({field,code,message,severity:'error'});
 const parsed=photoExpeditionSchema.safeParse(record.payload);
 if(!parsed.success)for(const issue of parsed.error.issues)error(issue.path.join('.'),'expedition_field',issue.message);
 if((record.locale??'en')!=='en')error('locale','expedition_locale_not_ready','Localized expedition delivery is not connected yet.');
 if(parsed.success){
  const value=parsed.data;findings.push(...pageSeoFindings(value.seo));
  if(record.path!==`/photo-expeditions/${value.slug}`)error('slug','path_mismatch','The saved expedition URL must match its slug.');
  for(const field of ['category','skill','groupSize','duration','description','intro','mentor','heroTitle','heroCopy','price'] as const)if(!value[field].trim())error(field,'expedition_required','Complete this field before preparing the expedition for publication.');
  if(!value.image||!value.heroImage)error('image','expedition_images_required','Choose explicit listing and hero images.');
  const inspect=(input:unknown,path:string)=>{if(Array.isArray(input)){input.forEach((item,index)=>inspect(item,`${path}.${index}`));return;}if(!input||typeof input!=='object')return;for(const [key,item]of Object.entries(input)){if(key==='assetId'){const evidence=mediaStatus?.filter(asset=>asset.assetId===item);if(evidence?.length!==1||!evidence[0].available)error(`${path}.assetId`,'asset_verification_required','Choose inspected media with current approved rights for this website.');}else inspect(item,path?`${path}.${key}`:key);}};
  inspect(value,'');
  for(const field of ['highlights','inclusions','exclusions','body'] as const)value[field].forEach((item,index)=>{if(!item.text.trim())error(`${field}.${index}.text`,'expedition_required','Complete or remove this empty item.');});
  value.days.forEach((day,index)=>{for(const field of ['title','copy'] as const)if(!day[field].trim())error(`days.${index}.${field}`,'expedition_required','Complete each itinerary day.');});
  value.faqs.forEach((faq,index)=>{for(const field of ['question','answer'] as const)if(!faq[field].trim())error(`faqs.${index}.${field}`,'expedition_required','Complete each question and answer.');});
  if(value.video)error('video','expedition_film_not_ready','Expedition film delivery is not connected yet.');
  findings.push(...expeditionReferenceFindings(record,value,referenceStatus));
  if(!value.enquiry.form)error('enquiry.form','expedition_form_required','Select a published expedition enquiry form.');

 }
 return {validatorVersion:'expedition-1',contentChecksPass:!findings.some(f=>f.severity==='error'),findings};
}
