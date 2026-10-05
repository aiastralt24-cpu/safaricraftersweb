"use client";

import { useEffect, useRef } from "react";

const numberFormat = new Intl.NumberFormat("en-US");

export function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const formatted = `${numberFormat.format(value)}+`;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const finish = () => {
      cancelAnimationFrame(frame);
      element.textContent = formatted;
    };
    if (motion.matches || !("IntersectionObserver" in window)) return;

    element.textContent = "0+";
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - start) / 1800, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        element.textContent = `${numberFormat.format(Math.round(value * eased))}+`;
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    observer.observe(element);

    const onMotionChange = () => {
      if (motion.matches) {
        observer.disconnect();
        finish();
      }
    };
    motion.addEventListener("change", onMotionChange);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", onMotionChange);
      finish();
    };
  }, [value, formatted]);

  return (
    <span className="experience-count">
      <span className="experience-count-final">{formatted}</span>
      <span className="experience-count-animated" aria-hidden="true" ref={ref}>{formatted}</span>
    </span>
  );
}
