"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ImageAsset } from "@/lib/data";
import "./MediaGallery.css";

export function MediaGallery({ images, label = "Gallery", variant = "grid" }: { images: ImageAsset[]; label?: string; variant?: "grid" | "story" }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const visibleImages = images.slice(0, 9);

  useEffect(() => {
    if (activeIndex === null) return;
    const previousOverflow = document.body.style.overflow;
    const backgroundElements = Array.from(document.body.children)
      .filter((element): element is HTMLElement => element instanceof HTMLElement && !element.classList.contains("media-lightbox"))
      .map((element) => ({ element, inert: element.inert, ariaHidden: element.getAttribute("aria-hidden") }));
    document.body.style.overflow = "hidden";
    backgroundElements.forEach(({ element }) => {
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    });
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveIndex(null);
      if (event.key === "ArrowRight") setActiveIndex((current) => current === null ? null : (current + 1) % visibleImages.length);
      if (event.key === "ArrowLeft") setActiveIndex((current) => current === null ? null : (current - 1 + visibleImages.length) % visibleImages.length);
      if (event.key === "Tab") {
        const controls = Array.from(document.querySelectorAll<HTMLElement>(".media-lightbox button"));
        const first = controls[0];
        const last = controls.at(-1);
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      backgroundElements.forEach(({ element, inert, ariaHidden }) => {
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      });
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex, visibleImages.length]);

  function close() {
    const index = activeIndex;
    setActiveIndex(null);
    requestAnimationFrame(() => { if (index !== null) triggerRefs.current[index]?.focus(); });
  }

  function move(direction: number) {
    setActiveIndex((current) => current === null ? null : (current + direction + visibleImages.length) % visibleImages.length);
  }

  if (!visibleImages.length) return null;
  return (
    <>
      <div className={variant === "story" ? "gallery-grid destination-story-gallery" : "gallery-grid"} aria-label={label}>
        {visibleImages.map((image, index) => (
          <button
            className={`gallery-trigger${variant === "story" ? ` destination-story-frame frame-${index + 1}` : ""}`}
            type="button"
            key={`${image.src}-${index}`}
            ref={(element) => { triggerRefs.current[index] = element; }}
            onClick={() => setActiveIndex(index)}
            aria-label={`Open image ${index + 1} of ${visibleImages.length}: ${image.alt}`}
          >
            <Image src={image.src} alt={image.alt} width={960} height={720} sizes="(max-width: 860px) 50vw, 33vw" loading="lazy" style={{ objectPosition: image.focalPoint || "center" }} />
            <span>{String(index + 1).padStart(2, "0")}</span>
          </button>
        ))}
      </div>
      {activeIndex !== null ? createPortal((
        <div className="media-lightbox" role="dialog" aria-modal="true" aria-label={`${label} image viewer`}>
          <button ref={closeButtonRef} className="media-lightbox-close" type="button" onClick={close} aria-label="Close image viewer"><X aria-hidden="true" size={22} /><span>Close</span></button>
          {visibleImages.length > 1 ? <button className="media-lightbox-previous" type="button" onClick={() => move(-1)} aria-label="Previous image"><ChevronLeft aria-hidden="true" size={28} /></button> : null}
          <figure>
            <div className="media-lightbox-image"><img src={visibleImages[activeIndex].src} alt={visibleImages[activeIndex].alt} loading="eager" decoding="async" /></div>
            <figcaption><p>{visibleImages[activeIndex].alt}</p><span>{visibleImages[activeIndex].credit} · {activeIndex + 1} / {visibleImages.length}</span></figcaption>
          </figure>
          {visibleImages.length > 1 ? <button className="media-lightbox-next" type="button" onClick={() => move(1)} aria-label="Next image"><ChevronRight aria-hidden="true" size={28} /></button> : null}
        </div>
      ), document.body) : null}
    </>
  );
}
