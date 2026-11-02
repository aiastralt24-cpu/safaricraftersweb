import {partnerSchema,type PartnerDraft} from './partners.ts';
const stable=(value:unknown):string=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
/** Compare complete saved and proposed snapshots; omitted optional fields remain visible. */
export function comparePartnerImport(before:PartnerDraft|null,after:PartnerDraft){
 const proposed=partnerSchema.parse(after),saved=before===null?null:partnerSchema.parse(before);
 return Object.keys(partnerSchema.shape).filter(key=>key!=='schemaVersion').flatMap(key=>{
  const field=key as keyof PartnerDraft,old=saved?.[field]??null,next=proposed[field]??null;
  return saved!==null&&stable(old)===stable(next)?[]:[{field,before:old,after:next}];
 });
}
