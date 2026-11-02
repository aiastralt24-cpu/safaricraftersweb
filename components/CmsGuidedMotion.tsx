'use client';
import {useEffect,useRef,type ReactNode} from 'react';
/** Visible server content; enhancements are confined to this page instance. */
export function CmsGuidedMotion({children,revisionKey}:{children:ReactNode;revisionKey:string}){
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const element=root.current;if(!element)return;
  let disposed=false,cleanup=()=>{};
  Promise.all([import('gsap'),import('gsap/ScrollTrigger')]).then(([{gsap},{ScrollTrigger}])=>{
   if(disposed)return;
   gsap.registerPlugin(ScrollTrigger);const media=gsap.matchMedia();cleanup=()=>media.revert();
   media.add({allowed:'(prefers-reduced-motion: no-preference)',desktop:'(min-width: 721px)'},match=>{
    if(!match.conditions?.allowed)return;
    const desktop=Boolean(match.conditions.desktop),entrances:ReturnType<typeof gsap.fromTo>[]=[];
    const context=gsap.context(()=>{
     for(const section of element.querySelectorAll<HTMLElement>('[data-cms-motion="fade"],[data-cms-motion="reveal"]')){
      const reveal=section.dataset.cmsMotion==='reveal';
      const targets=Array.from(section.children).flatMap(child=>child.matches('.guided-field-grid,.guided-paths-grid')?Array.from(child.children):[child]);
      for(const target of targets)entrances.push(gsap.fromTo(target,{opacity:0,...(reveal?{y:20}:{})},{opacity:1,...(reveal?{y:0}:{}),duration:reveal?.7:.45,ease:'power2.out',scrollTrigger:{trigger:target,start:'top 90%',once:true}}));
     }
     for(const frame of element.querySelectorAll<HTMLElement>('[data-cms-expand="true"] .guided-expand-media'))for(const image of frame.querySelectorAll('img'))gsap.fromTo(image,{scale:desktop?1.06:1.035,transformOrigin:'50% 50%'},{scale:1,ease:'none',scrollTrigger:{trigger:frame,start:desktop?'top 94%':'top 96%',end:desktop?'top 24%':'top 42%',scrub:desktop?1.05:.65,invalidateOnRefresh:true}});
    },element);
    const focus=(event:FocusEvent)=>{for(const tween of entrances)if(tween.targets().some(target=>target instanceof HTMLElement&&target.contains(event.target as Node))){tween.progress(1);tween.scrollTrigger?.kill();}};
    let active=true;const refresh=()=>{if(active&&!disposed)ScrollTrigger.refresh();};
    element.addEventListener('focusin',focus);element.addEventListener('load',refresh,true);document.fonts?.ready.then(refresh);refresh();
    return()=>{active=false;element.removeEventListener('focusin',focus);element.removeEventListener('load',refresh,true);context.revert();};
   },element);
  }).catch(()=>cleanup());
  return()=>{disposed=true;cleanup();};
 },[revisionKey]);
 return <div ref={root} className='guided-page cms-guided-page' data-revision={revisionKey}>{children}</div>;
}
