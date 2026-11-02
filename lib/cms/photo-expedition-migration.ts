import {z} from 'zod';
import {expeditionMigrationMappingsSchema} from './photo-expedition-migration-contract.ts';
import {expeditionDepartureSchema,newPhotoExpedition,photoExpeditionSchema} from './photo-expeditions.ts';
import {sourceDigest} from './testimonial-migration.ts';
const object=z.record(z.string(),z.unknown());
/** Pure review planner: no writes, downloads, inferred identities or publication. */
export function planPhotoExpeditionMigration(input:unknown,mappings:unknown={}){
 const records=z.array(object).max(10000).parse(input),maps=expeditionMigrationMappingsSchema.parse(mappings),keys=new Set<string>();
 const candidates=records.map((source,sourceIndex)=>{
  const digest=sourceDigest(source),sourceKey=`snapshot:${digest}`,mapping=maps[sourceKey];keys.add(sourceKey);
  const issues:{field:string;severity:'error'|'warning';message:string}[]=[];
  const issue=(field:string,message:string,severity:'error'|'warning'='error')=>issues.push({field,message,severity});
  const defaults=newPhotoExpedition(),payload:Record<string,unknown>={...defaults},used=new Set<string>();
  const direct=['slug','title','geography','availabilityReviewedAt','category','skill','groupSize','duration','bestMonths','species','equipment','description','intro','mentor','guide','price','route','heroTitle','heroCopy'];
  const handled=new Set([...direct,'date','publicationStatus','image','gallery','video','departures','days','highlights','inclusions','exclusions','body','faqs','cancellationPolicy','seo','enquiryDeparture']);
  for(const key of Object.keys(source))if(!handled.has(key))issue(key,'Unmapped field retained in the original snapshot; resolve before importing.');
  for(const key of direct)if(source[key]!==undefined){
   payload[key]=structuredClone(source[key]);
   const fieldSchema=photoExpeditionSchema.shape[key as keyof typeof photoExpeditionSchema.shape];
   if(!fieldSchema.safeParse(source[key]).success)issue(key,'Source value does not satisfy the expedition field contract.');
  }
  if(source.cancellationPolicy!==undefined&&!photoExpeditionSchema.shape.booking.shape.cancellationPolicy.safeParse(source.cancellationPolicy).success)issue('cancellationPolicy','Expected bounded source cancellation-policy text.');
  for(const key of ['slug','title','geography'])if(source[key]===undefined)issue(key,'Source identity/classification is required; no default is inferred.');
  if(source.date!==undefined)payload.dateLabel=source.date;
  const list=(field:string,convert:(value:unknown,index:number)=>unknown)=>{
   if(source[field]===undefined)return;
   if(!Array.isArray(source[field])){issue(field,'Expected a source list.');return;}
   payload[field]=source[field].map(convert);
  };
  for(const field of ['highlights','inclusions','exclusions','body'])list(field,(text,index)=>({id:`${field}-${index+1}`,text}));
  for(const field of ['departures','days','faqs'])list(field,(value,index)=>{
   const parsed=object.safeParse(value);if(!parsed.success){issue(`${field}.${index}`,'Expected an object.');return value;}
   if('id' in parsed.data)issue(`${field}.${index}.id`,'Expected legacy data without an item ID; retain this identity for explicit review.');
   const fallback=field==='days'?{label:'',stay:''}:field==='departures'?{availability:''}:{};
   return {...fallback,...parsed.data,id:`${field}-${index+1}`};
  });
  // Rendered booking notes require explicit, source-digest-bound editorial review.
  // Do not infer a future booking year from dates or silently discard the source.
  const notes=mapping?.departureHomepageNotes??{},usedNotes=new Set<string>();
  if(source.enquiryDeparture!==undefined){
   if(typeof source.enquiryDeparture!=='string'||!source.enquiryDeparture.trim()||source.enquiryDeparture.length>200)issue('enquiryDeparture','Expected bounded original booking enquiry wording.');
   const full=Array.isArray(payload.departures)?payload.departures.filter(item=>item?.status==='Full'):[];
   if(!full.length)issue('enquiryDeparture','Booking enquiry wording has no full departure to bind; review the original source.');
   for(const item of full as {id:string}[])if(!notes[item.id])issue(`departures.${item.id}.homepageNote`,'Explicit reviewed homepage booking wording is required for the source booking enquiry message.');
  }
  if(Array.isArray(payload.departures))for(const item of payload.departures){
   if(!item||typeof item!=='object')continue;
   const note=notes[item.id];if(!note)continue;usedNotes.add(item.id);
   if(!expeditionDepartureSchema.safeParse(item).success){issue(`departures.${item.id}`,'Invalid source departure cannot be replaced by reviewed homepage wording.');continue;}
   if(note.date!==item.date){issue(`departures.${item.id}.homepageNote`,'Reviewed homepage booking note date does not match this source departure.');continue;}
   item.homepageNote=note.text;
  }
  for(const key of Object.keys(notes))if(!usedNotes.has(key))issue(`departureHomepageNotes.${key}`,'Unused homepage booking note mapping; verify the source departure identity.');
  const mapImage=(value:unknown,path:string)=>{
   if(!object.safeParse(value).success){issue(path,'Expected an original image object.');return undefined;}
   const mapped=mapping?.images[path];if(!mapped){issue(path,'Explicit inspected image mapping is required, including contextual alt text and credit.');return undefined;}
   used.add(path);return structuredClone(mapped);
  };
  if(source.image===undefined)issue('image','Listing image is missing.');else payload.image=mapImage(source.image,'image');
  list('gallery',(value,index)=>({id:`gallery-${index+1}`,image:mapImage(value,`gallery.${index}`)}));
  if(source.video!==undefined)issue('video','Film migration is not implemented; retain and review the original before importing.');
  if(source.seo!==undefined){const parsed=object.safeParse(source.seo);if(!parsed.success)issue('seo','Expected a source SEO object.');else{
   const {reviewedAt,socialImage,...rest}=parsed.data;payload.seo={...defaults.seo,...rest};
   if(reviewedAt!==undefined)issue('seo.reviewedAt','Source review date is retained; it does not establish CMS approval.','warning');
   if(socialImage!==undefined)(payload.seo as Record<string,unknown>).socialImage=mapImage(socialImage,'seo.socialImage');
  }}
  if(!mapping)issue('mapping','Review programme status, specialist identities, displayed hero/gallery, generated FAQs, booking copy and enquiry form before creating a draft.');
  else{
   const {additionalFaqs,reviewedOn,reviewNotes,...display}=mapping.display;
   // Validate source collections before an explicitly reviewed display replacement.
   const sourceGallery=photoExpeditionSchema.shape.gallery.safeParse(payload.gallery);
   if(!sourceGallery.success)for(const item of sourceGallery.error.issues)issue(`gallery.${item.path.join('.')}`,item.message);
   Object.assign(payload,structuredClone(display),{programmeStatus:mapping.programmeStatus,specialists:structuredClone(mapping.specialists)});
   if(Array.isArray(payload.faqs))payload.faqs=[...payload.faqs,...structuredClone(additionalFaqs)];
   for(const path of Object.keys(mapping.images))if(!used.has(path))issue(path,'Unused image mapping; verify the source snapshot/path.');
   issue('display','Reviewed display choices are fixed copy. Date-dependent FAQ answers require editorial review as departures change.','warning');
  }
  if(source.publicationStatus!==undefined&&!['preview','published'].includes(String(source.publicationStatus)))issue('publicationStatus','Unsupported legacy status requires review.');
  const parsed=photoExpeditionSchema.safeParse(payload);if(!parsed.success)for(const item of parsed.error.issues)issue(item.path.join('.'),item.message);
  return {sourceIndex,sourceKey,sourceDigest:digest,source:structuredClone(source),mapping:mapping?structuredClone(mapping):null,payload,issues,canSaveDraft:parsed.success&&!issues.some(item=>item.severity==='error')};
 });
 const counts=new Map<unknown,number>();for(const item of candidates)counts.set(item.payload.slug,(counts.get(item.payload.slug)??0)+1);
 for(const item of candidates)if(counts.get(item.payload.slug)!>1){item.canSaveDraft=false;item.issues.push({field:'slug',severity:'error',message:'Duplicate source URL requires an explicit identity decision.'});}
 return {version:1,operation:'review_only',sourceDigest:sourceDigest(records),count:candidates.length,readyDrafts:candidates.filter(item=>item.canSaveDraft).length,unusedMappings:Object.keys(maps).filter(key=>!keys.has(key)),candidates};
}
