import {z} from 'zod';
import {image} from './composition.ts';
import {destinationSchema,newDestination} from './destinations.ts';
import {reservedDestinationSlugs} from './destination-route-ownership.ts';
import {sourceDigest} from './testimonial-migration.ts';
const object=z.record(z.string(),z.unknown());
const mappingsSchema=z.record(z.string(),z.object({images:z.record(z.string(),image).default({}),references:z.record(z.string(),z.string().uuid()).default({})}).strict());
/** Review-only conversion. No image downloads, guessed record identities or writes. */
export function planDestinationMigration(input:unknown,mappings:unknown={}){
 const records=z.array(object).max(10000).parse(input),maps=mappingsSchema.parse(mappings),usedKeys=new Set<string>();
 const candidates=records.map((source,index)=>{
  const digest=sourceDigest(source),sourceKey=`snapshot:${digest}`,map=maps[sourceKey],used=new Set<string>();usedKeys.add(sourceKey);
  const issues:{field:string;severity:'error'|'warning';message:string}[]=[];
  const issue=(field:string,message:string,severity:'error'|'warning'='error')=>issues.push({field,message,severity});
  const defaults=newDestination(),payload:Record<string,unknown>={...defaults};
  const handled=new Set(['schemaVersion','image','heroImage','gallery','video','journeys','expeditions','pairings','seo','editorial','fieldIntelligence']);
  for(const [key,value]of Object.entries(source))if(!handled.has(key)){
   if(key in defaults)payload[key]=structuredClone(value);
   else issue(key,'Unmapped source field is retained in the original snapshot.');
  }
  if(source.schemaVersion!==undefined)issue('schemaVersion','Expected a legacy source without a schema version.');
  for(const key of ['slug','title','continent','country','status'])if(source[key]===undefined)issue(key,'Required source identity or classification is missing.');
  const mapImage=(value:unknown,path:string)=>{
   if(value===undefined)return undefined;
   if(!value||typeof value!=='object'||Array.isArray(value)){issue(path,'Expected a source image object.');return undefined;}
   if(!map?.images[path]){issue(path,'Map this original image to an inspected CMS image, preserving its alt text, credit and crop decision.');return undefined;}
   used.add(`images:${path}`);return map.images[path];
  };
  for(const key of ['image','heroImage']){const mapped=mapImage(source[key],key);if(mapped)payload[key]=mapped;}
  if(source.gallery!==undefined){if(!Array.isArray(source.gallery))issue('gallery','Expected an image list.');else payload.gallery=source.gallery.map((value,i)=>mapImage(value,`gallery.${i}`)).filter(Boolean);}
  if(source.video!==undefined)issue('video','Video requires a separate migration and delivery review; original data is retained.');
  for(const field of ['journeys','expeditions','pairings']){
   const values=source[field];if(values===undefined)continue;
   if(!Array.isArray(values)){issue(field,'Expected a relationship list.');continue;}
   payload[field]=values.flatMap((value,i)=>{
    const path=`${field}.${i}`,id=map?.references[path];
    const valid=field==='pairings'?object.safeParse(value).success:typeof value==='string'&&Boolean(value.trim());
    if(!valid){issue(path,'Malformed source relationship; no identity was inferred.');return [];}
    if(!id){issue(path,'Explicit CMS record mapping is required; titles and slugs are not assumed to identify a record.');return [];}
    used.add(`references:${path}`);
    if(field!=='pairings')return [{recordId:id}];
    const pairing=value as Record<string,unknown>;
    for(const key of Object.keys(pairing))if(!['slug','title','reason'].includes(key))issue(`${path}.${key}`,'Unmapped pairing field is retained in the original snapshot.');
    return [{recordId:id,title:pairing.title,reason:pairing.reason??''}];
   });
  }
  for(const field of ['editorial','fieldIntelligence'])if(source[field]!==undefined){const parsed=object.safeParse(source[field]);if(!parsed.success)issue(field,'Expected a source object.');else payload[field]={...(defaults[field as 'editorial'|'fieldIntelligence']),...parsed.data};}
  if(source.seo!==undefined){const parsed=object.safeParse(source.seo);if(!parsed.success)issue('seo','Expected a source SEO object.');else{
   const {reviewedAt,socialImage,...rest}=parsed.data;payload.seo={...defaults.seo,...rest};
   if(reviewedAt!==undefined)issue('seo.reviewedAt','Legacy review date retained in the source snapshot; it is not a CMS approval.', 'warning');
   const mapped=mapImage(socialImage,'seo.socialImage');if(mapped)(payload.seo as Record<string,unknown>).socialImage=mapped;
  }}
  if(reservedDestinationSlugs.includes(String(payload.slug)))issue('slug','This source belongs to a specialized country/atlas route and needs that migration contract.');
  if(source.heroImage===undefined)issue('heroImage','Choose an explicit hero image during review; legacy runtime image overrides are not inferred.','warning');
  for(const [kind,values]of Object.entries(map??{}))for(const path of Object.keys(values))if(!used.has(`${kind}:${path}`))issue(path,`Unused ${kind} mapping; verify the source snapshot and field path.`);
  const parsed=destinationSchema.safeParse(payload);if(!parsed.success)for(const item of parsed.error.issues)issue(item.path.join('.'),item.message);
  return {sourceIndex:index,sourceKey,sourceDigest:digest,source:structuredClone(source),payload,issues,canSaveDraft:parsed.success&&!issues.some(item=>item.severity==='error')};
 });
 const slugs=new Map<unknown,number>();for(const c of candidates)slugs.set(c.payload.slug,(slugs.get(c.payload.slug)??0)+1);
 for(const c of candidates)if(slugs.get(c.payload.slug)!>1){c.canSaveDraft=false;c.issues.push({field:'slug',severity:'error',message:'Duplicate source URL requires an explicit migration identity decision.'});}
 return {version:1,operation:'review_only',sourceDigest:sourceDigest(records),count:candidates.length,readyDrafts:candidates.filter(c=>c.canSaveDraft).length,unusedMappings:Object.keys(maps).filter(key=>!usedKeys.has(key)),candidates};
}
