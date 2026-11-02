import {careerSchema,type CareerDraft} from './careers.ts';
const stable=(value:unknown):string=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
/** Compare complete saved and proposed snapshots; omitted optional fields remain visible. */
export function compareCareerImport(before:CareerDraft|null,after:CareerDraft){
 const proposed=careerSchema.parse(after),saved=before===null?null:careerSchema.parse(before);
 return Object.keys(careerSchema.shape).filter(key=>key!=='schemaVersion').flatMap(key=>{
  const field=key as keyof CareerDraft,old=saved?.[field]??null,next=proposed[field]??null;
  return saved!==null&&stable(old)===stable(next)?[]:[{field,before:old,after:next}];
 });
}
