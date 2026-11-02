/** Label maps come from the authorized submitted form revision. Keep unknown IDs
 * visible instead of dropping answers when a label is absent or malformed. */
export function leadAnswerDisplay(value:unknown,options?:Record<string,string>):string{
 const label=(item:unknown):string=>{
  if(typeof item==='string')return options&&Object.hasOwn(options,item)&&typeof options[item]==='string'?options[item]:item;
  if(typeof item==='boolean')return item?'Yes':'No';
  return JSON.stringify(item)??'Not set';
 };
 return Array.isArray(value)?value.map(label).join(', '):label(value);
}
