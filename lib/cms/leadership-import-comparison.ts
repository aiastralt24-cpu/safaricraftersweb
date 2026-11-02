import {leadershipSchema,type LeadershipDraft} from './leadership.ts';
const stable=(value:unknown):string=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
/** Compare complete saved and proposed snapshots; omitted optional fields remain visible. */
export function compareLeadershipImport(before:LeadershipDraft|null,after:LeadershipDraft){
 const proposed=leadershipSchema.parse(after),saved=before===null?null:leadershipSchema.parse(before);
 return Object.keys(leadershipSchema.shape).filter(key=>key!=='schemaVersion').flatMap(key=>{
  const field=key as keyof LeadershipDraft,old=saved?.[field]??null,next=proposed[field]??null;
  return saved!==null&&stable(old)===stable(next)?[]:[{field,before:old,after:next}];
 });
}
