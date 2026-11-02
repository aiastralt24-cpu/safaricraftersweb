'use client';
import {useEffect,useRef,type ReactNode} from 'react';
/** Scoped enhancement: visible server HTML, no cross-page selectors, reversible effects. */
export function CmsConservationMotion({children,revisionKey}:{children:ReactNode;revisionKey:string}){
 const root=useRef<HTMLElement>(null);
 useEffect(()=>{
  const element=root.current;
  if(!element?.querySelector('[data-cms-motion="fade"],[data-cms-motion="reveal"]'))return;
  let disposed=false,cleanup=()=>{};
  Promise.all([import('gsap'),import('gsap/ScrollTrigger')]).then(([{gsap},{ScrollTrigger}])=>{
   if(disposed)return;
   gsap.registerPlugin(ScrollTrigger);
   const media=gsap.matchMedia();cleanup=()=>media.revert();
   media.add({allowed:'(prefers-reduced-motion: no-preference)',desktop:'(min-width: 721px)'},match=>{
    if(!match.conditions?.allowed)return;
    const desktop=Boolean(match.conditions.desktop),entrances:ReturnType<typeof gsap.fromTo>[]=[];
    const context=gsap.context(()=>{
     for(const section of element.querySelectorAll<HTMLElement>('[data-cms-motion="fade"],[data-cms-motion="reveal"]')){
      const reveal=section.dataset.cmsMotion==='reveal',content=section.querySelector<HTMLElement>('.cms-conservation-content');
      if(!content)continue;
      const enter=(target:HTMLElement)=>{entrances.push(gsap.fromTo(target,{opacity:0,...(reveal?{y:20}:{})},{opacity:1,...(reveal?{y:0}:{}),duration:reveal?.7:.45,ease:'power2.out',scrollTrigger:{trigger:target,start:'top 88%',once:true}}));};
      for(const child of Array.from(content.children) as HTMLElement[]){
       if(child.matches('.cms-conservation-projects')){
        for(const project of child.querySelectorAll<HTMLElement>(':scope>article')){
         for(const part of Array.from(project.children) as HTMLElement[])enter(part);
         if(reveal){const frame=project.querySelector('figure');if(frame)gsap.fromTo(frame,{scale:desktop?.94:.975,transformOrigin:'50% 50%'},{scale:1,ease:'none',scrollTrigger:{trigger:frame,start:desktop?'top 92%':'top 94%',end:'top 22%',scrub:desktop?1.05:.65,invalidateOnRefresh:true}});}
        }
       }else if(child.matches('.cms-conservation-outcomes,.cms-conservation-regions,.cms-conservation-paragraphs')){
        for(const item of Array.from(child.children) as HTMLElement[])enter(item);
       }else if(!child.matches('figure'))enter(child);
      }
     }
    },element);
    const focus=(event:FocusEvent)=>{for(const tween of entrances)if(tween.targets().some(target=>target instanceof HTMLElement&&target.contains(event.target as Node))){tween.progress(1);tween.scrollTrigger?.kill();}};
    let active=true;const refresh=()=>{if(active&&!disposed)ScrollTrigger.refresh();};
    element.addEventListener('focusin',focus);element.addEventListener('load',refresh,true);
    document.fonts?.ready.then(refresh);refresh();
    return()=>{active=false;element.removeEventListener('focusin',focus);element.removeEventListener('load',refresh,true);context.revert();};
   },element);
  }).catch(()=>cleanup());
  return()=>{disposed=true;cleanup();};
 },[revisionKey]);
 return <article ref={root} className='cms-conservation-page'>{children}</article>;
}
