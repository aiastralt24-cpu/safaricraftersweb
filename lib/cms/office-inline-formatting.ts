import {z} from 'zod';
import {inlineSpan} from './composition.ts';
export const officeFormattingSchema=z.array(z.object({sheet:z.enum(['Blocks','ListItems']),row:z.number().int().min(2).max(501),field:z.literal('text'),spans:z.array(inlineSpan).min(1).max(200)}).strict()).max(500);
const object=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const text=(value:unknown)=>typeof value==='string'?value:String(object(value)['#text']??'');
function toggle(value:unknown){const raw=object(value)['@_val'];if(raw===undefined)return true;if(['0','false','off'].includes(String(raw)))return false;if(['1','true','on'].includes(String(raw)))return true;throw Error('Unsupported Office formatting flag.');}
function marks(value:unknown,base:Record<string,unknown>={}){const props=object(value),result={...base};
 for(const [key,target] of [['b','bold'],['i','italic']])if(Object.hasOwn(props,key))result[target]=toggle(props[key]);
 if(Object.hasOwn(props,'vertAlign')){const raw=object(props.vertAlign)['@_val'];if(!['baseline','superscript','subscript'].includes(String(raw)))throw Error('Unsupported Office character position.');result.script=raw==='baseline'?'normal':raw;}
 if(Object.hasOwn(props,'u')&&object(props.u)['@_val']!=='none'||Object.hasOwn(props,'strike')&&toggle(props.strike))throw Error('Underline and strikethrough are not supported in imported journal text.');
 return result;
}
/** Direct OOXML run/font marks only. Font family, size and colour remain presentation. */
export function excelInlineSpans(value:unknown,font:unknown,expected:string){const cell=object(value),base=marks(font);let spans;
 if(cell.r!==undefined){if(cell.t!==undefined)throw Error('Ambiguous Excel rich text.');const runs=Array.isArray(cell.r)?cell.r:[cell.r];if(runs.length>200)throw Error('Use at most 200 formatted text parts per cell.');spans=runs.map(run=>{const row=object(run);return {text:text(row.t),...marks(row.rPr,base)};});}
 else spans=[{text:expected,...base}];
 const parsed=z.array(inlineSpan).min(1).max(200).parse(spans);if(parsed.map(span=>span.text).join('')!==expected)throw Error('Excel formatted text does not match the cell text.');
 return parsed.some(span=>span.bold||span.italic||span.script&&span.script!=='normal')?parsed:undefined;
}

/** Resolve supported Word document/paragraph/character cascades. Table formatting
 * remains presentation-only: conditional table marks cannot be safely flattened. */
export function wordStyleGuard(value:unknown){
 const styles=object(value),all=(styles.style===undefined?[]:Array.isArray(styles.style)?styles.style:[styles.style]).map(object);
 const unsupported=new Set(['bCs','iCs','u','strike','dstrike','dStrike','vanish','webHidden','caps','smallCaps','position','numPr','cs','rtl']);
 function inspect(value:unknown,table=false){if(!value||typeof value!=='object')return;for(const [key,child] of Object.entries(value)){if(unsupported.has(key)||table&&['b','i','vertAlign'].includes(key))throw Error('Unsupported Word inherited editorial formatting. Use supported paragraph/character styles or direct text formatting.');inspect(child,table);}}
 const defaults=new Map<string,string>();
 for(const style of all){
  if(['1','true','on'].includes(String(style['@_default']))){const type=String(style['@_type']??'');if(defaults.has(type))throw Error('Duplicate Word default style.');defaults.set(type,String(style['@_styleId']??''));}
 }
 function chain(id:string,type:string,seen=new Set<string>()):Record<string,unknown>[] {
  if(seen.has(id)||seen.size>=50)throw Error('Invalid Word style inheritance.');seen.add(id);
  const matches=all.filter(row=>row['@_styleId']===id);if(matches.length!==1)throw Error('Unknown or duplicate Word style reference.');
  const style=matches[0];if(style['@_type']!==type)throw Error('Unsupported Word style type or inheritance.');
  inspect(style,type!=='paragraph'&&type!=='character');const parent=object(style.basedOn)['@_val'];
  return [...(parent===undefined?[]:chain(String(parent),type,seen)),style];
 }
 const docDefaults=object(styles.docDefaults);inspect(docDefaults);
 const base=marks(object(docDefaults.rPrDefault).rPr);
 function apply(id:string|undefined,type:string,initial:Record<string,unknown>){
  const selected=id??defaults.get(type);let result={...initial};
  if(selected===undefined)return result;
  for(const style of chain(selected,type)){
   const props=object(style.rPr),next=marks(props,result);
   // Word style bold/italic are toggles; direct run properties are absolute.
   for(const [key,target] of [['b','bold'],['i','italic']])if(Object.hasOwn(props,key))next[target]=toggle(props[key])?!Boolean(result[target]):result[target];
   result=next;
  }
  return result;
 }
 const check=(id:string)=>{chain(id,'table');};
 for(const [type,id] of defaults){if(!['paragraph','character','table','numbering'].includes(type))throw Error('Unsupported Word default style.');chain(id,type);}
 return Object.assign(check,{paragraph:(id?:string)=>apply(id,'paragraph',base),character:(id:string|undefined,props:Record<string,unknown>)=>apply(id,'character',props)});
}
export function wordInlineSpans(nodes:Record<string,any>[],expected:string,checkStyle:ReturnType<typeof wordStyleGuard>){
 const spans:{text:string;[key:string]:unknown}[]=[];
 function append(text:string,props:Record<string,unknown>){if(!text)return;const last=spans.at(-1);if(last&&JSON.stringify(Object.fromEntries(Object.entries(last).filter(([key])=>key!=='text')))===JSON.stringify(props))last.text+=text;else spans.push({text,...props});if(spans.length>201)throw Error('Use at most 200 formatted text parts per cell.');}
 function visit(nodes:Record<string,any>[],props:Record<string,unknown>={}){for(const node of nodes)for(const [tag,value]of Object.entries(node)){
  if(tag===':@')continue;
  if(tag==='pStyle'||tag==='rStyle')continue;
  if(tag==='tblStyle'){checkStyle(String(node[':@']?.['@_val']??''));continue;}
  if(['u','strike','dstrike','dStrike','bCs','iCs','vanish','webHidden','caps','smallCaps','position','numPr','hyperlink','sym','cs','rtl'].includes(tag))throw Error('Unsupported Word formatting in journal text.');
  if(tag==='pPr'&&Array.isArray(value)&&value.some(entry=>entry.rPr))throw Error('Unsupported Word paragraph character defaults. Use direct run formatting.');
  if(tag==='p'){
   const pPr=value.find((entry:Record<string,unknown>)=>entry.pPr)?.pPr??[];
   const style=pPr.find((entry:Record<string,unknown>)=>entry.pStyle)?.[':@']?.['@_val'];
   visit(value,checkStyle.paragraph(style));append('\n',{});
  }else if(tag==='r'){
   const properties:Record<string,unknown>={};for(const entry of value)if(entry.rPr)for(const prop of entry.rPr)for(const key of Object.keys(prop))if(key!==':@')properties[key]=prop[':@']??{};
   const style=object(properties.rStyle)['@_val'];
   visit(value,marks(properties,checkStyle.character(style===undefined?undefined:String(style),props)));
  }else if(tag==='#text')append(String(value),props);
  else if(tag==='tab')append('\t',props);else if(tag==='br'||tag==='cr')append('\n',props);
  else if(Array.isArray(value)){visit(value,props);}
 }}
 visit(nodes);const last=spans.at(-1);if(last?.text.endsWith('\n')){last.text=last.text.slice(0,-1);if(!last.text)spans.pop();}
 const parsed=z.array(inlineSpan).min(1).max(200).parse(spans);if(parsed.map(span=>span.text).join('')!==expected)throw Error('Word formatted text does not match the cell text.');
 return parsed.some(span=>span.bold||span.italic||span.script&&span.script!=='normal')?parsed:undefined;
}
