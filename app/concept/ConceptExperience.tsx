"use client";

import Link from "next/link";
import { ArrowUpRight, Camera, Compass, Menu, MoveRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { destinations, expeditions, journal, journeys, specialists } from "@/lib/data";

const heroJourney = journeys[0];
const featuredDestination = destinations.find((item) => item.slug === "jawai") ?? destinations[0];
const tigerDestination = destinations.find((item) => item.slug === "bandhavgarh") ?? destinations[0];
const photoExpedition = expeditions[0];
const fieldNotes = journal.slice(0, 3);

const heroLines = [
  {
    lead: "In pursuit",
    rest: "of",
    accent: "Stillness."
  },
  {
    lead: "Where rare moments",
    rest: "unfold",
    accent: "Beautifully."
  },
  {
    lead: "For sightings",
    rest: "few ever",
    accent: "Frame."
  },
  {
    lead: "Luxury beyond",
    rest: "the",
    accent: "Trail."
  },
  {
    lead: "Crafted for",
    rest: "rare",
    accent: "Encounters."
  }
];

const menuItems = [
  {
    key: "journeys",
    label: "Journeys",
    href: "/journeys",
    copy: "Private safaris signed by specialists, paced around wildlife rather than hotel nights.",
    image: heroJourney.image
  },
  {
    key: "destinations",
    label: "Destinations",
    href: "/destinations",
    copy: "A curated atlas of forests, wetlands, deserts and big-cat country.",
    image: featuredDestination.image
  },
  {
    key: "photo-expeditions",
    label: "Photo Expeditions",
    href: "/photo-expeditions",
    copy: "Field-led departures for photographers who want patience, access and mentorship.",
    image: photoExpedition.image
  },
  {
    key: "journal",
    label: "The Journal",
    href: "/journal",
    copy: "Field notes, conservation intelligence and photographic essays from the wild.",
    image: tigerDestination.image
  },
  {
    key: "conservation-commitment",
    label: "Conservation Commitment",
    href: "/conservation-commitment",
    copy: "How Safari Crafters gives back through Astral Foundation without asking guests for donations.",
    image: tigerDestination.image
  },
  {
    key: "private-aviation",
    label: "Private Aviation",
    href: "/private-aviation",
    copy: "Company-owned private jets shaping rare, seamless safari circuits across India.",
    image: heroJourney.image
  },
  {
    key: "about",
    label: "About",
    href: "/about",
    copy: "Founder story, specialist authority and the conservation philosophy behind each route.",
    image: specialists[0]?.image ?? heroJourney.image
  }
];

export function ConceptExperience() {
  const [activeMenuKey, setActiveMenuKey] = useState(menuItems[0].key);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [activeHeroLine, setActiveHeroLine] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveHeroLine((current) => (current + 1) % heroLines.length);
    }, 6200);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setHasScrolled(window.scrollY > 24);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <div className="concept-page">
      <div
        className={hasScrolled ? "concept-hero-nav is-scrolled" : "concept-hero-nav"}
        aria-label="Concept navigation preview"
      >
        <BrandMark className="concept-brandmark" />
        <div className="concept-nav-spacer" aria-hidden="true" />
        <Link className="concept-nav-cta" href="/plan">
          Plan a Journey
        </Link>
        <button
          className="concept-menu-button"
          type="button"
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMenuOpen}
          aria-controls="concept-full-menu"
          onClick={() => setIsMenuOpen((current) => !current)}
        >
          <Menu size={18} />
        </button>
      </div>
      <section className="concept-hero" aria-label="Safari Crafters luxury concept">
        <video
          className="concept-hero-media"
          autoPlay
          muted
          loop
          playsInline
          poster={heroJourney.image.src}
          aria-label={heroJourney.image.alt}
        >
          <source src="/assets/safari-crafters/safari-crafters.mp4" type="video/mp4" />
        </video>
        <div className="concept-hero-shade" />
        <div className="concept-hero-grid">
          <div className="concept-hero-copy">
            <h1
              key={heroLines[activeHeroLine].accent}
              className="concept-hero-line"
            >
              <span className="concept-hero-line-main">{heroLines[activeHeroLine].lead}</span>
              <br />
              <span className="concept-hero-line-sub">{heroLines[activeHeroLine].rest}</span>
              {" "}
              <span className="concept-hero-line-accent">{heroLines[activeHeroLine].accent}</span>
            </h1>
          </div>
          <div className="concept-hero-dossier" hidden>
            <span>Featured route</span>
            <h2>{heroJourney.title}</h2>
            <p>{heroJourney.destinations.slice(0, 4).join(" / ")}</p>
            <Link href={`/journeys/${heroJourney.slug}`}>
              View journey <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      <div
        className={isMenuOpen ? "concept-full-menu is-open" : "concept-full-menu"}
        id="concept-full-menu"
        aria-hidden={!isMenuOpen}
      >
        <div className="concept-full-menu-top">
          <BrandMark className="concept-brandmark" />
          <button
            className="concept-menu-close"
            type="button"
            aria-label="Close menu"
            onClick={() => setIsMenuOpen(false)}
          >
            <X size={18} />
            <span>Close</span>
          </button>
        </div>
        <div className="concept-full-menu-grid">
          <nav className="concept-full-menu-list" aria-label="Expanded concept menu">
            {menuItems.map((item, index) => (
              <Link
                href={item.href}
                className="concept-full-menu-row"
                key={item.href}
                data-menu-item={item.key}
                data-active={activeMenuKey === item.key ? "true" : undefined}
                onClick={() => setIsMenuOpen(false)}
                onFocus={() => setActiveMenuKey(item.key)}
                onMouseEnter={() => setActiveMenuKey(item.key)}
                onMouseMove={() => setActiveMenuKey(item.key)}
                onPointerEnter={() => setActiveMenuKey(item.key)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h2>{item.label}</h2>
                  <p>{item.copy}</p>
                </div>
                <MoveRight size={24} />
              </Link>
            ))}
          </nav>
          <aside className="concept-full-menu-image">
            <div className="concept-full-menu-image-stack" aria-hidden="true">
              {menuItems.map((item) => (
                <img
                  src={item.image.src}
                  alt=""
                  className={activeMenuKey === item.key ? "is-active" : ""}
                  data-menu-image={item.key}
                  key={item.key}
                />
              ))}
            </div>
          </aside>
          <div className="concept-full-menu-footer">
            <span>Tiger season / November to May</span>
            <Link href="/plan">Plan a private safari</Link>
          </div>
        </div>
      </div>

      <section className="concept-atelier" aria-label="Private Safari Atelier">
        <div className="concept-atelier-copy">
          <p>The Atelier</p>
          <h2>
            Safari Crafters is built for travellers who want the wild interpreted with
            patience, naturalist depth and quiet luxury.
          </h2>
        </div>
        <div className="concept-atelier-grid">
          <article>
            <h3>Private planning</h3>
            <p>
              Every enquiry becomes a considered brief: pace, privacy, lodge style,
              sightings priority and who is travelling.
            </p>
          </article>
          <article>
            <h3>Field intelligence</h3>
            <p>
              Specialists account for zones, gates, permits, transfer timing,
              naturalist quality and seasonal animal movement.
            </p>
          </article>
          <article>
            <h3>Seamless comfort</h3>
            <p>
              Lodges, vehicles, rest time, meals and arrival logistics are planned so
              the wilderness feels immersive, not chaotic.
            </p>
          </article>
          <article>
            <h3>Purposeful access</h3>
            <p>
              Journeys are shaped around ethical viewing, low-crowd windows,
              specialist guides and conservation-aware operators.
            </p>
          </article>
        </div>
      </section>

      <section className="concept-species-section">
        <div className="concept-species-image">
          <img src={featuredDestination.image.src} alt={featuredDestination.image.alt} />
        </div>
        <div className="concept-species-copy">
          <p>Species-led storytelling</p>
          <h2>{featuredDestination.title}: granite, leopards and silence after dusk.</h2>
          <p>
            Destination pages can open around one memorable animal, landscape or
            field moment, then guide the guest into seasons, lodges, specialists and
            photographic opportunities.
          </p>
          <div className="concept-species-facts">
            <div>
              <span>Best window</span>
              <strong>{featuredDestination.bestMonths}</strong>
            </div>
            <div>
              <span>Photography</span>
              <strong>{featuredDestination.photography}</strong>
            </div>
          </div>
          <Link className="concept-text-link" href={`/destinations/${featuredDestination.slug}`}>
            Enter the destination <ArrowUpRight size={15} />
          </Link>
        </div>
      </section>

      <section className="concept-field-notes" aria-label="From the field this week">
        <div className="concept-field-notes-header">
          <div>
            <p>From the field · this week</p>
            <h2>Notes our guides sent in.</h2>
          </div>
          <Link className="concept-text-link" href="/journal">
            The Journal <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="concept-field-notes-grid">
          {fieldNotes.map((article) => (
            <Link className="concept-field-note" href={`/journal/${article.slug}`} key={article.slug}>
              <div>
                <img src={article.image.src} alt={article.image.alt} />
              </div>
              <p>{article.category} · {article.readTime}</p>
              <h3>{article.title}</h3>
            </Link>
          ))}
        </div>
      </section>

      <section className="concept-journey-spread">
        <div className="concept-spread-copy">
          <p>Photo Expedition · Seasonal Departure</p>
          <h2>{photoExpedition.title}</h2>
          <span>{photoExpedition.bestMonths} / {photoExpedition.groupSize}</span>
        </div>
        <div className="concept-spread-image">
          <img src={photoExpedition.image.src} alt={photoExpedition.image.alt} />
        </div>
        <div className="concept-spread-note">
          <Camera size={22} />
          <p>
            Photo Expeditions should feel like signed field commissions: mentor,
            species, equipment, access and portfolio intent visible before the CTA.
          </p>
          <Link href={`/photo-expeditions/${photoExpedition.slug}`}>
            View expedition
          </Link>
        </div>
      </section>

      <section className="concept-concierge">
        <div>
          <Compass size={28} />
          <h2>A planner that behaves like a private concierge.</h2>
        </div>
        <div className="concept-concierge-card">
          <p>Begin with one quiet question.</p>
          <h3>Where should the wild find you first?</h3>
          <div className="concept-choice-row">
            <Link href="/plan?region=india">India</Link>
            <Link href="/plan?region=africa">Africa</Link>
            <Link href="/plan">Surprise me</Link>
          </div>
          <span>
            A quiet first brief. No package catalogue.
          </span>
        </div>
      </section>
    </div>
  );
}
