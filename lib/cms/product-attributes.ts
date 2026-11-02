import {z} from 'zod';
import type {ContentFinding} from './content-validation.ts';
export const productKey=z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/);
export const productRegion=z.object({countryCode:z.string().regex(/^[A-Z]{2}$/),region:z.string().trim().max(200)}).strict();
export const regionKey=(region:z.infer<typeof productRegion>|null)=>region?`${region.countryCode}:${region.region.toLowerCase()}`:'global';
const distinct=(values:string[])=>new Set(values).size===values.length;
export const productAttributeSchema=z.object({
 id:productKey,label:z.string().trim().min(1).max(200),valueType:z.enum(['text','number','boolean','choice']),unit:z.string().trim().max(80),
 allowedValues:z.array(z.string().trim().min(1).max(200)).max(100),required:z.boolean(),allowNotApplicable:z.boolean(),position:z.number().int().min(0).max(999),
 filterEligible:z.boolean(),comparisonEligible:z.boolean(),regions:z.array(productRegion).max(100),
}).strict().superRefine((value,ctx)=>{
 if(!distinct(value.allowedValues.map(v=>v.toLowerCase())))ctx.addIssue({code:'custom',path:['allowedValues'],message:'Use distinct allowed values.'});
 if(value.valueType==='choice'?value.allowedValues.length===0:value.allowedValues.length!==0)ctx.addIssue({code:'custom',path:['allowedValues'],message:'Only choice attributes have allowed values, and need at least one.'});
 if(value.valueType!=='number'&&value.unit)ctx.addIssue({code:'custom',path:['unit'],message:'Units belong to numeric attributes.'});
 if(!distinct(value.regions.map(regionKey)))ctx.addIssue({code:'custom',path:['regions'],message:'Use each applicability region once.'});
});
export const productAttributeGroups=z.array(z.object({id:productKey,title:z.string().trim().min(1).max(200),position:z.number().int().min(0).max(999),attributes:z.array(productAttributeSchema).max(100)}).strict()).max(20).superRefine((groups,ctx)=>{
 for(const [field,values] of [['id',groups.map(g=>g.id)],['position',groups.map(g=>String(g.position))]] as const)if(!distinct([...values]))ctx.addIssue({code:'custom',message:`Each group needs a unique ${field}.`});
 if(!distinct(groups.flatMap(g=>g.attributes.map(a=>a.id))))ctx.addIssue({code:'custom',message:'Attribute identities must be unique across all groups.'});
 groups.forEach((g,i)=>{if(!distinct(g.attributes.map(a=>String(a.position))))ctx.addIssue({code:'custom',path:[i,'attributes'],message:'Attribute display positions must be unique within a group.'});});
});
export const productSpecificationValue=z.discriminatedUnion('state',[
 z.object({state:z.literal('known'),value:z.union([z.string().trim().min(1).max(2000),z.number().finite(),z.boolean()])}).strict(),
 z.object({state:z.literal('blank')}).strict(),z.object({state:z.literal('unknown')}).strict(),
 z.object({state:z.literal('notApplicable'),reason:z.string().trim().min(1).max(1000)}).strict(),
]);
export const productSpecifications=z.array(z.object({attributeId:productKey,region:productRegion.nullable(),value:productSpecificationValue}).strict()).max(500).refine(rows=>distinct(rows.map(row=>`${row.attributeId}/${regionKey(row.region)}`)),'Use each attribute and region once.');
/** Call with the authoritative category revision. Never trust definitions supplied in an import or product payload. */
export function productSpecificationFindings(groupsInput:unknown,rowsInput:unknown,requireComplete=true):ContentFinding[]{
 const groups=productAttributeGroups.safeParse(groupsInput),rows=productSpecifications.safeParse(rowsInput);
 if(!groups.success||!rows.success)return [{field:'specifications',code:'product_specification_schema',severity:'error',message:'The category definitions or specifications are invalid.'}];
 const definitions=new Map(groups.data.flatMap(group=>group.attributes.map(attribute=>[attribute.id,attribute] as const))),findings:ContentFinding[]=[];
 const add=(field:string,message:string)=>findings.push({field,code:'product_specification',severity:'error',message});
 rows.data.forEach((row,i)=>{
  const definition=definitions.get(row.attributeId),field=`specifications.${i}`;
  if(!definition){add(field,'This attribute is not defined by the selected category revision.');return;}
  const scopes=definition.regions.length?definition.regions.map(regionKey):['global'];
  if(!scopes.includes(regionKey(row.region)))add(`${field}.region`,'This region is not defined for the attribute.');
  if(row.value.state==='notApplicable'&&!definition.allowNotApplicable)add(`${field}.value`,'This attribute does not permit not applicable.');
  if(row.value.state==='known'){
   const value=row.value.value,expected=definition.valueType==='choice'?'string':definition.valueType==='text'?'string':definition.valueType;
   if(typeof value!==expected)add(`${field}.value`,'The value type must match the category attribute; values are never coerced.');
   else if(definition.valueType==='choice'&&!definition.allowedValues.includes(value as string))add(`${field}.value`,'Choose an allowed category value.');
  }
 });
 if(requireComplete)for(const definition of definitions.values())if(definition.required){
  for(const scope of definition.regions.length?definition.regions.map(regionKey):['global']){
   const row=rows.data.find(row=>row.attributeId===definition.id&&regionKey(row.region)===scope);
   if(!row||row.value.state==='blank'||row.value.state==='unknown')add('specifications',`Provide ${definition.label} for ${scope}; blank and unknown do not satisfy a required specification.`);
  }
 }
 return findings;
}
