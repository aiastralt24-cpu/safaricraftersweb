"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Expedition } from "@/lib/data";
import { PageHero } from "@/components/PageHero";

function shortTitle(title: string) {
  return title
    .replace(/^The /, "")
    .replace(/ Wildlife Photography Expedition$/, "")
    .replace(/ Black Leopard Expedition$/, "")
    .replace(/ Expedition$/, "")
    .replace(/ Wetlands$/, "");
}

function departure(expedition: Expedition) {
  return expedition.date || expedition.bestMonths;
}

export function PhotoExpeditionFilm({ expeditions }: { expeditions: Expedition[] }) {
  const rootRef = useRef<HTMLElement>(null);
  const [activeSlug, setActiveSlug] = useState(expeditions[0]?.slug ?? "");
  const active = expeditions.find((expedition) => expedition.slug === activeSlug) || expeditions[0];

  useEffect(() => {
    if (!rootRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);

    const context = gsap.context(() => {
      const feature = rootRef.current?.querySelector<HTMLElement>("[data-expedition-feature]");
      if (feature) {
        gsap.fromTo(feature, { autoAlpha: 0.72, scale: 0.965, y: 28 }, {
          autoAlpha: 1,
          scale: 1,
          y: 0,
          ease: "none",
          scrollTrigger: { trigger: feature, start: "top 92%", end: "top 44%", scrub: 0.75 }
        });
      }

      const heading = rootRef.current?.querySelector<HTMLElement>("[data-expedition-heading]");
      if (heading) {
        gsap.fromTo(heading.children, { autoAlpha: 0.55, y: 24 }, {
          autoAlpha: 1,
          y: 0,
          stagger: 0.08,
          ease: "none",
          scrollTrigger: { trigger: heading, start: "top 90%", end: "top 60%", scrub: 0.65 }
        });
      }

      gsap.utils.toArray<HTMLElement>("[data-expedition-card]").forEach((card) => {
        gsap.fromTo(card, { autoAlpha: 0.58, y: 42, scale: 0.985 }, {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          ease: "none",
          scrollTrigger: { trigger: card, start: "top 94%", end: "top 68%", scrub: 0.7 }
        });
      });

      requestAnimationFrame(() => ScrollTrigger.refresh());
    }, rootRef);

    return () => context.revert();
  }, []);

  if (!active) return null;

  return (
    <main className="journey-atlas expedition-atlas" aria-label="Photographic expeditions" ref={rootRef}>
      <PageHero
        title="Field craft, framed."
        copy="Small groups, specialist mentorship and patient time in the field."
        image={expeditions[0].image}
        meta="Photographic expeditions"
      />

      <section className="journey-atlas-collection" aria-labelledby="expedition-collection-title">
        <nav className="journey-atlas-filters expedition-atlas-selector" aria-label="Choose a photographic expedition">
          {expeditions.map((expedition) => (
            <button
              className={active.slug === expedition.slug ? "is-active" : ""}
              type="button"
              aria-pressed={active.slug === expedition.slug}
              onClick={() => setActiveSlug(expedition.slug)}
              key={expedition.slug}
            >
              {shortTitle(expedition.title)}
            </button>
          ))}
          <span>{expeditions.length} expeditions</span>
        </nav>

        <article className="journey-atlas-feature" aria-live="polite" data-expedition-feature>
          <button className="journey-atlas-feature-image" type="button" aria-label={`View ${active.title}`} onClick={() => window.location.assign(`/photo-expeditions/${active.slug}`)}>
            <Image key={active.slug} src={active.image.src} alt={active.image.alt} fill loading="eager" sizes="(max-width: 780px) 100vw, 64vw" />
          </button>
          <div className="journey-atlas-feature-copy">
            <p>Featured expedition</p>
            <h2 id="expedition-collection-title">{active.title}</h2>
            <span>{active.route || active.category}</span>
            <dl>
              <div><dt>Duration</dt><dd>{active.duration || `${active.days.length} days`}</dd></div>
              <div><dt>Departure</dt><dd>{departure(active)}</dd></div>
            </dl>
            <p className="journey-atlas-description">{active.description}</p>
            <Link href={`/photo-expeditions/${active.slug}`}>View this expedition <ArrowRight size={17} strokeWidth={1.25} /></Link>
          </div>
        </article>

        <div className="journey-atlas-heading" data-expedition-heading>
          <div><p>The next departures</p><h2>Time in the field.</h2></div>
          <p>Fixed-date, specialist-led expeditions composed around wildlife behaviour, seasonal light and purposeful photography.</p>
        </div>

        <div className="journey-atlas-grid expedition-atlas-grid">
          {expeditions.map((expedition) => (
            <article className="journey-atlas-card expedition-atlas-card" data-expedition-card key={expedition.slug}>
              <button type="button" onClick={() => setActiveSlug(expedition.slug)} aria-label={`Feature ${expedition.title}`}>
                <span className="journey-atlas-card-image"><Image src={expedition.image.src} alt={expedition.image.alt} fill sizes="(max-width: 760px) 100vw, 50vw" /></span>
              </button>
              <div className="journey-atlas-card-copy">
                <h3><Link href={`/photo-expeditions/${expedition.slug}`}>{expedition.title}</Link></h3>
                <p className="journey-atlas-card-route">{expedition.route || expedition.category}</p>
                <div className="journey-atlas-card-facts expedition-atlas-facts">
                  <span>{expedition.duration || `${expedition.days.length} days`}</span>
                  <span>{departure(expedition)}</span>
                  <span>{expedition.groupSize}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
