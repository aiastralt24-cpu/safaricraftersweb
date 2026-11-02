import {newsSchema,type NewsDraft} from './news.ts';
const stable=(value:unknown):string=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
/** Compare complete saved and proposed snapshots; omitted optional fields remain visible. */
export function compareNewsImport(before:NewsDraft|null,after:NewsDraft){
 const proposed=newsSchema.parse(after),saved=before===null?null:newsSchema.parse(before);
 return Object.keys(newsSchema.shape).filter(key=>key!=='schemaVersion').flatMap(key=>{
  const field=key as keyof NewsDraft,old=saved?.[field]??null,next=proposed[field]??null;
  return saved!==null&&stable(old)===stable(next)?[]:[{field,before:old,after:next}];
 });
}
