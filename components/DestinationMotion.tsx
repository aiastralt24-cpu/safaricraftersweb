"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function DestinationMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".destination-dossier");
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      const fieldNotes = root.querySelector<HTMLElement>(".destination-field-notes");
      if (fieldNotes) {
        gsap.fromTo(fieldNotes.querySelectorAll(".destination-field-notes-heading > *, .destination-field-notes-stage"), { autoAlpha: 0.55, y: 30 }, {
          autoAlpha: 1, y: 0, stagger: 0.08, ease: "none",
          scrollTrigger: { trigger: fieldNotes, start: "top 92%", end: "top 58%", scrub: 0.68 }
        });
      }

      const galleryHeading = root.querySelector<HTMLElement>("[data-destination-gallery-heading]");
      if (galleryHeading) {
        gsap.fromTo(galleryHeading.children, { autoAlpha: 0, y: 22 }, {
          autoAlpha: 1, y: 0, stagger: 0.07, duration: 0.68, ease: "power2.out",
          scrollTrigger: { trigger: galleryHeading, start: "top 88%", toggleActions: "play none none none", once: true }
        });
      }

      gsap.utils.toArray<HTMLElement>(".destination-photo-journal .gallery-trigger").forEach((frame, index) => {
        gsap.fromTo(frame, { autoAlpha: 0, y: 28, scale: 0.985 }, {
          autoAlpha: 1, y: 0, scale: 1, duration: 0.62, delay: (index % 3) * 0.055, ease: "power2.out",
          scrollTrigger: { trigger: frame, start: "top 92%", toggleActions: "play none none none", once: true }
        });
      });

      gsap.utils.toArray<HTMLElement>(".destination-combos, .destination-plan, .destination-faq-section, .destination-pairings").forEach((section) => {
        gsap.fromTo(section, { autoAlpha: 0.7, y: 28 }, {
          autoAlpha: 1, y: 0, ease: "none",
          scrollTrigger: { trigger: section, start: "top 94%", end: "top 72%", scrub: 0.58 }
        });
      });

      requestAnimationFrame(() => ScrollTrigger.refresh());
    }, root);

    return () => context.revert();
  }, []);

  return null;
}
