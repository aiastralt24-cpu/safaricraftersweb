"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function StoreMotion() {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      elements.forEach((element) => element.dataset.visible = "true");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).dataset.visible = "true";
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10%", threshold: 0.12 }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      const buildExpansions = (scale: number, scrub: number, start: string) => {
        gsap.utils.toArray<HTMLElement>("[data-store-expand]").forEach((frame) => {
          gsap.fromTo(
            frame,
            { scale, borderRadius: "24px", transformOrigin: "50% 50%" },
            {
              scale: 1,
              borderRadius: "14px",
              ease: "none",
              scrollTrigger: {
                trigger: frame,
                start,
                end: "top 22%",
                scrub,
                invalidateOnRefresh: true
              }
            }
          );
        });
      };

      media.add("(min-width: 721px)", () => buildExpansions(0.94, 1.05, "top 92%"));
      media.add("(max-width: 720px)", () => buildExpansions(0.975, 0.65, "top 94%"));
    });

    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(refresh);
    window.addEventListener("load", refresh, { once: true });

    return () => {
      window.removeEventListener("load", refresh);
      media.revert();
      context.revert();
    };
  }, []);

  return null;
}
