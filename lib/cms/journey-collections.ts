import {journeyTemplate,MAX_FIELD_CHARACTERS} from './import-contract.ts';
export type JourneyCollection='itinerary'|'faqs'|'media';
export type JourneyItem=Record<string,unknown>&{itemId:string;position:number|string};
export const collectionFields=(kind:JourneyCollection)=>journeyTemplate.sheets[kind==='itinerary'?'Itinerary':kind==='faqs'?'FAQs':'Media'].filter(field=>!['recordId','itemId','position'].includes(field.key));
export function readJourneyItems(input:unknown):JourneyItem[]{
 if(input===undefined)return [];
 if(!Array.isArray(input)||input.length>500)throw new Error('This collection needs a content repair before it can be edited.');
 const ids=new Set<string>(),positions=new Set<number>();
 for(const item of input){
  if(!item||typeof item!=='object'||Array.isArray(item)||typeof item.itemId!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(item.itemId)||ids.has(item.itemId))throw new Error('Entries need unique stable IDs before editing.');
  const position=Number(item.position);if(!Number.isSafeInteger(position)||position<1||positions.has(position))throw new Error('Entries need unique display positions before editing.');
  ids.add(item.itemId);positions.add(position);
 }
 return [...input].sort((a,b)=>Number(a.position)-Number(b.position));
}
type Command={action:'add';id:string}|{action:'remove';id:string}|{action:'move';id:string;direction:-1|1}|{action:'edit';id:string;field:string;value:string};
export function editJourneyCollection(kind:JourneyCollection,input:unknown,command:Command):JourneyItem[]{
 const items=readJourneyItems(input).map(item=>({...item}));
 const index=items.findIndex(item=>item.itemId===command.id);
 if(command.action==='add'){
  if(items.length>=500||index!==-1||!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(command.id))throw new Error('Cannot add this entry.');
  items.push({...Object.fromEntries(collectionFields(kind).map(field=>[field.key,''])),itemId:command.id,position:items.length+1});
 }else{
  if(index<0)throw new Error('This entry is no longer available.');
  if(command.action==='remove')items.splice(index,1);
  else if(command.action==='move'){
   if(command.direction!==-1&&command.direction!==1)throw new Error('Invalid display order.');
   const target=index+command.direction;if(target<0||target>=items.length)throw new Error('This entry cannot move further.');
   [items[index],items[target]]=[items[target],items[index]];
  }else{
   if(!collectionFields(kind).some(field=>field.key===command.field)||typeof command.value!=='string'||Array.from(command.value).length>MAX_FIELD_CHARACTERS)throw new Error('Invalid entry field.');
   items[index][command.field]=command.value;
  }
 }
 return items.map((item,i)=>({...item,position:i+1}));
}
