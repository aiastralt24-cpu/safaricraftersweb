'use client';

import {useEffect, useRef, type ReactNode} from 'react';

/** Server content stays visible until the browser can enhance this instance. */
export function CmsAviationMotion({children, revisionKey}: {children: ReactNode; revisionKey: string}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element || !('IntersectionObserver' in window) || !element.animate) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const animations = new Map<HTMLElement, Animation>();
    let observer: IntersectionObserver | undefined;
    const clear = () => {
      observer?.disconnect();
      animations.forEach(animation => animation.cancel());
      animations.clear();
    };
    const configure = () => {
      clear();
      if (preference.matches) return;
      observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          animations.get(entry.target as HTMLElement)?.play();
          observer?.unobserve(entry.target);
        }
      }, {threshold: 0, rootMargin: '0px 0px -8%'});
      for (const section of element.querySelectorAll<HTMLElement>('[data-cms-motion="fade"], [data-cms-motion="reveal"]')) {
        for (const child of Array.from(section.children)) {
          if (!(child instanceof HTMLElement)) continue;
          const reveal = section.dataset.cmsMotion === 'reveal';
          const animation = child.animate([
            {opacity: 0, transform: reveal ? 'translateY(16px)' : 'none'},
            {opacity: 1, transform: 'none'},
          ], {duration: 520, easing: 'cubic-bezier(.2,0,0,1)', fill: 'both'});
          animation.pause();
          animation.onfinish = () => { animation.cancel(); animations.delete(child); };
          animations.set(child, animation);
          observer.observe(child);
        }
      }
    };
    const focus = (event: FocusEvent) => {
      for (const [target, animation] of animations) {
        if (target.contains(event.target as Node)) {
          observer?.unobserve(target);
          animation.cancel();
          animations.delete(target);
        }
      }
    };
    configure();
    element.addEventListener('focusin', focus);
    preference.addEventListener('change', configure);
    return () => {
      clear();
      element.removeEventListener('focusin', focus);
      preference.removeEventListener('change', configure);
    };
  }, [revisionKey]);
  return <div ref={root} className='aviation-page cms-aviation-page' data-cms-revision={revisionKey}>{children}</div>;
}
