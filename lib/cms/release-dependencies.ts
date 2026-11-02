import {z} from 'zod';
const uuid=z.string().uuid();
type Input={id:string;payload:unknown;path?:string|null;locale?:string};
/** Advisory scan of explicit references and exact selected internal paths.
 * Dynamic collections, media and reverse impact still require validation. */
export function analyzeReleaseDependencies(records:Input[]){
 if(records.length<1||records.length>50)throw Error('Select one to fifty records.');
 if(records.some(record=>!record.payload||typeof record.payload!=='object'||Array.isArray(record.payload)))throw Error('Stored content is unavailable for dependency analysis.');
 const ids=records.map(record=>uuid.parse(record.id).toLowerCase());
 if(new Set(ids).size!==ids.length)throw Error('Duplicate release record.');
 const selected=new Set(ids),dependencies=new Map<string,Set<string>>(),external:{record:string;target:string}[]=[];
 const paths=new Map<string,string>();
 for(let index=0;index<records.length;index++){
  const {path,locale}=records[index];if(path==null)continue;
  if(!/^\/[a-z0-9/-]*$/.test(path)||path.includes('//')||!locale||!/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(locale))throw Error('Invalid stored route identity.');
  const key=locale+':'+path;if(paths.has(key))throw Error('Ambiguous selected route.');paths.set(key,ids[index]);
 }
 const externalLinks:{record:string;path:string;locale:string}[]=[];
 let nodes=0;
 for(let index=0;index<records.length;index++){
  const refs=new Set<string>(),links=new Set<string>(),stack:{value:unknown;depth:number}[]=[{value:records[index].payload,depth:0}];
  while(stack.length){const {value,depth}=stack.pop()!;if(++nodes>100000||depth>64)throw Error('Content is too complex for dependency analysis.');
   if(!value||typeof value!=='object')continue;
   if(Array.isArray(value)){for(const item of value)stack.push({value:item,depth:depth+1});continue;}
   for(const [key,item] of Object.entries(value)){
    if(key==='recordId'){const parsed=uuid.safeParse(item);if(!parsed.success)throw Error('A stored record reference is malformed.');refs.add(parsed.data.toLowerCase());}
    else if(key==='href'&&typeof item==='string'&&item.startsWith('/')&&!item.startsWith('//')){
     const path=item.split(/[?#]/)[0];
     // Match stored path spelling exactly. Do not guess locale, aliases,
     // percent-encoding, absolute origins, dot segments or trailing slashes.
     if(/^\/[a-z0-9/-]*$/.test(path)&&!path.includes('//'))links.add(path);
    }
    else if(item&&typeof item==='object')stack.push({value:item,depth:depth+1});
   }
  }
  const locale=records[index].locale;
  if(locale)for(const path of links){const target=paths.get(locale+':'+path);if(target)refs.add(target);else externalLinks.push({record:ids[index],path,locale});}
  dependencies.set(ids[index],new Set([...refs].filter(ref=>selected.has(ref)&&ref!==ids[index])));
  for(const target of refs)if(!selected.has(target))external.push({record:ids[index],target});
 }
 // Stable Kahn order preserves the user's order among otherwise independent records.
 const remaining=new Set(ids),order:string[]=[];
 while(remaining.size){const next=ids.find(id=>remaining.has(id)&&[...dependencies.get(id)!].every(dep=>!remaining.has(dep)));if(!next)break;remaining.delete(next);order.push(next);}
 return {order:remaining.size?null:order,unresolved:ids.filter(id=>remaining.has(id)),external,externalLinks,
  edges:ids.flatMap(record=>[...dependencies.get(record)!].map(target=>({record,target}))),
  scope:'explicit-references-and-selected-internal-paths' as const};
}
