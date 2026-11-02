import {z} from 'zod';
import type {Composition} from './composition.ts';
import type {PageSeo} from './page-seo.ts';
const section=z.object({id:z.string(),label:z.string(),kind:z.string(),position:z.number().int().positive()}).strict();
export const pageImportComparisonSchema=z.object({
 title:z.object({before:z.string().nullable(),after:z.string()}).strict().nullable(),
 sections:z.array(z.object({id:z.string(),action:z.enum(['added','removed','changed','moved','changedAndMoved']),before:section.nullable(),after:section.nullable(),fields:z.array(z.string())}).strict()).max(200),
 seo:z.array(z.object({field:z.string(),before:z.unknown(),after:z.unknown()}).strict()).max(30),
}).strict();
export type PageImportComparison=z.infer<typeof pageImportComparisonSchema>;
type Payload={composition:Composition;seo:PageSeo};
function equal(a:unknown,b:unknown):boolean{
 if(a===b)return true;
 if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((value,i)=>equal(value,b[i]));
 if(a&&b&&typeof a==='object'&&typeof b==='object'){
  const left=a as Record<string,unknown>,right=b as Record<string,unknown>,keys=Object.keys(left);
  return keys.length===Object.keys(right).length&&keys.every(key=>Object.hasOwn(right,key)&&equal(left[key],right[key]));
 }
 return false;
}
/** Compare normalized saved/proposed snapshots; stable section IDs survive reordering. */
export function comparePageImport(before:Payload|null,after:Payload):PageImportComparison{
 const result:PageImportComparison={title:before?.composition.title===after.composition.title?null:{before:before?.composition.title??null,after:after.composition.title},sections:[],seo:[]};
 const previous=before?.composition.sections??[],next=after.composition.sections;
 const describe=(value:Composition['sections'][number],index:number)=>({id:value.id,label:value.controls.label,kind:value.kind,position:index+1});
 for(const [index,value] of previous.entries())if(!next.some(item=>item.id===value.id))result.sections.push({id:value.id,action:'removed',before:describe(value,index),after:null,fields:[]});
 for(const [index,value]of next.entries()){
  const oldIndex=previous.findIndex(item=>item.id===value.id),old=previous[oldIndex];
  if(!old){result.sections.push({id:value.id,action:'added',before:null,after:describe(value,index),fields:[]});continue;}
  const fields:string[]=[];
  if(old.kind!==value.kind)fields.push('kind');
  for(const group of ['controls','data'] as const){const a=old[group] as Record<string,unknown>,b=value[group] as Record<string,unknown>;for(const key of new Set([...Object.keys(a),...Object.keys(b)]))if(!equal(a[key],b[key]))fields.push(`${group}.${key}`);}
  const moved=index!==oldIndex;
  if(fields.length||moved)result.sections.push({id:value.id,action:fields.length?(moved?'changedAndMoved':'changed'):'moved',before:describe(old,oldIndex),after:describe(value,index),fields});
 }
 for(const field of new Set([...Object.keys(before?.seo??{}),...Object.keys(after.seo)])){
  if(field==='schemaVersion')continue;
  const old=(before?.seo as Record<string,unknown>|undefined)?.[field]??null,nextValue=(after.seo as Record<string,unknown>)[field]??null;
  if(!before&&(nextValue===null||nextValue===''||nextValue==='inherit'))continue;
  if(!equal(old,nextValue))result.seo.push({field,before:old,after:nextValue});
 }
 return result;
}
