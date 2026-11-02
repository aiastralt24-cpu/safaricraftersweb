import {createHash} from 'node:crypto';
import {z} from 'zod';
import {image} from './composition.ts';
import {testimonialSchema} from './testimonials.ts';
const object=z.record(z.string(),z.unknown());
const mappingSchema=z.record(z.string(),z.object({consentEvidence:z.string().trim().min(1).max(5000).optional(),image:image.optional()}).strict());
function canonical(value:unknown):string{if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([key,item])=>JSON.stringify(key)+':'+canonical(item)).join(',')+'}';return JSON.stringify(value)??'null';}
export function sourceDigest(value:unknown){return createHash('sha256').update(canonical(value)).digest('hex');}
export function planTestimonialMigration(input:unknown,mappings:unknown={}){
 const records=z.array(object).max(10000).parse(input),map=mappingSchema.parse(mappings),keys=new Set<string>();
 const candidates=records.map((source,index)=>{
  const digest=sourceDigest(source),sourceKey=`snapshot:${digest}`,mapping=map[sourceKey];
  const issues:{field:string;severity:'error'|'warning';message:string}[]=[];
  const issue=(field:string,message:string,severity:'error'|'warning'='warning')=>issues.push({field,message,severity});
  if(keys.has(sourceKey))issue('source','Duplicate source content requires an explicit migration identity decision.','error');keys.add(sourceKey);
  const read=(key:string)=>{if(source[key]===undefined)return '';if(typeof source[key]!=='string'){issue(key,'Expected source text; no value was coerced.','error');return '';}return source[key] as string;};
  for(const key of ['verified','consented','anonymous'])if(source[key]!==undefined&&typeof source[key]!=='boolean')issue(key,'Expected an explicit source boolean.','error');
  const consented=source.consented===true&&Boolean(mapping?.consentEvidence);
  if(source.consented!==true)issue('consent','Source does not establish publication consent. Draft consent remains pending.');
  if(source.consented===true&&!mapping?.consentEvidence)issue('consent','Legacy consent flag has no evidence reference. Draft consent remains pending.');
  if(source.consented!==true&&mapping?.consentEvidence)issue('consent','Evidence mapping cannot override missing or false source consent. Review the draft manually.');
  if(source.verified!==true)issue('verified','Wording verification is not established by the source.');
  if(source.image!==undefined&&!mapping?.image)issue('image','Original image requires an inspected CMS asset mapping. It is preserved in the source, not dropped silently.');
  if(source.video!==undefined)issue('video','Guest video migration is not supported yet. Original video data is preserved.');
  const known=new Set(['name','quote','role','organization','city','trip','guestType','travelled','route','arranged','verified','consented','anonymous','image','video']);
  const unmapped=Object.keys(source).filter(key=>!known.has(key));
  if(unmapped.length)issue('source',`Unmapped fields retained for review: ${unmapped.join(', ')}`);
  const payload={schemaVersion:1,name:read('name'),quote:read('quote'),role:read('role'),organization:read('organization'),city:read('city'),trip:read('trip'),guestType:read('guestType'),travelled:read('travelled'),route:read('route'),arranged:read('arranged'),anonymous:source.anonymous===true,verified:source.verified===true,consent:{status:consented?'granted':'pending',evidence:consented?mapping!.consentEvidence!:''},...(mapping?.image?{image:mapping.image}:{})};
  const parsed=testimonialSchema.safeParse(payload);
  if(!parsed.success)for(const error of parsed.error.issues)issue(error.path.join('.'),error.message,'error');
  return {sourceIndex:index,sourceKey,sourceDigest:digest,source:structuredClone(source),unmappedFields:unmapped,payload,canSaveDraft:parsed.success&&!issues.some(i=>i.severity==='error'),issues};
 });
 const frequencies=new Map<string,number>();for(const candidate of candidates)frequencies.set(candidate.sourceKey,(frequencies.get(candidate.sourceKey)??0)+1);
 for(const candidate of candidates)if(frequencies.get(candidate.sourceKey)!>1){candidate.canSaveDraft=false;if(!candidate.issues.some(issue=>issue.field==='source'&&issue.severity==='error'))candidate.issues.push({field:'source',severity:'error',message:'Duplicate source content requires an explicit migration identity decision.'});}
 const unusedMappings=Object.keys(map).filter(key=>!keys.has(key));
 return {version:1,operation:'review_only',sourceDigest:sourceDigest(records),count:candidates.length,readyDrafts:candidates.filter(c=>c.canSaveDraft).length,unusedMappings,candidates};
}
