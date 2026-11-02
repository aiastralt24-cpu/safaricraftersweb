import {z} from 'zod';
import {image} from './composition.ts';
import {journalArticleSchema,newJournalArticle} from './journal.ts';
import {sourceDigest} from './testimonial-migration.ts';
const object=z.record(z.string(),z.unknown());
const mappingSchema=z.record(z.string(),z.object({images:z.record(z.string(),image)}).strict());
const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
export function journalMigrationDate(value:unknown){
 if(typeof value!=='string')return null;
 if(z.iso.date().safeParse(value).success)return value;
 const match=/^([A-Z][a-z]+) ([0-9]{1,2}), ([0-9]{4})$/.exec(value);if(!match)return null;
 const month=months.indexOf(match[1])+1;if(!month)return null;
 const date=`${match[3]}-${String(month).padStart(2,'0')}-${match[2].padStart(2,'0')}`;
 return z.iso.date().safeParse(date).success?date:null;
}
/** Read-only migration plan. Source data is retained; no downloads or writes. */
export function planJournalMigration(input:unknown,mappings:unknown={}){
 const records=z.array(object).max(10000).parse(input),maps=mappingSchema.parse(mappings),usedKeys=new Set<string>();
 const candidates=records.map((source,index)=>{
  const digest=sourceDigest(source),sourceKey=`snapshot:${digest}`,map=maps[sourceKey],usedImages=new Set<string>();usedKeys.add(sourceKey);
  const issues:{field:string;severity:'error'|'warning';message:string}[]=[];
  const issue=(field:string,message:string,severity:'error'|'warning'='error')=>issues.push({field,message,severity});
  const defaults=newJournalArticle(),payload:Record<string,unknown>={...defaults};
  const scalars=['slug','title','category','author','readTime','description','quote'];
  const known=new Set([...scalars,'date','body','image','gallery','seo','video']);
  for(const key of Object.keys(source))if(!known.has(key))issue(key,'Unmapped source field is retained in the source snapshot and needs review.');
  for(const key of scalars)if(source[key]!==undefined)payload[key]=structuredClone(source[key]);
  for(const key of ['slug','title','author','category','description','image','gallery','body'])if(source[key]===undefined)issue(key,'Required legacy source field is missing.');
  const date=journalMigrationDate(source.date);if(date){payload.date=date;if(date!==source.date)issue('date',`Calendar date preserved as ${date}; original display wording is retained in the snapshot.`,'warning');}else issue('date','Provide an unambiguous ISO date or full English month date; no date was guessed.');
  if(Array.isArray(source.body))payload.body=source.body.map((text,i)=>({id:`legacy-paragraph-${i+1}`,kind:'paragraph',text}));else issue('body','Expected the legacy paragraph list.');
  const sourceImage=z.object({src:z.string().min(1),alt:z.string(),credit:z.string()}).strict();
  const mapImage=(value:unknown,path:string)=>{
   const parsed=sourceImage.safeParse(value);if(!parsed.success){issue(path,'Source image has missing or unsupported fields; preserve and review its crop/metadata.');return undefined;}
   const mapped=map?.images[path];if(!mapped){issue(path,'Map this image to an inspected CMS asset, retaining its exact alternative text and credit.');return undefined;}
   usedImages.add(path);
   if(mapped.alt!==parsed.data.alt||(mapped.credit??'')!==parsed.data.credit||mapped.decorative)issue(path,'Mapped image must preserve the original alternative text, credit and meaningful purpose.');
   return mapped;
  };
  const listing=mapImage(source.image,'image');if(listing)payload.image=listing;
  const gallery=Array.isArray(source.gallery)?source.gallery:[];if(source.gallery!==undefined&&!Array.isArray(source.gallery))issue('gallery','Expected the legacy gallery list.');
  const originalListing=object.safeParse(source.image),galleryObjects=gallery.map(value=>object.safeParse(value));
  const heroIndex=originalListing.success?galleryObjects.findIndex(value=>value.success&&value.data.src!==originalListing.data.src):-1;
  const heroSourcePath=heroIndex>=0?`gallery.${heroIndex}`:'image';
  const mappedGallery=gallery.map((value,i)=>mapImage(value,`gallery.${i}`));
  const hero=heroIndex>=0?mappedGallery[heroIndex]:listing;if(hero)payload.heroImage=hero;
  const heroSrc=heroIndex>=0&&galleryObjects[heroIndex].success?galleryObjects[heroIndex].data.src:originalListing.success?originalListing.data.src:undefined;
  const visible=galleryObjects.flatMap((value,i)=>value.success&&originalListing.success&&value.data.src!==heroSrc&&value.data.src!==originalListing.data.src?[i]:[]).slice(0,4);
  payload.gallery=visible.map(i=>mappedGallery[i]).filter(Boolean);
  const retainedGalleryPaths=gallery.map((_,i)=>`gallery.${i}`).filter((_,i)=>!visible.includes(i)&&i!==heroIndex);
  if(retainedGalleryPaths.length)issue('gallery','The current website hides some gallery images. Their original descriptors and mappings remain in this migration review; the proposed gallery matches the current visible subset.','warning');
  if(source.video!==undefined)issue('video','Video migration and delivery require a separate contract. Do not drop the existing video.');
  if(source.seo!==undefined){const parsed=object.safeParse(source.seo);if(!parsed.success)issue('seo','Expected a source SEO object.');else{
   const {reviewedAt,socialImage,...rest}=parsed.data;payload.seo={...defaults.seo,...rest};
   if(reviewedAt!==undefined)issue('seo.reviewedAt','Legacy review date is retained in the source; it is not a CMS approval.','warning');
   if(socialImage!==undefined){const mapped=mapImage(socialImage,'seo.socialImage');if(mapped)(payload.seo as Record<string,unknown>).socialImage=mapped;}
  }}
  for(const path of Object.keys(map?.images??{}))if(!usedImages.has(path))issue(path,'Unused image mapping; verify the source digest and field path.');
  const parsed=journalArticleSchema.safeParse(payload);if(!parsed.success)for(const error of parsed.error.issues)issue(error.path.join('.'),error.message);
  return {sourceIndex:index,sourceKey,sourceDigest:digest,source:structuredClone(source),mappings:structuredClone(map??{images:{}}),heroSourcePath,retainedGalleryPaths,payload,issues,canSaveDraft:parsed.success&&!issues.some(i=>i.severity==='error')};
 });
 const slugs=new Map<unknown,number>();for(const candidate of candidates)slugs.set(candidate.payload.slug,(slugs.get(candidate.payload.slug)??0)+1);
 for(const candidate of candidates)if(slugs.get(candidate.payload.slug)!>1){candidate.canSaveDraft=false;candidate.issues.push({field:'slug',severity:'error',message:'Duplicate source URL requires an explicit migration identity decision.'});}
 const unusedMappings=Object.keys(maps).filter(key=>!usedKeys.has(key));
 return {version:1,operation:'review_only',sourceDigest:sourceDigest(records),count:candidates.length,readyDrafts:candidates.filter(c=>c.canSaveDraft).length,unusedMappings,candidates};
}
