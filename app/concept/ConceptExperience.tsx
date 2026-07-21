"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Camera, Compass, Menu, MoveRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import type { ImageAsset } from "@/lib/data";
import { destinations, expeditions, journal, journeys, specialists, testimonials } from "@/lib/data";

const heroJourney = journeys[0];
const featuredDestination = destinations.find((item) => item.slug === "jawai") ?? destinations[0];
const photoExpedition = expeditions[0];
const fieldNotes = journal.slice(0, 3);
const featuredGuestNote = testimonials[0];
const showHomepageGuestNotes = false;

const journalMenuImage: ImageAsset = {
  src: "/assets/safari-crafters/dsc8123-789x1024-1f0b8c48.jpg",
  alt: "Tiger walking toward the camera",
  credit: "Safari Crafters archive"
};

const conservationMenuImage: ImageAsset = {
  src: "/assets/safari-crafters/gallery-1-23-scaled-7f473b1f.jpg",
  alt: "Red panda on a branch",
  credit: "Safari Crafters archive"
};

const privateAviationMenuImage: ImageAsset = {
  src: "/assets/safari-crafters/amer-fort-original-scaled-31b56cd7.jpg",
  alt: "Amer Fort in Jaipur",
  credit: "Safari Crafters archive"
};

const storeMenuImage: ImageAsset = {
  src: "/assets/store/ghosts-of-the-granite-hills-book.jpg",
  alt: "Ghosts of the Granite Hills red clothbound collector's photobook on granite stone",
  credit: "Safari Crafters archive"
};

const reviewsMenuImage: ImageAsset = {
  src: "/assets/safari-crafters/gallery-1-23-scaled-7f473b1f.jpg",
  alt: "Red panda on a branch",
  credit: "Safari Crafters archive"
};

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
    image: journalMenuImage
  },
  {
    key: "reviews",
    label: "Guest Notes",
    href: "/reviews",
    copy: "Quiet proof from private travellers, families and photographers who trusted the brief.",
    image: reviewsMenuImage
  },
  {
    key: "conservation-commitment",
    label: "Conservation Commitment",
    href: "/conservation-commitment",
    copy: "How Safari Crafters gives back through Astral Foundation without asking guests for donations.",
    image: conservationMenuImage
  },
  {
    key: "private-aviation",
    label: "Private Aviation",
    href: "/private-aviation",
    copy: "Company-owned private jets shaping rare, seamless safari circuits across India.",
    image: privateAviationMenuImage
  },
  {
    key: "store",
    label: "Store",
    href: "/store",
    copy: "Collector's editions, field books and photographic works from Safari Crafters.",
    image: storeMenuImage
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
  const [canPlayHeroVideo, setCanPlayHeroVideo] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const desktop = window.matchMedia("(min-width: 768px)").matches;
    const constrained = connection?.saveData || ["slow-2g", "2g"].includes(connection?.effectiveType || "");
    setCanPlayHeroVideo(desktop && !reducedMotion && !constrained);
  }, []);

  useEffect(() => {
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.matchMedia("(max-width: 720px)").matches
    ) {
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

    const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        return;
      }

      if (event.key !== "Tab" || !menuRef.current) return;
      const focusable = Array.from(menuRef.current.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => element.getClientRects().length > 0
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
      const nextIndex = event.shiftKey
        ? (currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1)
        : (currentIndex < 0 || currentIndex === focusable.length - 1 ? 0 : currentIndex + 1);
      event.preventDefault();
      focusable[nextIndex].focus();
    };

    const onFocusIn = (event: FocusEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      menuRef.current?.querySelector<HTMLElement>(".concept-menu-close")?.focus();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocusIn);
    requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>(".concept-menu-close")?.focus());

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocusIn);
      menuButtonRef.current?.focus();
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
          ref={menuButtonRef}
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
        <Image
          className="concept-hero-media concept-hero-poster"
          src={heroJourney.image.src}
          alt={heroJourney.image.alt}
          fill
          priority
          sizes="100vw"
        />
        {canPlayHeroVideo ? (
          <video
            className="concept-hero-media"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={heroJourney.image.src}
            aria-label={heroJourney.image.alt}
          >
            <source src="/assets/safari-crafters/safari-crafters.mp4" type="video/mp4" />
          </video>
        ) : null}
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
        ref={menuRef}
        className={isMenuOpen ? "concept-full-menu is-open" : "concept-full-menu"}
        id="concept-full-menu"
        aria-hidden={!isMenuOpen}
        aria-modal={isMenuOpen ? "true" : undefined}
        role="dialog"
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
                <Image
                  src={item.image.src}
                  alt=""
                  width={1200}
                  height={1600}
                  sizes="40vw"
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
              sighting priorities and traveller preferences.
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

      {showHomepageGuestNotes ? <section className="concept-guest-notes" aria-label="Guest notes">
        <div className="concept-guest-notes-heading">
          <div>
            <p>Guest Notes</p>
            <span>A private journey, remembered</span>
          </div>
          <h2>What remains after the journey.</h2>
        </div>
        <article className="concept-guest-note-feature">
          <blockquote>“{featuredGuestNote.quote}”</blockquote>
          <div className="concept-guest-note-details">
            <div>
              <span>Guest</span>
              <strong>{featuredGuestNote.guestType ?? featuredGuestNote.name}</strong>
              <small>{featuredGuestNote.city}</small>
            </div>
            <div>
              <span>Journey composed</span>
              <strong>{featuredGuestNote.trip}</strong>
              <small>{featuredGuestNote.travelled}</small>
            </div>
          </div>
        </article>
        <Link className="concept-guest-notes-link" href="/reviews">
          Read guest notes <ArrowUpRight size={17} strokeWidth={1.4} />
        </Link>
      </section> : null}

      <section className="concept-species-section">
        <div className="concept-species-image">
          <Image
            src={featuredDestination.image.src}
            alt={featuredDestination.image.alt}
            width={1600}
            height={1200}
            sizes="(max-width: 760px) 100vw, 55vw"
          />
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
                <Image
                  src={article.image.src}
                  alt={article.image.alt}
                  width={1200}
                  height={900}
                  sizes="(max-width: 760px) 100vw, 33vw"
                />
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
          <Image
            src={photoExpedition.image.src}
            alt={photoExpedition.image.alt}
            width={1600}
            height={1200}
            sizes="(max-width: 760px) 100vw, 60vw"
          />
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
            A quiet first brief. Never a package catalogue.
          </span>
        </div>
      </section>
    </div>
  );
}
