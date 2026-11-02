/** Patch only explicitly changed scalar fields; preserve unseen structured values. */
export function mergeJourneyEditorFields(original:Record<string,unknown>,fields:Record<string,string>,creating=false){
  const payload={...original};
  for(const [key,value]of Object.entries(fields)){
    const baseline=typeof original[key]==='string'?original[key]:'';
    if(creating||value!==baseline)payload[key]=value;
  }
  return payload;
}
