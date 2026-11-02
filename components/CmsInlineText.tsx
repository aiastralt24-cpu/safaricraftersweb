import {Fragment,type ReactNode} from 'react';
import type {RichText} from '@/lib/cms/composition';
export function CmsInlineText({block,disableLinks=false}:{disableLinks?:boolean;block:Extract<RichText[number],{kind:'paragraph'}>}){
 return <>{block.spans?block.spans.map((span,index)=>{
  let content:ReactNode=span.text;
  if(span.script==='superscript')content=<sup>{content}</sup>;
  if(span.script==='subscript')content=<sub>{content}</sub>;
  if(span.italic)content=<em>{content}</em>;
  if(span.bold)content=<strong>{content}</strong>;
  if(span.href&&!disableLinks)content=<a href={span.href}>{content}</a>;
  return <Fragment key={index}>{content}</Fragment>;
 }):block.text}</>;
}
