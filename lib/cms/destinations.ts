import {z} from 'zod';
import {reservedDestinationSlugs} from './destination-route-ownership.ts';
import {image,safeHref} from './composition.ts';
import {newPageSeo,pageSeoSchema} from './page-seo.ts';
const short=z.string().max(200),copy=z.string().max(10000);
const reference=z.object({recordId:z.string().uuid()}).strict();
const references=z.array(reference).max(100).refine(values=>new Set(values.map(value=>value.recordId.toLowerCase())).size===values.length,'Remove duplicate references.');
const textList=z.array(z.string().trim().min(1).max(1000)).max(50);
const assetId=z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/);
const source=z.object({title:short.min(1),url:safeHref.refine(value=>value.startsWith('https://'),'Use an HTTPS source URL.'),publisher:short,accessedAt:z.iso.date()}).strict();
export const destinationSchema=z.object({
 schemaVersion:z.literal(1),slug:z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),title:short.trim().min(1),
 category:short,continent:z.enum(['India','Africa','Americas','Arctic']),country:short,parentRegion:short,status:z.enum(['rich','concierge']),
 bestFor:textList,planningNote:copy,region:short,bestMonths:short,wildlife:copy,photography:copy,description:z.string().max(2000),homepageCaption:z.string().max(1000),homepageMeta:short,intro:copy,
 image:image.optional(),heroImage:image.optional(),gallery:z.array(image).max(50),
 video:z.object({assetId,poster:image,title:short.min(1),caption:copy,transcript:copy,captionsAssetId:assetId.optional()}).strict().optional(),
 highlights:textList,journeys:references,expeditions:references,habitat:copy,idealStay:short,gateway:short,access:copy,safariRhythm:copy,
 fieldIntelligence:z.object({airport:short,transfer:copy,idealStay:short,safariRhythm:copy,accessNote:copy}).strict(),
 pairings:z.array(z.object({recordId:z.string().uuid(),title:short.min(1),reason:copy}).strict()).max(50)
  .refine(values=>new Set(values.map(value=>value.recordId.toLowerCase())).size===values.length,'Remove duplicate destination pairings.'),
 faqs:z.array(z.object({question:z.string().trim().min(1).max(500),answer:z.string().trim().min(1).max(10000)}).strict()).max(50),
 seo:pageSeoSchema,sources:z.array(source).max(100),
 editorial:z.object({openingHeadline:short,landscapeHeadline:short,wildlifeHeadline:short,landscapeCopy:copy,wildlifeCopy:copy,factsLabel:short,relatedLabel:short,relatedHeadline:short,relatedIntro:copy,plannerHeadline:short,plannerCopy:copy,plannerCta:short,scoop:z.array(z.object({title:short.min(1),blurb:z.string().max(1000),body:copy}).strict()).max(50)}).strict(),
}).strict();
export type DestinationDraft=z.infer<typeof destinationSchema>;
export function newDestination():DestinationDraft{return {schemaVersion:1,slug:'new-destination',title:'New destination',category:'',continent:'India',country:'',parentRegion:'',status:'rich',bestFor:[],planningNote:'',region:'',bestMonths:'',wildlife:'',photography:'',description:'',homepageCaption:'',homepageMeta:'',intro:'',gallery:[],highlights:[],journeys:[],expeditions:[],habitat:'',idealStay:'',gateway:'',access:'',safariRhythm:'',fieldIntelligence:{airport:'',transfer:'',idealStay:'',safariRhythm:'',accessNote:''},pairings:[],faqs:[],seo:newPageSeo(),sources:[],editorial:{openingHeadline:'',landscapeHeadline:'',wildlifeHeadline:'',landscapeCopy:'',wildlifeCopy:'',factsLabel:'',relatedLabel:'',relatedHeadline:'',relatedIntro:'',plannerHeadline:'',plannerCopy:'',plannerCta:'',scoop:[]}};}
/** Shared stored-revision checks. Only trusted server execution can issue a publication receipt. */
export type DestinationReferenceStatus={recordId:string;type:'journey'|'photoExpedition'|'destination';available:boolean;published?:boolean;locale?:string};
export function validateDestinationDraft(record:{id?:string;locale?:string;path:string|null;payload:unknown},mediaStatus?:{assetId:string;available:boolean}[],referenceStatus?:DestinationReferenceStatus[]){
 const parsed=destinationSchema.safeParse(record.payload);
 const findings:{field:string;severity:'error'|'warning';code:string;message:string}[]=parsed.success?[]:parsed.error.issues.map(issue=>({field:issue.path.join('.'),severity:'error',code:'destination_field',message:issue.message}));
 if(parsed.success){
  if(record.path!==`/destinations/${parsed.data.slug}`)findings.push({field:'slug',severity:'error',code:'path_mismatch',message:'The destination slug must match its saved URL.'});
  for(const field of ['country','description','intro','bestMonths'] as const)if(!parsed.data[field].trim())findings.push({field,severity:'error',code:'incomplete_destination',message:'Complete this field before preparing the destination for publication.'});
  const d=parsed.data;
  if(reservedDestinationSlugs.includes(d.slug))findings.push({field:'slug',severity:'error',code:'destination_reserved_route',message:'This URL belongs to a country or regional atlas page. Choose a distinct URL for this individual destination.'});
  if((record.locale??'en')!=='en')findings.push({field:'locale',severity:'error',code:'destination_locale_not_ready',message:'Public destination routes currently support English only. Keep other languages as drafts until localized routes are connected.'});
  if(d.expeditions.length)findings.push({field:'expeditions',severity:'error',code:'expedition_delivery_not_ready',message:'Independent photography expedition delivery must be connected before publishing these related links.'});
  if(!d.image||!d.heroImage)findings.push({field:'image',severity:'error',code:'destination_images_required',message:'Choose both listing and hero images before publication.'});
  const inspect=(value:unknown,path:string)=>{
   if(Array.isArray(value)){value.forEach((item,index)=>inspect(item,`${path}.${index}`));return;}
   if(!value||typeof value!=='object')return;
   for(const [key,item]of Object.entries(value))if(key==='assetId'){
    if(!mediaStatus?.some(asset=>asset.assetId===item&&asset.available))findings.push({field:`${path}.assetId`,severity:'error',code:'asset_verification_required',message:'Select an inspected image with current approved rights for this website.'});
   }else inspect(item,path?`${path}.${key}`:key);
  };
  inspect(d,'');
  if(d.video)findings.push({field:'video',severity:'error',code:'video_delivery_not_ready',message:'Video inspection and delivery must be connected before publishing this film.'});
  const groups=[['journeys','journey'],['expeditions','photoExpedition'],['pairings','destination']] as const;
  for(const [field,type]of groups)d[field].forEach((reference,index)=>{
   const status=referenceStatus?.find(item=>item.recordId===reference.recordId&&item.type===type);
   if(reference.recordId===record.id)findings.push({field:`${field}.${index}`,severity:'error',code:'self_reference',message:'A destination cannot pair with itself.'});
   if(!status?.available)findings.push({field:`${field}.${index}`,severity:'error',code:'reference_unavailable',message:'This related record is unavailable or has not been verified for this website.'});
   else if(!status.published||status.locale!==(record.locale??'en'))findings.push({field:`${field}.${index}`,severity:'error',code:'reference_not_publishable',message:'Choose a published related record in the same language.'});
  });

 }
 return {validatorVersion:'destination-1',contentChecksPass:!findings.some(f=>f.severity==='error'),findings};
}
