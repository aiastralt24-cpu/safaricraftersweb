import {applicationSchema,type ApplicationDraft} from './applications.ts';
const stable=(value:unknown):string=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
/** Compare complete saved and proposed snapshots; omitted optional fields remain visible. */
export function compareApplicationImport(before:ApplicationDraft|null,after:ApplicationDraft){
 const proposed=applicationSchema.parse(after),saved=before===null?null:applicationSchema.parse(before);
 return Object.keys(applicationSchema.shape).filter(key=>key!=='schemaVersion').flatMap(key=>{
  const field=key as keyof ApplicationDraft,old=saved?.[field]??null,next=proposed[field]??null;
  return saved!==null&&stable(old)===stable(next)?[]:[{field,before:old,after:next}];
 });
}
