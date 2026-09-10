"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function GuidedSafariMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".guided-page");
    if (!root) return;

    const revealItems = Array.from(root.querySelectorAll<HTMLElement>("[data-guided-reveal]"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      revealItems.forEach((item) => item.dataset.guidedVisible = "true");
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).dataset.guidedVisible = "true";
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -9%" });

    revealItems.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add("(min-width: 721px)", () => {
        gsap.fromTo("[data-guided-expand]",
          { scale: 0.92, borderRadius: "24px", transformOrigin: "50% 50%" },
          {
            scale: 1,
            borderRadius: "4px",
            ease: "none",
            scrollTrigger: {
              trigger: "[data-guided-expand]",
              start: "top 94%",
              end: "top 24%",
              scrub: 1.05,
              invalidateOnRefresh: true
            }
          }
        );
      });

      media.add("(max-width: 720px)", () => {
        gsap.fromTo("[data-guided-expand]",
          { scale: 0.975, borderRadius: "18px", transformOrigin: "50% 50%" },
          {
            scale: 1,
            borderRadius: "4px",
            ease: "none",
            scrollTrigger: {
              trigger: "[data-guided-expand]",
              start: "top 96%",
              end: "top 42%",
              scrub: 0.65,
              invalidateOnRefresh: true
            }
          }
        );
      });
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
