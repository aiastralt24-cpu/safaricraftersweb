import {eventSchema,type EventDraft} from './events.ts';
const stable=(value:unknown):string=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
/** Compare complete saved and proposed snapshots; omitted optional fields remain visible. */
export function compareEventImport(before:EventDraft|null,after:EventDraft){
 const proposed=eventSchema.parse(after),saved=before===null?null:eventSchema.parse(before);
 return Object.keys(eventSchema.shape).filter(key=>key!=='schemaVersion').flatMap(key=>{
  const field=key as keyof EventDraft,old=saved?.[field]??null,next=proposed[field]??null;
  return saved!==null&&stable(old)===stable(next)?[]:[{field,before:old,after:next}];
 });
}
