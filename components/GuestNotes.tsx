"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import "./GuestNotes.css";

type Story = { name: string; category: string; trip: string; quote: string; image: string; alt: string; href: string; anonymous?: boolean };
const filters = ["All", "Private Journeys", "Bespoke Safaris", "Photography Tours"] as const;
function category(story: Story) { return story.category.includes("Photography") ? "Photography Tours" : story.category.includes("Guided") ? "Bespoke Safaris" : "Private Journeys"; }
export function GuestNotes({ stories, compact = false }: { stories: Story[]; compact?: boolean }) {
  const [filter, setFilter] = useState<string>("All");
  const [activeIndex, setActiveIndex] = useState(0);
  const matching = stories.filter(story => filter === "All" || category(story) === filter);
  const visible = compact ? matching.slice(0, 3) : matching;
  if (compact) {
    const story = stories[activeIndex % stories.length];
    if (!story) return null;
    return <section className="guest-notes-feature" aria-label="Guest Notes" data-nav-label="Guest Notes">
      <div className="container">
        <header className="guest-feature-heading"><div><p className="eyebrow">Guest Notes</p><h2>The journey stays <em className="editorial-accent">with you.</em></h2></div><Link href="/reviews">All guest notes ↗</Link></header>
        <div className="guest-feature-spread">
          <figure><Image key={story.image} src={story.image} alt={story.alt} fill sizes="(max-width:700px) 100vw, 35vw" /><figcaption>{story.trip}</figcaption></figure>
          <div className="guest-feature-reading">
            <div className="guest-feature-quote" aria-live="polite" aria-atomic="true"><p className="guest-feature-category">{category(story)}</p><span className="guest-feature-mark" aria-hidden="true">“</span><blockquote>{story.quote}</blockquote><p className="guest-feature-author">{story.anonymous ? "Anonymous guest" : story.name}<span>{story.trip}{story.anonymous ? " · Name withheld" : ""}</span></p></div>
            <div className="guest-feature-controls"><Link href={story.href}>Explore this journey ↗</Link><div><span aria-label={`Guest note ${activeIndex + 1} of ${stories.length}`}>{String(activeIndex + 1).padStart(2, "0")} / {String(stories.length).padStart(2, "0")}</span><button type="button" aria-label="Previous guest note" onClick={() => setActiveIndex((activeIndex - 1 + stories.length) % stories.length)}>←</button><button type="button" aria-label="Next guest note" onClick={() => setActiveIndex((activeIndex + 1) % stories.length)}>→</button></div></div>
          </div>
        </div>
      </div>
    </section>;
  }
  return <section className="guest-notes-browser" aria-label="Guest Notes">
    <div className="container">
      <header><div><p className="eyebrow">Guest Notes</p><h2>Journeys end.<br /><em className="editorial-accent">Memories stay.</em></h2></div><p>In our guests’ own words: the people, places and small details they brought home.</p></header>
      <div className="guest-note-filters" role="group" aria-label="Filter guest notes">{filters.map(item => <button key={item} type="button" aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}</div>
      <p className="guest-note-count" role="status">{compact && matching.length > visible.length ? `${visible.length} of ${matching.length}` : matching.length} guest {matching.length === 1 ? "note" : "notes"}</p>
      <div className="guest-note-grid">{visible.map(story => <article className="guest-note" key={story.name + story.trip}>
        <div className="guest-note-place"><Image src={story.image} alt={story.alt} width={96} height={96} /><div><span>{category(story)}</span><h3>{story.trip}</h3></div></div>
        <blockquote>“{story.quote}”</blockquote>
        <footer><div><strong>{story.anonymous ? "Anonymous guest" : story.name}</strong><span>{story.anonymous ? "Name withheld" : "Safari Crafters guest"}</span></div><Link href={story.href} aria-label={`Explore ${story.trip}`}>Explore ↗</Link></footer>
      </article>)}</div>
      {compact && <Link className="guest-notes-all" href="/reviews">Read all guest notes ↗</Link>}
    </div>
  </section>;
}
