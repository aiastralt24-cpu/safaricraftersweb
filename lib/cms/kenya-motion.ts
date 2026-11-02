/** Progressive enhancement scoped to the element’s owning document, including preview iframes. */
export function startKenyaMotion(element:HTMLElement){
    const view=element.ownerDocument.defaultView as (Window & typeof globalThis)|null;
    if (!view || !('IntersectionObserver' in view) || !element.animate) return;
    const preference = view.matchMedia('(prefers-reduced-motion: reduce)');
    const animations = new Map<HTMLElement, Animation>();
    const revealed = new Set<HTMLElement>();
    let observer: IntersectionObserver | undefined;
    const clear = () => {
      observer?.disconnect();
      animations.forEach(animation => animation.cancel());
      animations.clear();
    };
    const configure = () => {
      clear();
      if (preference.matches) return;
      observer = new view.IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          revealed.add(entry.target as HTMLElement);
          animations.get(entry.target as HTMLElement)?.play();
          observer?.unobserve(entry.target);
        }
      }, {threshold: 0, rootMargin: '0px 0px -8%'});
      for (const section of element.querySelectorAll<HTMLElement>('[data-cms-motion="fade"], [data-cms-motion="reveal"]')) {
        for (const child of Array.from(section.children)) {
          if (!(child instanceof view.HTMLElement) || child.matches('.cms-kenya-hero-image,.page-hero-scrim,.page-hero-credit')) continue;
          if (revealed.has(child)) continue;
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
          revealed.add(target);
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
}
