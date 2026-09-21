"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Journey } from "@/lib/data";
import { PageHero } from "@/components/PageHero";

const filters = ["All journeys", "Big cats", "Himalaya", "Culture & wildlife", "South India", "Multi-park"] as const;
type JourneyFilter = (typeof filters)[number];

function belongsTo(journey: Journey, filter: JourneyFilter) {
  if (filter === "All journeys") return true;
  const text = [journey.title, journey.category, journey.region, journey.route, journey.wildlifeFocus, journey.style, journey.description, ...(journey.locations ?? [])]
    .filter(Boolean).join(" ").toLowerCase();
  const editorialText = [journey.title, journey.category, journey.style, journey.description]
    .filter(Boolean).join(" ").toLowerCase();
  const title = journey.title.toLowerCase();
  if (filter === "Big cats") return /tiger|leopard|lion|big cat/.test(text);
  if (filter === "Himalaya") return /himalaya|himalayan|firefox|red panda/.test(title);
  if (filter === "Culture & wildlife") return /palace|heritage|culture|architecture|royal/.test(editorialText);
  if (filter === "South India") return /southern|south india|western ghats|kabini|nagarhole/.test(text);
  return /six-park|six park|multi|central india/.test(text);
}

function cleanDuration(duration: string) {
  return duration.replace(/,\s*customisable/i, "").trim();
}

export function JourneyFilm({ journeys }: { journeys: Journey[] }) {
  const atlasRef = useRef<HTMLElement>(null);
  const [filter, setFilter] = useState<JourneyFilter>("All journeys");
  const [activeSlug, setActiveSlug] = useState(journeys[0]?.slug ?? "");
  const heroJourney = journeys[0];
  const filteredJourneys = useMemo(() => journeys.filter((journey) => belongsTo(journey, filter)), [filter, journeys]);
  const activeJourney = filteredJourneys.find((journey) => journey.slug === activeSlug) ?? filteredJourneys[0] ?? journeys[0];

  useEffect(() => {
    if (!atlasRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      const feature = atlasRef.current?.querySelector<HTMLElement>("[data-journey-feature]");
      if (feature) {
        gsap.fromTo(feature,
          { autoAlpha: 0.72, scale: 0.965, y: 28 },
          {
            autoAlpha: 1,
            scale: 1,
            y: 0,
            ease: "none",
            scrollTrigger: {
              trigger: feature,
              start: "top 92%",
              end: "top 44%",
              scrub: 0.75
            }
          }
        );
      }

      const heading = atlasRef.current?.querySelector<HTMLElement>("[data-journey-heading]");
      if (heading) {
        gsap.fromTo(heading.children,
          { autoAlpha: 0.55, y: 24 },
          {
            autoAlpha: 1,
            y: 0,
            stagger: 0.08,
            ease: "none",
            scrollTrigger: {
              trigger: heading,
              start: "top 90%",
              end: "top 60%",
              scrub: 0.65
            }
          }
        );
      }

      gsap.utils.toArray<HTMLElement>("[data-journey-card]").forEach((card) => {
        gsap.fromTo(card,
          { autoAlpha: 0.58, y: 42, scale: 0.985 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            ease: "none",
            scrollTrigger: {
              trigger: card,
              start: "top 94%",
              end: "top 68%",
              scrub: 0.7
            }
          }
        );
      });

      requestAnimationFrame(() => ScrollTrigger.refresh());
    }, atlasRef);

    return () => context.revert();
  }, [filter]);

  if (!heroJourney || !activeJourney) return null;

  const chooseFilter = (nextFilter: JourneyFilter) => {
    setFilter(nextFilter);
    const firstMatch = journeys.find((journey) => belongsTo(journey, nextFilter));
    if (firstMatch) setActiveSlug(firstMatch.slug);
  };

  return (
    <main className="journey-atlas" aria-label="Private journey collection" ref={atlasRef}>
      <PageHero
        title="Journeys, composed."
        copy="Private journeys shaped around your interests, season and preferred pace."
        image={heroJourney.image}
        meta="Private journey collection"
      />

      <section className="journey-atlas-collection" id="journey-collection" aria-labelledby="journey-collection-title">
        <nav className="journey-atlas-filters" aria-label="Filter private journeys">
          {filters.map((item) => (
            <button className={filter === item ? "is-active" : ""} type="button" aria-pressed={filter === item} onClick={() => chooseFilter(item)} key={item}>{item}</button>
          ))}
          <span>{filteredJourneys.length} {filteredJourneys.length === 1 ? "journey" : "journeys"}</span>
        </nav>

        <article className="journey-atlas-feature" aria-live="polite" data-journey-feature>
          <button className="journey-atlas-feature-image" type="button" aria-label={`View ${activeJourney.title}`} onClick={() => window.location.assign(`/journeys/${activeJourney.slug}`)}>
            <Image key={activeJourney.slug} src={activeJourney.image.src} alt={activeJourney.image.alt} fill loading="eager" sizes="(max-width: 780px) 100vw, 64vw" />
          </button>
          <div className="journey-atlas-feature-copy">
            <p>Featured journey</p>
            <h2 id="journey-collection-title">{activeJourney.title}</h2>
            <span>{activeJourney.route || activeJourney.region}</span>
            <dl>
              <div><dt>Duration</dt><dd>{activeJourney.duration}</dd></div>
              <div><dt>Best season</dt><dd>{activeJourney.bestMonths}</dd></div>
            </dl>
            <p className="journey-atlas-description">{activeJourney.description}</p>
            <Link href={`/journeys/${activeJourney.slug}`}>Explore the journey <ArrowRight size={17} strokeWidth={1.25} /></Link>
          </div>
        </article>

        <div className="journey-atlas-heading" data-journey-heading>
          <div><p>The private collection</p><h2>Six ways into the wild.</h2></div>
          <p>Each route is a starting point—privately shaped around season, pace and the encounters that matter to you.</p>
        </div>

        <div className="journey-atlas-grid">
          {filteredJourneys.map((journey, index) => (
            <article className={`journey-atlas-card journey-atlas-card-${index % 3}`} data-journey-card key={journey.slug}>
              <button type="button" onClick={() => setActiveSlug(journey.slug)} aria-label={`Feature ${journey.title}`}>
                <span className="journey-atlas-card-image"><Image src={journey.image.src} alt={journey.image.alt} fill sizes="(max-width: 760px) 100vw, 50vw" /></span>
              </button>
              <div className="journey-atlas-card-copy">
                <h3><Link href={`/journeys/${journey.slug}`}>{journey.title}</Link></h3>
                <p className="journey-atlas-card-route">{journey.region}</p>
                <div className="journey-atlas-card-facts">
                  <span>{cleanDuration(journey.duration)}</span>
                  <span>{journey.bestMonths}</span>
                  <span>Customisable</span>
                </div>
              </div>
            </article>
          ))}
        </div>

        {filteredJourneys.length === 0 ? <p className="journey-atlas-empty">No journeys match this view yet. Speak with us and we will compose one privately.</p> : null}
      </section>
    </main>
  );
}
