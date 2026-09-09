"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { ImageAsset } from "@/lib/data";

export type DestinationFieldNote = {
  label: string;
  title: string;
  copy: string;
  image: ImageAsset;
};

function excerpt(text: string, wordLimit = 58) {
  const words = text.trim().split(/\s+/);
  return words.length > wordLimit ? `${words.slice(0, wordLimit).join(" ")}…` : text;
}

export function DestinationFieldNotes({ destination, notes }: { destination: string; notes: DestinationFieldNote[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const active = notes[activeIndex];
  const isLong = active.copy.trim().split(/\s+/).length > 58;

  function selectNote(index: number) {
    setActiveIndex(index);
    setExpanded(false);
  }

  function moveTab(index: number, key: string) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(key)) return;
    const next = key === "Home" ? 0 : key === "End" ? notes.length - 1 : (index + (["ArrowRight", "ArrowDown"].includes(key) ? 1 : -1) + notes.length) % notes.length;
    selectNote(next);
    requestAnimationFrame(() => tabRefs.current[next]?.focus());
  }

  return <section className="destination-field-notes" aria-labelledby="destination-field-notes-title">
    <header className="container destination-field-notes-heading destination-editorial-heading">
      <p className="eyebrow">Field notes</p>
      <h2 id="destination-field-notes-title"><span>Three ways to read</span><span>{destination}.</span></h2>
      <p>A concise field guide to the landscape, its daily rhythm and the encounters that define it.</p>
    </header>

    <div className="container destination-field-notes-stage">
      <div className="destination-field-notes-image" key={active.image.src}>
        <Image src={active.image.src} alt={active.image.alt} fill sizes="(max-width: 900px) 100vw, 62vw" priority={false} />
        <span aria-hidden="true">{String(activeIndex + 1).padStart(2, "0")}</span>
      </div>

      <div className="destination-field-notes-content">
        <div className="destination-field-notes-tabs" role="tablist" aria-label={`${destination} field notes`}>
          {notes.map((note, index) => <button
            id={`field-note-tab-${index}`}
            key={note.label}
            type="button"
            role="tab"
            ref={(element) => { tabRefs.current[index] = element; }}
            aria-selected={activeIndex === index}
            aria-controls={`field-note-panel-${index}`}
            tabIndex={activeIndex === index ? 0 : -1}
            onClick={() => selectNote(index)}
            onKeyDown={(event) => { moveTab(index, event.key); if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) event.preventDefault(); }}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            {note.label}
          </button>)}
        </div>

        <article
          className="destination-field-note-panel"
          id={`field-note-panel-${activeIndex}`}
          role="tabpanel"
          aria-labelledby={`field-note-tab-${activeIndex}`}
          key={`${active.label}-${expanded}`}
        >
          <p className="eyebrow">{active.label}</p>
          <h3>{active.title}</h3>
          <p>{expanded ? active.copy : excerpt(active.copy)}</p>
          {isLong ? <button type="button" className="destination-field-note-more" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
            {expanded ? "Show less" : "Read the full note"}
          </button> : null}
        </article>
      </div>
    </div>
  </section>;
}
