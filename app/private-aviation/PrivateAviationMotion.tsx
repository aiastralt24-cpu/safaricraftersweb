"use client";

import { useEffect } from "react";

export function PrivateAviationMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".aviation-page");
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-aviation-reveal]"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      items.forEach((item) => item.dataset.aviationVisible = "true");
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).dataset.aviationVisible = "true";
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -10%", threshold: 0.08 });
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return null;
}
