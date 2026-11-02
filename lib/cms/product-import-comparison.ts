import {productSchema,type ProductDraft} from './products.ts';
const stable=(value:unknown):string=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
/** Compare complete saved and proposed snapshots; omitted optional fields remain visible. */
export function compareProductImport(before:ProductDraft|null,after:ProductDraft){
 const proposed=productSchema.parse(after),saved=before===null?null:productSchema.parse(before);
 return Object.keys(productSchema.shape).filter(key=>key!=='schemaVersion').flatMap(key=>{
  const field=key as keyof ProductDraft,old=saved?.[field]??null,next=proposed[field]??null;
  return saved!==null&&stable(old)===stable(next)?[]:[{field,before:old,after:next}];
 });
}
