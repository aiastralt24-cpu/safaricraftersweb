import {editorialHeadingSchema} from './editorial-heading.ts';
import {editorialCopySchema} from './editorial-copy.ts';

type Run={text:string;marked:boolean};
/** Convert only known DOM text semantics. Unknown markup must be migrated
 * explicitly; it must never disappear through a generic textContent fallback. */
function readParts(input:unknown,mode:'heading'|'paragraph'){
 const lines:Run[][]=[[]];let nodes=0,characters=0;
 function visit(parts:unknown,marked=false,depth=0){
  if(!Array.isArray(parts)||parts.length>200||depth>12)throw Error('Captured text structure exceeds its supported bounds.');
  for(const part of parts){
   if(++nodes>1000||!part||typeof part!=='object'||Array.isArray(part))throw Error('Invalid captured text part.');
   const value=part as Record<string,unknown>,keys=Object.keys(value);
   if(keys.length===1&&typeof value.text==='string'){
    characters+=value.text.length;if(characters>50000)throw Error('Captured text is too long.');
    lines.at(-1)!.push({text:value.text,marked});continue;
   }
   if(keys.length!==2||!keys.includes('tag')||!keys.includes('children')||typeof value.tag!=='string')throw Error('Unknown captured text attributes.');
   if(value.tag==='br'&&mode==='heading'){
    if(!Array.isArray(value.children)||value.children.length)throw Error('Invalid captured line break.');
    lines.push([]);continue;
   }
   const supported=mode==='heading'?'em':'strong';
   if(value.tag!==supported)throw Error(`Explicit migration is required for captured <${value.tag}> markup.`);
   visit(value.children,true,depth+1);
  }
 }
 visit(input);
 // Normal HTML whitespace collapses across fragment boundaries, but emphasis
 // ownership stays with the text that supplied each visible character.
 return lines.map(line=>{
  const result:Run[]=[];let pending:Run|null=null;
  const append=(text:string,marked:boolean)=>{const last=result.at(-1);if(last?.marked===marked)last.text+=text;else result.push({text,marked});};
  for(const run of line)for(const character of run.text){
   if(/[\t\n\r\f ]/.test(character)){if(result.length&&!pending)pending={text:' ',marked:run.marked};continue;}
   if(pending){append(' ',pending.marked);pending=null;}append(character,run.marked);
  }
  return result;
 });
}
export function capturedHeadingToEditorial(parts:unknown){
 return editorialHeadingSchema.parse({lines:readParts(parts,'heading').map(line=>({runs:line.map(run=>({text:run.text,emphasis:run.marked}))}))});
}
export function capturedParagraphToEditorial(parts:unknown){
 const lines=readParts(parts,'paragraph');
 return editorialCopySchema.parse({runs:lines[0].map(run=>({text:run.text,strong:run.marked}))});
}
