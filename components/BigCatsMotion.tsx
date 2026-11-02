'use client';
import { useEffect, useState } from 'react';

export function BigCatsMotion() {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const root=document.getElementById('cats-expedition');
    if (!root) return;
    if (paused) { root.dataset.reduced = "true"; return () => { delete root.dataset.reduced; }; }
    delete root.dataset.reduced;
    let disposed=false;
    let cleanup=()=>{};
    Promise.all([import('gsap'),import('gsap/ScrollTrigger')]).then(([{gsap},{ScrollTrigger}])=>{
      if(disposed) return;
      gsap.registerPlugin(ScrollTrigger);
      const media=gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)',()=>{
        const ctx=gsap.context(()=>{
          gsap.fromTo('.page-hero-meta, .page-hero h1, .page-hero-description, .page-hero .breadcrumbs',{y:24,opacity:0},{y:0,opacity:1,duration:.85,stagger:.09,ease:'power3.out',clearProps:'transform,opacity'});
          gsap.fromTo('.page-hero > img',{scale:1.035},{scale:1,duration:1.5,ease:'power2.out',clearProps:'transform'});
          gsap.utils.toArray<HTMLElement>('.ce-reveal').forEach(el=>gsap.fromTo(el,{y:28,opacity:.25},{y:0,opacity:1,duration:.7,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 92%',once:true},clearProps:'transform,opacity'}));
          gsap.fromTo('.ce-route-line',{scaleX:0},{scaleX:1,ease:'none',scrollTrigger:{trigger:'.ce-route',start:'top 88%',end:'bottom 55%',scrub:.5}});
        },root);
        return ()=>ctx.revert();
      });
      media.add('(min-width: 901px) and (prefers-reduced-motion: no-preference)',()=>{
        root.dataset.story='animated';
        const frames=Array.from(root.querySelectorAll<HTMLElement>('.ce-frame'));
        const chapters=Array.from(root.querySelectorAll<HTMLElement>('.ce-chapter'));
        let current=-1;
        const ctx=gsap.context(()=>{
          const show=(index:number)=>{
            if(current===index)return;
            current=index;
            frames.forEach((frame,i)=>{
              frame.classList.toggle('is-current',i===index);
              gsap.to(frame,{opacity:i===index?1:0,duration:.65,overwrite:true,ease:'power2.inOut'});
            });
            gsap.to('.ce-stage-progress span',{scaleX:(index+1)/frames.length,duration:.5,ease:'power2.out'});
          };
          chapters.forEach((chapter,i)=>ScrollTrigger.create({trigger:chapter,start:'top 58%',end:'bottom 58%',onEnter:()=>show(i),onEnterBack:()=>show(i),onLeaveBack:()=>{if(i===0)show(0);}}));
          const initial=chapters.reduce((selected,chapter,i)=>chapter.getBoundingClientRect().top<window.innerHeight*.58?i:selected,0);
          show(initial);
        },root);
        return ()=>{ctx.revert();delete root.dataset.story;};
      });
      const refresh=()=>{if(!disposed)ScrollTrigger.refresh();};
      document.fonts.ready.then(refresh);
      const afterExpansion=(event:TransitionEvent)=>{if(event.target instanceof HTMLDetailsElement)refresh();};
      root.addEventListener('toggle',refresh,true);
      root.addEventListener('transitionend',afterExpansion);
      cleanup=()=>{root.removeEventListener('toggle',refresh,true);root.removeEventListener('transitionend',afterExpansion);media.revert();};
    }).catch(()=>{delete root.dataset.story;});
    return ()=>{disposed=true;cleanup();};
  },[paused]);
  return <button type="button" className="ce-motion-control" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? "Enable page motion" : "Reduce page motion"}</button>;
}
