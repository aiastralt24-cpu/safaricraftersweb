"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function AboutMotion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.registerPlugin(ScrollTrigger);

    const context = gsap.context(() => {
      const hero = document.querySelector<HTMLElement>(".page-hero");
      const heroImage = hero?.querySelector<HTMLImageElement>(":scope > img");

      if (hero && heroImage) {
        gsap.fromTo(
          heroImage,
          { scale: 1.065, yPercent: -1.5, transformOrigin: "50% 50%" },
          {
            scale: 1.02,
            yPercent: 3.5,
            ease: "none",
            scrollTrigger: {
              trigger: hero,
              start: "top top",
              end: "bottom top",
              scrub: 0.85,
              invalidateOnRefresh: true
            }
          }
        );

        gsap.fromTo(
          hero.querySelector(".page-hero-scrim"),
          { opacity: 0.9 },
          {
            opacity: 1,
            duration: 1.15,
            ease: "power2.out"
          }
        );
      }

      gsap.utils.toArray<HTMLElement>("[data-about-reveal]").forEach((section) => {
        const items = section.querySelectorAll<HTMLElement>("[data-about-reveal-item]");
        const targets = items.length ? Array.from(items) : Array.from(section.children) as HTMLElement[];

        gsap.fromTo(
          targets,
          { autoAlpha: 0, y: 26 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.82,
            stagger: 0.09,
            ease: "power3.out",
            scrollTrigger: {
              trigger: section,
              start: "top 84%",
              toggleActions: "play none none none",
              once: true
            }
          }
        );
      });

      gsap.utils.toArray<HTMLElement>("[data-about-profile]").forEach((profile) => {
        const portrait = profile.querySelector<HTMLElement>(".founder-portrait");
        const portraitImage = portrait?.querySelector<HTMLImageElement>("img");
        const copy = profile.querySelector<HTMLElement>(":scope > div:last-child");

        if (portrait) {
          gsap.fromTo(
            portrait,
            { autoAlpha: 0, y: 38 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.95,
              ease: "power3.out",
              scrollTrigger: {
                trigger: profile,
                start: "top 82%",
                toggleActions: "play none none none",
                once: true
              }
            }
          );
        }

        if (portraitImage) {
          gsap.fromTo(
            portraitImage,
            { scale: 1.045 },
            {
              scale: 1,
              duration: 1.25,
              ease: "power2.out",
              scrollTrigger: {
                trigger: profile,
                start: "top 82%",
                toggleActions: "play none none none",
                once: true
              }
            }
          );
        }

        if (copy) {
          gsap.fromTo(
            copy.children,
            { autoAlpha: 0, y: 20 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.72,
              stagger: 0.07,
              delay: 0.08,
              ease: "power3.out",
              scrollTrigger: {
                trigger: profile,
                start: "top 78%",
                toggleActions: "play none none none",
                once: true
              }
            }
          );
        }
      });

      requestAnimationFrame(() => ScrollTrigger.refresh());
    });

    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(refresh);
    window.addEventListener("load", refresh, { once: true });

    return () => {
      window.removeEventListener("load", refresh);
      context.revert();
    };
  }, []);

  return null;
}
