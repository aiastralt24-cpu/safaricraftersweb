import {z} from 'zod';
import {sourceDigest} from './testimonial-migration.ts';
import {specialistSchema} from './specialists.ts';
const sourceRecord=z.record(z.string(),z.unknown());
const sourceSchema=z.object({specialists:z.array(sourceRecord).max(1000),journeys:z.array(sourceRecord).max(10000),expeditions:z.array(sourceRecord).max(10000)}).strict();
const referenceMap=z.record(z.string(),z.string().uuid());
const mappingSchema=z.object({profiles:z.record(z.string(),z.object({image:specialistSchema.shape.image,video:specialistSchema.shape.video,kind:specialistSchema.shape.kind.optional(),visible:z.boolean().optional(),planning:specialistSchema.shape.planning.optional()}).strict()).default({}),journeys:referenceMap.default({}),expeditions:referenceMap.default({}),aliases:z.record(z.string().min(1).max(200),z.string().regex(/^specialist_[a-f0-9]{64}$/)).default({})}).strict();
/** Review only: source relationships are explicit and no API/storage write occurs. */
export function planSpecialistMigration(input:unknown,mappings:unknown={}){
 const snapshot=sourceSchema.parse(input),map=mappingSchema.parse(mappings);
 const names=new Map<string,number>();for(const source of snapshot.specialists)if(typeof source.name==='string')names.set(source.name,(names.get(source.name)??0)+1);
 const sourceKeys=new Set(snapshot.specialists.map(source=>`specialist_${sourceDigest(source)}`));
 z.record(z.string(),z.string()).superRefine((aliases,context)=>{for(const [label,target]of Object.entries(aliases)){
  if(!label.trim()||names.has(label))context.addIssue({code:'custom',path:[label],message:'An alias must be a nonblank unmatched source name, not an existing profile name.'});
  if(!sourceKeys.has(target))context.addIssue({code:'custom',path:[label],message:'Choose a profile from this source snapshot.'});
 }}).parse(map.aliases);
 const usedAliases=new Set<string>();
 const matches=(value:unknown,name:string,key:string)=>{if(typeof value!=='string')return false;if(value===name)return true;if(Object.hasOwn(map.aliases,value)&&map.aliases[value]===key){usedAliases.add(value);return true;}return false;};
 const slugCounts={journeys:new Map<string,number>(),expeditions:new Map<string,number>()};
 for(const kind of ['journeys','expeditions'] as const)for(const item of snapshot[kind])if(typeof item.slug==='string')slugCounts[kind].set(item.slug,(slugCounts[kind].get(item.slug)??0)+1);
 const unmatchedAssignments=(['journeys','expeditions'] as const).flatMap(collection=>snapshot[collection].flatMap((source,index)=>(collection==='journeys'?['specialist']:['mentor','guide']).flatMap(field=>{const name=source[field];return name!==undefined&&name!==''&&(typeof name!=='string'||(!names.has(name)&&!Object.hasOwn(map.aliases,name)))?[{collection,sourceIndex:index,slug:typeof source.slug==='string'?source.slug:null,field,value:structuredClone(name)}]:[];})));
 const usedProfiles=new Set<string>(),usedJourneys=new Set<string>(),usedExpeditions=new Set<string>();
 const candidates=snapshot.specialists.map((source,index)=>{
  const digest=sourceDigest(source),sourceKey=`specialist_${digest}`,mapping=map.profiles[sourceKey];usedProfiles.add(sourceKey);
  const issues:{field:string;severity:'error'|'warning';message:string}[]=[];
  const issue=(field:string,message:string,severity:'error'|'warning'='error')=>issues.push({field,message,severity});
  const read=(key:string)=>{if(source[key]===undefined)return '';if(typeof source[key]!=='string'){issue(key,'Expected source text; no value was coerced.');return '';}return source[key] as string;};
  const name=read('name');if((names.get(name)??0)>1)issue('name','Duplicate source names make legacy trip relationships ambiguous. Resolve them before migration.');
  const known=new Set(['name','role','expertise','bio','moment','image','video']);const unmappedFields=Object.keys(source).filter(key=>!known.has(key));
  if(unmappedFields.length)issue('source',`Unmapped fields retained for review: ${unmappedFields.join(', ')}`,'warning');
  if(!mapping?.image)issue('image','Map the original portrait to an inspected CMS image before applying this migration.');
  if(source.video!==undefined&&!mapping?.video)issue('video','Original film data requires an explicit film, poster and captions mapping. It is retained in the source.');
  const relatedSources:{journeys:Record<string,unknown>[];expeditions:Record<string,unknown>[]}={journeys:[],expeditions:[]};
  const refs=(kind:'journeys'|'expeditions')=>{
   const related=snapshot[kind].filter(item=>name!==''&&(kind==='journeys'?matches(item.specialist,name,sourceKey):[item.mentor,item.guide].map(value=>matches(value,name,sourceKey)).includes(true)));relatedSources[kind]=structuredClone(related);
   const seen=new Set<string>(),result:{recordId:string}[]=[];
   for(const [row,item] of related.entries()){
    if(typeof item.slug!=='string'||!item.slug.trim()){issue(`${kind}.${row}`,'Related source trip has no usable slug.');continue;}
    const duplicates=slugCounts[kind].get(item.slug)??0;if(duplicates>1){issue(`${kind}.${row}`,'Related source slug is duplicated. Resolve its identity first.');continue;}
    const id=map[kind][item.slug];(kind==='journeys'?usedJourneys:usedExpeditions).add(item.slug);
    if(!id){issue(`${kind}.${row}`,`Map the related ${kind==='journeys'?'journey':'expedition'} “${item.slug}” to its CMS record.`);continue;}
    if(seen.has(id)){issue(`${kind}.${row}`,'Different source trips map to the same CMS record.');continue;}seen.add(id);result.push({recordId:id});
   }
   return result;
  };
  // Preserve the existing directory's explicit exclusions; these are migration rules, not inferred biographies.
  const firstName=name.split(' ')[0];
  const payload={schemaVersion:1,name,role:read('role'),expertise:read('expertise'),bio:read('bio'),moment:read('moment'),kind:mapping?.kind??(name==='Safari Crafters Field Team'?'team':'person'),visible:mapping?.visible??name!=='Kairav Engineer',sortOrder:index,
   planning:mapping?.planning??{label:`Plan with ${firstName}`,enquiryName:firstName},journeys:refs('journeys'),expeditions:refs('expeditions'),...(mapping?.image?{image:mapping.image}:{}),...(mapping?.video?{video:mapping.video}:{})};
  const parsed=specialistSchema.safeParse(payload);if(!parsed.success)for(const error of parsed.error.issues)issue(error.path.join('.'),error.message);
  return {sourceIndex:index,sourceKey,sourceDigest:digest,source:structuredClone(source),relatedSources,unmappedFields,payload,issues,canSaveDraft:parsed.success&&!issues.some(i=>i.severity==='error')};
 });
 return {version:1,operation:'review_only',sourceDigest:sourceDigest(snapshot),count:candidates.length,unmatchedAssignments,readyDrafts:candidates.filter(candidate=>candidate.canSaveDraft).length,candidates,
  unusedMappings:{aliases:Object.keys(map.aliases).filter(key=>!usedAliases.has(key)),profiles:Object.keys(map.profiles).filter(key=>!usedProfiles.has(key)),journeys:Object.keys(map.journeys).filter(key=>!usedJourneys.has(key)),expeditions:Object.keys(map.expeditions).filter(key=>!usedExpeditions.has(key))}};
}
