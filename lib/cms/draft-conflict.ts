export type ConflictChoice='mine'|'latest';
export function compareDrafts<T extends Record<string,unknown>>(base:T,mine:T,latest:T){
 return (Object.keys(base) as (keyof T & string)[]).map(key=>{
  const original=JSON.stringify(base[key]),local=JSON.stringify(mine[key]),remote=JSON.stringify(latest[key]);
  const mineChanged=local!==original,latestChanged=remote!==original;
  return {key,mineChanged,latestChanged,conflict:mineChanged&&latestChanged&&local!==remote,
   suggested:mineChanged?'mine' as const:'latest' as const};
 });
}
/** Resolve without writing. True conflicts require an explicit decision. */
export function resolveDraftConflict<T extends Record<string,unknown>>(base:T,mine:T,latest:T,choices:Partial<Record<keyof T,ConflictChoice>>):T{
 const result=structuredClone(latest);
 for(const field of compareDrafts(base,mine,latest)){
  const choice=choices[field.key]??(field.conflict?undefined:field.suggested);
  if(!choice)throw Error(`Choose which ${field.key} changes to keep.`);
  result[field.key]=structuredClone(choice==='mine'?mine[field.key]:latest[field.key]);
 }
 return result;
}
