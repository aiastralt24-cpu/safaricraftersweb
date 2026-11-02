'use client';
import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import type {ConceptNavigation} from '../lib/cms/concept-navigation';
import {publishedMediaUrl} from '../lib/cms/published-journey';
import {BrandMark} from './BrandMark';
import './CmsConceptNavigation.css';
/** Menu data must be validated and its media/links verified by the delivery layer. */
type MenuImage=ConceptNavigation['primary'][number]['image'];
type MenuProps={menu:ConceptNavigation;renderImage?:(image:MenuImage)=>ReactNode};
export function CmsConceptNavigation({menu,revisionKey,renderImage}:MenuProps&{revisionKey:string}){
 return <ConceptMenu key={revisionKey} menu={menu} renderImage={renderImage}/>;
}
function ConceptMenu({menu,renderImage}:MenuProps){
 const [open,setOpen]=useState(false),[active,setActive]=useState(menu.primary[0]?.id),dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null),closeButton=useRef<HTMLButtonElement>(null),id=useId();
 const selected=menu.primary.find(item=>item.id===active)??menu.primary[0];
 useEffect(()=>{
  if(!open||!dialog.current)return;
  const element=dialog.current,previousOverflow=document.body.style.overflow;
  element.showModal();document.body.style.overflow='hidden';closeButton.current?.focus();
  return()=>{element.close();document.body.style.overflow=previousOverflow;if(trigger.current?.isConnected)trigger.current.focus();};
 },[open]);
 const attributes=(item:{newWindow:boolean})=>item.newWindow?{target:'_blank',rel:'noopener noreferrer'}:{};
 return <div className='cms-concept-navigation'>
 <nav className='cms-concept-nav-bar' aria-label={menu.navigationLabel}><BrandMark/><span className='cms-concept-nav-context'>{menu.contextLabel}</span><a className='cms-concept-nav-cta' href={menu.cta.href} {...attributes(menu.cta)}>{menu.cta.label}</a><button ref={trigger} type='button' aria-label={open?menu.closeLabel:menu.openLabel} aria-expanded={open} aria-controls={id} onClick={()=>setOpen(value=>!value)}><span aria-hidden='true'>☰</span></button></nav>
 <dialog ref={dialog} id={id} className='cms-concept-menu' aria-label={menu.navigationLabel} onKeyDown={event=>{if(event.key!=='Tab')return;const controls=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),[tabindex]')).filter(element=>element.tabIndex>=0&&element.getClientRects().length>0);const first=controls[0],last=controls.at(-1);if(!first)return;if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}} onCancel={event=>{event.preventDefault();setOpen(false);}} onClose={()=>setOpen(false)} onClick={event=>{if(event.target!==event.currentTarget)return;const rect=event.currentTarget.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)setOpen(false);}}>
 <div className='cms-concept-menu-top'><BrandMark/><button ref={closeButton} type='button' aria-label={menu.closeLabel} onClick={()=>setOpen(false)}>{menu.closeText} <span aria-hidden='true'>×</span></button></div>
 <div className='cms-concept-menu-grid'><div><nav aria-label={menu.primaryLabel} className='cms-concept-primary'>{menu.primary.map(item=><a key={item.id} href={item.href} data-active={selected?.id===item.id?'true':undefined} {...attributes(item)} onFocus={()=>setActive(item.id)} onPointerEnter={()=>setActive(item.id)} onClick={()=>setOpen(false)}>{item.label}<span aria-hidden='true'>↗</span></a>)}</nav><a className='cms-concept-menu-cta' href={menu.cta.href} {...attributes(menu.cta)} onClick={()=>setOpen(false)}>{menu.cta.label}<span aria-hidden='true'>→</span></a><nav className='cms-concept-secondary' aria-label={menu.secondaryLabel}>{menu.secondary.map(item=><a key={item.id} href={item.href} {...attributes(item)} onClick={()=>setOpen(false)}>{item.label}</a>)}</nav></div>
 {selected&&<figure className='cms-concept-menu-image'>{renderImage?renderImage(selected.image):<img key={selected.image.assetId} src={publishedMediaUrl(selected.image.assetId)} alt={selected.image.decorative?'':selected.image.alt}/>}{(selected.image.caption||selected.image.credit)&&<figcaption>{[selected.image.caption,selected.image.credit].filter(Boolean).join(' · ')}</figcaption>}</figure>}</div>
 </dialog></div>;
}
