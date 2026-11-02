import {faqSchema,type FaqDraft} from './faqs.ts';
const stable=(value:unknown):string=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
/** Compare complete saved and proposed snapshots; omitted optional fields remain visible. */
export function compareFaqImport(before:FaqDraft|null,after:FaqDraft){
 const proposed=faqSchema.parse(after),saved=before===null?null:faqSchema.parse(before);
 return Object.keys(faqSchema.shape).filter(key=>key!=='schemaVersion').flatMap(key=>{
  const field=key as keyof FaqDraft,old=saved?.[field]??null,next=proposed[field]??null;
  return saved!==null&&stable(old)===stable(next)?[]:[{field,before:old,after:next}];
 });
}
