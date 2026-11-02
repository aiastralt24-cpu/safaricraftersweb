'use client';
import {useEffect,useRef} from 'react';
/** Content stays visible in server HTML and without motion APIs. Only visible
 * sections animate; no persistent hidden state, layout measurements or scroll loop. */
export function useHomepageMotion(revisionKey:string){
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const element=root.current;
  if(!element||!('IntersectionObserver' in window)||!Element.prototype.animate)return;
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  const animations=new Set<Animation>();let observer:IntersectionObserver|null=null;
  const stop=()=>{observer?.disconnect();observer=null;for(const animation of animations)animation.cancel();animations.clear();};
  const start=()=>{
   stop();if(preference.matches)return;
   observer=new IntersectionObserver(entries=>{
    for(const entry of entries){
     if(!entry.isIntersecting)continue;observer?.unobserve(entry.target);
     const section=entry.target as HTMLElement,mode=section.dataset.cmsMotion;
     const targets=Array.from(section.querySelectorAll<HTMLElement>(':scope > .cms-homepage-width, :scope > .concept-story-proof-intro, :scope > .concept-legacy-ledger, :scope > .concept-hero-grid > .concept-hero-copy'));
     for(const [index,target]of targets.entries()){
      const frames=mode==='reveal'?[{opacity:0,transform:'translateY(24px)'},{opacity:1,transform:'translateY(0)'}]:[{opacity:0},{opacity:1}];
      const animation=target.animate(frames,{duration:mode==='reveal'?600:360,delay:index*70,easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'});
      animations.add(animation);animation.finished.then(()=>animations.delete(animation),()=>animations.delete(animation));
     }
    }
   },{rootMargin:'0px 0px -12% 0px',threshold:0});
   for(const section of element.querySelectorAll('[data-cms-motion="fade"],[data-cms-motion="reveal"]'))observer.observe(section);
  };
  start();preference.addEventListener('change',start);
  return()=>{preference.removeEventListener('change',start);stop();};
 },[revisionKey]);
 return root;
}
