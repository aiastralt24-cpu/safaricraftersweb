'use client';
import {useId,useState} from 'react';
import {Plus} from 'lucide-react';
export function CmsGuidedFaq({items,initialOpenId,headingLevel}:{items:{id:string;question:string;answer:string}[];initialOpenId:string|null;headingLevel:'h2'|'h3'|'h4'}){
 const prefix=useId(),[open,setOpen]=useState(initialOpenId),H=headingLevel;
 return <div className='guided-faq-list'>{items.map(item=>{const expanded=open===item.id,answer=`${prefix}-answer-${item.id}`,button=`${prefix}-question-${item.id}`;return <article key={item.id} className={expanded?'is-open':''}><H><button type='button' id={button} aria-expanded={expanded} aria-controls={answer} onClick={()=>setOpen(expanded?null:item.id)}><span>{item.question}</span><Plus aria-hidden='true' size={22} strokeWidth={1.25}/></button></H><div className='guided-faq-answer' id={answer} role='region' aria-labelledby={button} hidden={!expanded}><p>{item.answer}</p></div></article>;})}</div>;
}
