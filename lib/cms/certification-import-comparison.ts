import {certificationSchema,type CertificationDraft} from './certifications.ts';
const stable=(value:unknown):string=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
/** Compare complete saved and proposed snapshots; omitted optional fields remain visible. */
export function compareCertificationImport(before:CertificationDraft|null,after:CertificationDraft){
 const proposed=certificationSchema.parse(after),saved=before===null?null:certificationSchema.parse(before);
 return Object.keys(certificationSchema.shape).filter(key=>key!=='schemaVersion').flatMap(key=>{
  const field=key as keyof CertificationDraft,old=saved?.[field]??null,next=proposed[field]??null;
  return saved!==null&&stable(old)===stable(next)?[]:[{field,before:old,after:next}];
 });
}
