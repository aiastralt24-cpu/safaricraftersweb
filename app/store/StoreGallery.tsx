"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type StoreImage = { src: string; alt: string; title: string; copy: string };

export default function StoreGallery({ images }: { images: StoreImage[] }) {
  const [active, setActive] = useState<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (active === null) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActive(null);
      if (event.key === "ArrowRight") setActive((current) => current === null ? null : (current + 1) % images.length);
      if (event.key === "ArrowLeft") setActive((current) => current === null ? null : (current - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [active, images.length]);

  const close = () => {
    const previous = active;
    setActive(null);
    requestAnimationFrame(() => { if (previous !== null) triggerRefs.current[previous]?.focus(); });
  };

  const move = (direction: number) => {
    setActive((current) => current === null ? null : (current + direction + images.length) % images.length);
  };

  return (
    <>
      <div className="container store-field-grid" aria-label="Book preview gallery">
        {images.map((image, index) => (
          <figure className={index === 0 ? "store-field-feature" : ""} data-reveal="image" key={image.src}>
            <button
              className="store-field-image"
              type="button"
              ref={(element) => { triggerRefs.current[index] = element; }}
              onClick={() => setActive(index)}
              aria-label={`Open book preview ${index + 1} of ${images.length}: ${image.title}`}
            >
              <Image src={image.src} alt={image.alt} width={1800} height={2400} loading="lazy" sizes={index === 0 ? "(max-width: 760px) 100vw, 58vw" : "(max-width: 760px) 100vw, 30vw"} />
              <span className="store-expand"><Expand size={16} aria-hidden="true" /> View</span>
            </button>
            <figcaption><strong>{image.title}</strong><p>{image.copy}</p></figcaption>
          </figure>
        ))}
      </div>

      {active !== null ? createPortal(
        <div className="store-lightbox" role="dialog" aria-modal="true" aria-label="Book preview viewer">
          <button ref={closeRef} className="store-lightbox-close" type="button" onClick={close} aria-label="Close book preview"><X size={22} aria-hidden="true" /><span>Close</span></button>
          <button className="store-lightbox-previous" type="button" onClick={() => move(-1)} aria-label="Previous preview"><ChevronLeft size={28} aria-hidden="true" /></button>
          <figure>
            <div className="store-lightbox-image"><img src={images[active].src} alt={images[active].alt} /></div>
            <figcaption><div><strong>{images[active].title}</strong><p>{images[active].copy}</p></div><span>{active + 1} / {images.length}</span></figcaption>
          </figure>
          <button className="store-lightbox-next" type="button" onClick={() => move(1)} aria-label="Next preview"><ChevronRight size={28} aria-hidden="true" /></button>
        </div>, document.body
      ) : null}
    </>
  );
}
