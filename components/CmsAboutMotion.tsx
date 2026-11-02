'use client';
import {useEffect,useRef} from 'react';
import type {ReactNode} from 'react';

/** Progressive enhancement: server HTML is visible; effects are scoped and reverted. */
export function CmsAboutMotion({children,revisionKey}:{children:ReactNode;revisionKey:string}){
 const root=useRef<HTMLElement>(null);
 useEffect(()=>{
  const element=root.current;
  if(!element||!element.querySelector('[data-cms-motion="fade"],[data-cms-motion="reveal"]'))return;
  let disposed=false,cleanup=()=>{};
  Promise.all([import('gsap'),import('gsap/ScrollTrigger')]).then(([{gsap},{ScrollTrigger}])=>{
   if(disposed)return;
   gsap.registerPlugin(ScrollTrigger);
   const media=gsap.matchMedia();
   cleanup=()=>media.revert();
   media.add('(prefers-reduced-motion: no-preference)',()=>{
    const reveals:ReturnType<typeof gsap.fromTo>[]=[];
    const context=gsap.context(()=>{
     for(const section of element.querySelectorAll<HTMLElement>('[data-cms-motion="fade"],[data-cms-motion="reveal"]')){
      const reveal=section.dataset.cmsMotion==='reveal';
      const entrance=(targets:HTMLElement[],trigger:HTMLElement,y=26)=>{
       if(!targets.length)return;
       const tween=gsap.fromTo(targets,{opacity:0,...(reveal?{y}:{})},{opacity:1,...(reveal?{y:0}:{}),duration:reveal?.82:.5,stagger:.09,ease:'power3.out',scrollTrigger:{trigger,start:'top 84%',toggleActions:'play none none none',once:true}});
       reveals.push(tween);
      };
      const hero=section.querySelector<HTMLElement>('.cms-overlay-hero');
      if(hero){
       entrance(Array.from(hero.querySelector<HTMLElement>('.cms-overlay-copy')?.children??[]) as HTMLElement[],hero);
       if(reveal){
        gsap.fromTo(hero.querySelectorAll('.cms-overlay-image img'),{scale:1.065,yPercent:-1.5,transformOrigin:'50% 50%'},{scale:1.02,yPercent:3.5,ease:'none',scrollTrigger:{trigger:hero,start:'top top',end:'bottom top',scrub:.85,invalidateOnRefresh:true}});
        gsap.fromTo(hero.querySelector('.cms-overlay-scrim'),{opacity:.9},{opacity:1,duration:1.15,ease:'power2.out'});
       }
       continue;
      }
      const leadership=section.querySelector<HTMLElement>('.cms-leadership');
      if(leadership){
       const heading=leadership.querySelector<HTMLElement>('.cms-leadership-heading');if(heading)entrance(Array.from(heading.children) as HTMLElement[],heading);
       for(const profile of leadership.querySelectorAll<HTMLElement>('article')){
        const portrait=profile.querySelector<HTMLElement>('figure'),copy=profile.querySelector<HTMLElement>(':scope>div');
        if(portrait){entrance([portrait],profile,38);if(reveal)gsap.fromTo(portrait.querySelector('img'),{scale:1.045},{scale:1,duration:1.25,ease:'power2.out',scrollTrigger:{trigger:profile,start:'top 82%',once:true}});}
        if(copy)entrance(Array.from(copy.children) as HTMLElement[],profile,20);
       }
       continue;
      }
      const principles=section.querySelector<HTMLElement>('.cms-numbered-cards');
      if(principles){const heading=principles.querySelector<HTMLElement>('.cms-numbered-heading');if(heading)entrance(Array.from(heading.children) as HTMLElement[],heading);for(const item of principles.querySelectorAll<HTMLElement>('article'))entrance(Array.from(item.children) as HTMLElement[],item);continue;}
      const container=section.querySelector<HTMLElement>('.cms-about-width');if(container)entrance(Array.from(container.children) as HTMLElement[],section);
     }
    },element);
    // Keyboard navigation must not leave a focused control inside a transparent entrance.
    const focus=(event:FocusEvent)=>{for(const tween of reveals)if(tween.targets().some(target=>target instanceof HTMLElement&&target.contains(event.target as Node))){tween.progress(1);tween.scrollTrigger?.kill();}};
    element.addEventListener('focusin',focus);
    let active=true;
    const refresh=()=>{if(active&&!disposed)ScrollTrigger.refresh();};
    document.fonts?.ready.then(refresh);
    window.addEventListener('load',refresh,{once:true});
    refresh();
    return()=>{active=false;element.removeEventListener('focusin',focus);window.removeEventListener('load',refresh);context.revert();};
   },element);
  }).catch(()=>{cleanup();});
  return()=>{disposed=true;cleanup();};
 },[revisionKey]);
 return <article className='cms-about' ref={root}>{children}</article>;
}
