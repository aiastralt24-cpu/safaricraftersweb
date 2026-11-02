import {projectSchema,type ProjectDraft} from './projects.ts';
const stable=(value:unknown):string=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
/** Compare complete saved and proposed snapshots; omitted optional fields remain visible. */
export function compareProjectImport(before:ProjectDraft|null,after:ProjectDraft){
 const proposed=projectSchema.parse(after),saved=before===null?null:projectSchema.parse(before);
 return Object.keys(projectSchema.shape).filter(key=>key!=='schemaVersion').flatMap(key=>{
  const field=key as keyof ProjectDraft,old=saved?.[field]??null,next=proposed[field]??null;
  return saved!==null&&stable(old)===stable(next)?[]:[{field,before:old,after:next}];
 });
}
