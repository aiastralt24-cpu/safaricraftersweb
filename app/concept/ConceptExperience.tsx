"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, ArrowUpRight, Menu, MoveRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { BrandMark } from "@/components/BrandMark";
import type { ImageAsset } from "@/lib/data";
import { destinations, expeditions, journeys, specialists, testimonials } from "@/lib/data";

const heroJourney = journeys[0];
const featuredDestination = destinations.find((item) => item.slug === "jawai") ?? destinations[0];
const photoExpedition = expeditions[0];
const featuredGuestNote = testimonials[0];
const showHomepageGuestNotes = true;
const showHomepagePrivateAviation = false;
const showHomepageWildestPlaces = true;
const showHomepageConservation = false;
const showHomepagePhotographicWorlds = false;
const showHomepageSpeciesIndex = false;
const showHomepageSpeciesEditorial = false;

const homepageJourneySlugs = [
  "big-cats-of-india",
  "heart-of-the-wildcentral-indias-six-park-safari",
  "trail-of-the-himalayan-firefox-a-red-panda-rhino-expedition"
];

const homepageJourneys = homepageJourneySlugs
  .map((slug) => journeys.find((journey) => journey.slug === slug))
  .filter((journey): journey is (typeof journeys)[number] => Boolean(journey));

const homepageJourneyRailMeta: Record<string, string> = {
  "big-cats-of-india": "India · 21 days",
  "heart-of-the-wildcentral-indias-six-park-safari": "Central India · 22 days",
  "trail-of-the-himalayan-firefox-a-red-panda-rhino-expedition": "Northeast India · 12 days"
};

const destinationStoryCopy: Record<string, { headline: string; description: string; landscape: string }> = {
  jawai: {
    headline: "Granite, leopards and silence after dusk.",
    description: "A landscape of ancient rock and quiet valleys where leopards move unseen. Days unfold slowly; evenings belong to the wild.",
    landscape: "Granite hills, seasonal rivers, thornveld and rural hamlets shape both wildlife and human stories."
  },
  ranthambhore: {
    headline: "Tigers beneath a forest of forgotten walls.",
    description: "Lakes, dry woodland and the weathered ramparts of a hill fort create one of India’s most layered wildlife stages.",
    landscape: "Ancient ruins, open lakes, forest tracks and rocky escarpments give every drive a cinematic sense of place."
  },
  "spiti-valley": {
    headline: "Snow leopards at the edge of the sky.",
    description: "High-altitude valleys reward patience with distant movement, immense scale and the quiet drama of winter tracking.",
    landscape: "Cold desert, snowbound ridges, remote villages and vast Himalayan horizons define the experience."
  },
  singalila: {
    headline: "Red pandas within the cloud forest.",
    description: "Moss, bamboo and shifting mountain mist turn every careful step through Singalila into an intimate forest encounter.",
    landscape: "Temperate forest, rhododendron slopes and high ridgelines create a close, atmospheric wildlife setting."
  },
  bandhavgarh: {
    headline: "Tiger country, written in sal and stone.",
    description: "Dense forest opens into meadows and old pathways, revealing a landscape shaped equally by wildlife and history.",
    landscape: "Sal woodland, grassland clearings, rocky plateaus and ancient caves form a compact, richly textured reserve."
  },
  kanha: {
    headline: "Meadows, barasingha and the long forest light.",
    description: "Kanha’s broad grasslands and sal forests invite unhurried observation, from rare deer to patient predator tracking.",
    landscape: "Open maidans, forest corridors, streams and gentle plateaus create generous environmental compositions."
  }
};

const speciesStoryMeta: Record<string, { name: string; story: string; behaviour: string }> = {
  jawai: {
    name: "Leopard",
    story: "Elusive, adaptable and remarkably at ease among Jawai’s granite outcrops, the leopard is revealed through tracks, silhouettes and patient observation rather than hurried sightings.",
    behaviour: "Rock-dwelling leopards"
  },
  ranthambhore: {
    name: "Bengal Tiger",
    story: "The Bengal tiger moves between lakes, dry forest and ancient ruins with an authority that transforms every alarm call, track and pause into part of a larger story.",
    behaviour: "Territory and waterhole behaviour"
  },
  "spiti-valley": {
    name: "Snow Leopard",
    story: "Built for altitude and almost invisible against the mountains, the snow leopard asks for slow tracking, distant observation and an appreciation of the entire Himalayan ecosystem.",
    behaviour: "Winter movement and tracking"
  },
  singalila: {
    name: "Red Panda",
    story: "A quiet specialist of bamboo and cloud forest, the red panda rewards careful walking and close attention to feeding signs, canopy movement and changing mountain light.",
    behaviour: "Canopy movement and feeding"
  },
  bandhavgarh: {
    name: "Tiger",
    story: "In Bandhavgarh’s compact mosaic of sal forest, meadow and stone, tigers can be understood as individuals—through territories, family histories and changing seasonal routines.",
    behaviour: "Individual territories and family lines"
  },
  kanha: {
    name: "Barasingha",
    story: "Kanha’s hard-ground barasingha is a conservation story written across open meadows: graceful herds, seasonal courtship and the recovery of a species once close to extinction.",
    behaviour: "Herd life and conservation recovery"
  }
};

const destinationStories = ["jawai", "ranthambhore", "spiti-valley", "singalila", "bandhavgarh", "kanha"]
  .map((slug) => destinations.find((destination) => destination.slug === slug))
  .filter((destination): destination is (typeof destinations)[number] => Boolean(destination));

const homepageSpeciesStories = ["jawai", "bandhavgarh", "singalila"]
  .map((slug) => destinationStories.find((destination) => destination.slug === slug))
  .filter((destination): destination is (typeof destinations)[number] => Boolean(destination));

const expeditionRegions: Record<string, string> = {
  "kanha-wildlife-photography-expedition": "India",
  "laikipia-black-leopard-expedition": "Africa",
  "svalbard-expedition": "Polar",
  "the-pantanal-wetlands": "South America"
};

const expeditionLocations: Record<string, string> = {
  "kanha-wildlife-photography-expedition": "Kanha, India",
  "laikipia-black-leopard-expedition": "Laikipia, Kenya",
  "svalbard-expedition": "Svalbard, Norway",
  "the-pantanal-wetlands": "Pantanal, Brazil"
};

const expeditionDossierSides: Record<string, "left" | "right"> = {
  "kanha-wildlife-photography-expedition": "right",
  "laikipia-black-leopard-expedition": "left",
  "the-pantanal-wetlands": "right",
  "svalbard-expedition": "left"
};

const journalMenuImage: ImageAsset = {
  src: "/assets/safari-crafters/dsc8123-789x1024-1f0b8c48.jpg",
  alt: "Tiger walking toward the camera",
  credit: "Safari Crafters archive"
};

const guidedSafariMenuImage: ImageAsset = {
  src: "/assets/safari-crafters/laipikia-001e24e7.jpg",
  alt: "Black leopard walking through Laikipia",
  credit: "Safari Crafters archive"
};

const menuItems = [
  {
    key: "journeys",
    label: "Journeys",
    href: "/journeys",
    image: heroJourney.image
  },
  {
    key: "destinations",
    label: "Destinations",
    href: "/destinations",
    image: featuredDestination.image
  },
  {
    key: "scheduled-departures",
    label: "Scheduled Departures",
    href: "/scheduled-departures",
    image: photoExpedition.image
  },
  {
    key: "guided-bespoke-safaris",
    label: "Travel With A Private Guide",
    href: "/guided-bespoke-safaris",
    image: guidedSafariMenuImage
  },
  {
    key: "journal",
    label: "Journal",
    href: "/journal",
    image: journalMenuImage
  },
  {
    key: "about",
    label: "About",
    href: "/about",
    image: specialists[0]?.image ?? heroJourney.image
  }
];

const utilityLinks = [
  { label: "Photo Expeditions", href: "/photo-expeditions" },
  { label: "Guest Notes", href: "/reviews" },
  { label: "Conservation", href: "/conservation-commitment" },
  { label: "Private Aviation", href: "/private-aviation" },
  { label: "Store", href: "/store" },
  { label: "Contact", href: "/contact" }
];

export function ConceptExperience() {
  const [activeMenuKey, setActiveMenuKey] = useState(menuItems[0].key);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [navSection, setNavSection] = useState("The wild, considered");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeDestinationIndex, setActiveDestinationIndex] = useState(0);
  const [activeJourneySlug, setActiveJourneySlug] = useState(homepageJourneys.at(-1)?.slug ?? homepageJourneys[0]?.slug ?? "");
  const [expeditionFilter, setExpeditionFilter] = useState("India");
  const [activeExpeditionSlug, setActiveExpeditionSlug] = useState(expeditions[0].slug);
  const [featuredDepartureSlug, setFeaturedDepartureSlug] = useState(expeditions[0].slug);
  const [canPlayHeroVideo, setCanPlayHeroVideo] = useState(false);
  const [isHeroVideoReady, setIsHeroVideoReady] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const lastScrollYRef = useRef(0);
  const activeDestination = destinationStories[activeDestinationIndex];
  const activeDestinationStory = destinationStoryCopy[activeDestination.slug];
  const activeSpeciesStory = speciesStoryMeta[activeDestination.slug];
  const filteredExpeditions = expeditionFilter === "All"
    ? expeditions
    : expeditions.filter((expedition) => expeditionRegions[expedition.slug] === expeditionFilter);
  const activeExpedition = filteredExpeditions.find((expedition) => expedition.slug === activeExpeditionSlug) ?? filteredExpeditions[0];
  const featuredDeparture = expeditions.find((expedition) => expedition.slug === featuredDepartureSlug) ?? expeditions[0];
  const activeJourney = homepageJourneys.find((journey) => journey.slug === activeJourneySlug) ?? homepageJourneys[0];
  const activeJourneyIndex = Math.max(0, homepageJourneys.findIndex((journey) => journey.slug === activeJourney?.slug));
  const nextJourney = homepageJourneys[(activeJourneyIndex + 1) % homepageJourneys.length];
  const featuredDepartureIndex = Math.max(0, expeditions.findIndex((expedition) => expedition.slug === featuredDeparture.slug));
  const nextFeaturedDeparture = expeditions[(featuredDepartureIndex + 1) % expeditions.length];

  const showPreviousDestination = () => {
    setActiveDestinationIndex((current) => (current - 1 + destinationStories.length) % destinationStories.length);
  };

  const showNextDestination = () => {
    setActiveDestinationIndex((current) => (current + 1) % destinationStories.length);
  };

  useEffect(() => {
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const constrained = connection?.saveData || ["slow-2g", "2g"].includes(connection?.effectiveType || "");
    setCanPlayHeroVideo(!reducedMotion && !constrained);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const nextY = Math.max(window.scrollY, 0);
      const previousY = lastScrollYRef.current;
      const delta = nextY - previousY;

      setHasScrolled(nextY > 56);
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(scrollable > 0 ? Math.min(100, Math.round((nextY / scrollable) * 100)) : 0);

      if (nextY < 96 || isMenuOpen) {
        setIsNavVisible(true);
      } else if (Math.abs(delta) > 6) {
        setIsNavVisible(delta < 0);
      }

      const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-nav-label]"));
      const current = sections.reduce<HTMLElement | null>((match, section) => {
        return section.getBoundingClientRect().top <= 180 ? section : match;
      }, null);
      setNavSection(current?.dataset.navLabel ?? "The wild, considered");
      lastScrollYRef.current = nextY;
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const revealItems = Array.from(document.querySelectorAll<HTMLElement>("[data-concept-reveal]"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -10%", threshold: 0.08 });

    revealItems.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      const buildExpansions = (scale: number, scrub: number, start: string) => {
        gsap.utils.toArray<HTMLElement>("[data-scroll-expand]").forEach((frame) => {
          gsap.fromTo(frame,
            { scale, borderRadius: "18px", transformOrigin: "50% 50%" },
            {
              scale: 1,
              borderRadius: "4px",
              ease: "none",
              scrollTrigger: {
                trigger: frame,
                start,
                end: "top 22%",
                scrub,
                invalidateOnRefresh: true
              }
            }
          );
        });
      };

      media.add("(min-width: 721px)", () => buildExpansions(0.94, 1.05, "top 92%"));
      media.add("(max-width: 720px)", () => buildExpansions(0.975, 0.65, "top 94%"));
    });

    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(refresh);
    window.addEventListener("load", refresh, { once: true });

    return () => {
      window.removeEventListener("load", refresh);
      media.revert();
      context.revert();
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
        className={`concept-hero-nav${hasScrolled ? " is-scrolled" : ""}${isNavVisible ? "" : " is-hidden"}`}
        style={{ "--nav-progress": `${scrollProgress}%` } as React.CSSProperties}
        aria-label="Concept navigation preview"
      >
        <BrandMark className="concept-brandmark" />
        <span className="concept-nav-context" aria-live="polite">{navSection}</span>
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
      <section className="concept-hero" aria-label="Safari Crafters luxury concept" data-nav-label="The wild, considered">
        <Image
          className="concept-hero-media concept-hero-poster"
          src={heroJourney.image.src}
          alt={heroJourney.image.alt}
          fill
          priority
          loading="eager"
          sizes="100vw"
        />
        {canPlayHeroVideo ? (
          <video
            className={isHeroVideoReady ? "concept-hero-media concept-hero-video is-ready" : "concept-hero-media concept-hero-video"}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={heroJourney.image.src}
            aria-label={heroJourney.image.alt}
            onCanPlay={() => setIsHeroVideoReady(true)}
            onError={() => setCanPlayHeroVideo(false)}
          >
            <source
              src="/assets/safari-crafters/safari-crafters-mobile.mp4"
              media="(max-width: 767px)"
              type="video/mp4"
            />
            <source src="/assets/safari-crafters/safari-crafters.mp4" type="video/mp4" />
          </video>
        ) : null}
        <div className="concept-hero-shade" />
        <div className="concept-hero-grid">
          <div className="concept-hero-copy">
            <p className="concept-hero-kicker">Private and small-group safaris</p>
            <h1 className="concept-hero-line">
              Wildlife journeys,<br /><span className="concept-hero-line-accent">shaped in the field.</span>
            </h1>
            <p className="concept-hero-summary">
              Tailor-made safaris, hosted departures and specialist photography journeys across India and the world&apos;s great wildlife landscapes.
            </p>
            <div className="concept-hero-actions">
              <Link href="#ways-to-journey">Find your journey</Link>
              <Link href="/scheduled-departures">View scheduled departures</Link>
            </div>
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
                <h2>{item.label}</h2>
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
            <nav aria-label="More from Safari Crafters">
              {utilityLinks.map((item) => <Link href={item.href} key={item.href} onClick={() => setIsMenuOpen(false)}>{item.label}</Link>)}
            </nav>
            <Link href="/plan" onClick={() => setIsMenuOpen(false)}>Plan a Safari</Link>
          </div>
        </div>
      </div>

      <section className="concept-story-proof" aria-labelledby="homepage-story-title" data-nav-label="Our story">
        <div className="concept-story-proof-intro">
          <div>
            <p>Our story</p>
            <h2 id="homepage-story-title">Informed <em>by</em> intention,<br />guided <em>by</em> experience.</h2>
          </div>
          <div className="concept-story-proof-copy">
            <p>
              Safari Crafters brings together wildlife knowledge, photography and
              thoughtful travel planning—working with trusted naturalists and local
              partners across the places in which we operate.
            </p>
            <Link href="/about">Discover our story <ArrowRight size={16} strokeWidth={1.25} /></Link>
          </div>
        </div>
        <aside className="concept-legacy-ledger" aria-label="Safari Crafters experience">
          <p>Our experience, measured quietly</p>
          <dl>
            <div>
              <dt>75+</dt>
              <dd>Years of combined expertise</dd>
            </div>
            <div>
              <dt>24+</dt>
              <dd>Countries across our network</dd>
            </div>
            <div>
              <dt>6,000+</dt>
              <dd>Guests hosted</dd>
            </div>
            <div>
              <dt>450+</dt>
              <dd>Journeys privately crafted</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section className="concept-journey-types" id="ways-to-journey" aria-labelledby="journey-types-title" data-nav-label="Ways to journey">
        <h2 id="journey-types-title">
          Choose how you<br />
          want <em>to</em> travel.
        </h2>
        <div className="concept-journey-types-grid">
          <article data-concept-reveal>
            <Image
              src="/assets/safari-crafters/golden-triangle-ae04a20e.jpg"
              alt="A private wildlife journey through India"
              width={900}
              height={600}
              sizes="(max-width: 720px) 100vw, 33vw"
            />
            <h3>Private<br />tailor-made journeys</h3>
            <p>
              Tailored itineraries across India and select wildlife destinations across
              the world, designed around your interests, season, and preferred duration
              and pace.
            </p>
            <Link href="/journeys">View private journeys</Link>
          </article>
          <article data-concept-reveal>
            <Image
              src="/assets/safari-crafters/laipikia-001e24e7.jpg"
              alt="A black leopard photographed on a guided safari"
              width={900}
              height={600}
              sizes="(max-width: 720px) 100vw, 33vw"
            />
            <h3>Hosted<br />small-group safaris</h3>
            <p>
              Fixed-date, host-led journeys for travellers who value informed field access,
              a carefully selected group and a shared safari rhythm.
            </p>
            <Link href="/scheduled-departures">View departures</Link>
          </article>
          <article data-concept-reveal>
            <Image
              src="/assets/safari-crafters/the-pantanal-wetlands-af117fe5.jpg"
              alt="A jaguar photographed during a specialist expedition"
              width={900}
              height={600}
              sizes="(max-width: 720px) 100vw, 33vw"
            />
            <h3>Scheduled<br />photo expeditions</h3>
            <p>
              Fixed-date, specialist-led group departures for photographers who want
              time in the field, expert guidance and the pursuit of a clear photographic
              purpose.
            </p>
            <Link href="/photo-expeditions">View photo expeditions</Link>
          </article>
        </div>
      </section>

      {showHomepageWildestPlaces ? <section className="concept-wildest-places" aria-labelledby="wildest-places-title" data-nav-label="The world’s wildest places">
        <h2 id="wildest-places-title">
          Enter through<br />
          <em>the</em> landscape.
        </h2>
        <div className="concept-wildest-places-copy concept-region-links">
          <Link href="/destinations/india"><strong>India</strong><span>Tigers, leopards and the Himalaya · October to May</span></Link>
          <Link href="/destinations/africa"><strong>Africa</strong><span>Big cats, primates and private conservancies · Year-round</span></Link>
          <Link href="/destinations/americas"><strong>The Americas</strong><span>Jaguars, rainforest and wetlands · Seasonal</span></Link>
          <Link href="/destinations/arctic-beyond"><strong>Arctic &amp; Beyond</strong><span>Polar wildlife and expedition cruising · April to September</span></Link>
        </div>
      </section> : null}

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

      {activeJourney ? <div className="concept-journey-feature-shell">
      <header className="concept-journey-collection-header">
        <div>
          <p>Private journey collection</p>
          <h2 id="private-journey-collection-title">Journeys, composed around you.</h2>
        </div>
        <Link className="concept-text-link" href="/journeys">
          View all journeys <ArrowUpRight size={15} />
        </Link>
      </header>
      <section className="concept-journey-feature" aria-labelledby="homepage-journey-title" data-nav-label="Private journeys" data-scroll-expand>
        <figure className="concept-journey-feature-frame">
          <Image
            key={activeJourney.slug}
            className="concept-journey-feature-image"
            src={activeJourney.image.src}
            alt={activeJourney.image.alt}
            fill
            sizes="(max-width: 760px) 100vw, 66vw"
            style={{ objectPosition: activeJourney.image.focalPoint || "center" }}
          />
        </figure>

        <article className="concept-journey-feature-copy" aria-live="polite">
          <h2 id="homepage-journey-title">{activeJourney.title}</h2>
          <p className="concept-journey-feature-route">{activeJourney.route || activeJourney.region}</p>
          <small>{activeJourney.duration}</small>
          <p className="concept-journey-feature-description">{activeJourney.description}</p>
          <Link href={`/journeys/${activeJourney.slug}`}>
            Explore the journey <ArrowRight size={18} strokeWidth={1.25} />
          </Link>
        </article>

        <nav className="concept-journey-feature-index" aria-label="Select a private journey">
          {homepageJourneys.map((journey) => (
            <button
              className={journey.slug === activeJourney.slug ? "is-active" : ""}
              type="button"
              aria-current={journey.slug === activeJourney.slug ? "true" : undefined}
              onClick={() => setActiveJourneySlug(journey.slug)}
              onMouseEnter={() => setActiveJourneySlug(journey.slug)}
              onFocus={() => setActiveJourneySlug(journey.slug)}
              key={journey.slug}
            >
              <span>{journey.title}</span>
              <small>{homepageJourneyRailMeta[journey.slug] ?? `${journey.region} · ${journey.duration}`}</small>
            </button>
          ))}
          {nextJourney ? (
            <button
              className="concept-journey-next"
              type="button"
              aria-label={`Next journey: ${nextJourney.title}`}
              onClick={() => setActiveJourneySlug(nextJourney.slug)}
            >
              <span>Next</span>
              <ArrowRight size={17} strokeWidth={1.4} aria-hidden="true" />
            </button>
          ) : null}
        </nav>
      </section>
      </div> : null}

      {showHomepageSpeciesEditorial ? <section className="concept-species-editorial" aria-labelledby="species-chapter-title" data-nav-label="Species stories">
        <header className="concept-species-editorial-header">
          <div>
            <p>Species-led storytelling</p>
            <h2 id="species-chapter-title">Follow the animal.<br />Understand its world.</h2>
          </div>
          <p>
            These journeys begin with behaviour rather than a checklist—returning to the
            same landscape long enough to recognise individuals, patterns and change.
          </p>
        </header>
        <div className="concept-species-stories">
          {homepageSpeciesStories.map((destination) => {
            const species = speciesStoryMeta[destination.slug];
            return (
              <article className="concept-species-story" key={destination.slug}>
                <Link className="concept-species-story-image" href={`/destinations/${destination.slug}`}>
                  <Image
                    src={destination.image.src}
                    alt={destination.image.alt}
                    fill
                    sizes="(max-width: 720px) 100vw, 33vw"
                  />
                </Link>
                <div className="concept-species-story-copy">
                  <p>{destination.title}, India</p>
                  <h3>{species.name}</h3>
                  <span>{species.behaviour}</span>
                  <Link href={`/destinations/${destination.slug}`}>
                    Enter the story <ArrowRight size={16} strokeWidth={1.25} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section> : null}

      {showHomepagePhotographicWorlds ? <section className="concept-journey-cinema" aria-labelledby="kanha-cinema-title" data-nav-label="Private journeys">
        <aside className="concept-cinema-rail" aria-label={`${expeditionLocations[activeExpedition.slug]} expedition`}>
          <span>Safari Crafters</span>
          <h2 id="kanha-cinema-title">{expeditionLocations[activeExpedition.slug].split(",")[0]}</h2>
          <small>Photographic worlds</small>
        </aside>
        <nav className="concept-cinema-filters" aria-label="Choose a photographic world">
          <span>Choose a photographic world</span>
          {["India", "Africa", "Polar", "South America"].map((filter) => (
            <button
              className={filter === expeditionFilter ? "is-active" : ""}
              type="button"
              aria-pressed={filter === expeditionFilter}
              onClick={() => {
                setExpeditionFilter(filter);
                const first = expeditions.find((item) => expeditionRegions[item.slug] === filter);
                if (first) setActiveExpeditionSlug(first.slug);
              }}
              key={filter}
            >{filter}</button>
          ))}
        </nav>
        <figure className="concept-cinema-frame">
          <Image
            key={activeExpedition.slug}
            src={activeExpedition.image.src}
            alt={activeExpedition.image.alt}
            fill
            sizes="(max-width: 760px) 100vw, 88vw"
          />
          <figcaption>Signature Photo Expedition · {expeditionFilter}</figcaption>
        </figure>
        <div className="concept-cinema-ledger">
          <dl>
            <div><dt>Departure</dt><dd>{activeExpedition.date ?? activeExpedition.bestMonths}</dd></div>
            <div><dt>Duration</dt><dd>{activeExpedition.duration ?? "By private arrangement"}</dd></div>
            <div><dt>In focus</dt><dd>{activeExpedition.slug === photoExpedition.slug ? "7 wildlife safaris" : activeExpedition.species}</dd></div>
          </dl>
          <Link href={`/photo-expeditions/${activeExpedition.slug}`}>
            View the expedition <ArrowRight size={17} strokeWidth={1.2} />
          </Link>
        </div>
      </section> : null}

      {showHomepagePrivateAviation ? <section className="concept-private-aviation" aria-labelledby="private-aviation-title" data-nav-label="Private jet safaris">
        <div className="concept-private-aviation-header">
          <div>
            <p className="concept-private-aviation-eyebrow">Private Jet Safaris</p>
            <h2 id="private-aviation-title">The wild, without the distance between.</h2>
          </div>
          <Link className="concept-text-link" href="/private-aviation">
            Explore private jet safaris <ArrowUpRight size={15} />
          </Link>
        </div>
        <figure className="concept-private-aviation-image" data-scroll-expand>
          <Image
            src="/assets/kairamya/private-aviation-hero.jpg"
            alt="Safari Crafters private aircraft and crew prepared for a remote safari journey"
            fill
            sizes="100vw"
          />
        </figure>
        <div className="concept-private-aviation-story">
          <div className="concept-private-aviation-benefits">
            <article>
              <span>Private aircraft</span>
              <p>A dedicated aircraft and itinerary shaped around your own rhythm.</p>
            </article>
            <article>
              <span>Remote wilderness</span>
              <p>Reach exceptional landscapes that conventional connections make difficult.</p>
            </article>
            <article>
              <span>Seamless routing</span>
              <p>Move from runway to wilderness with every transfer quietly considered.</p>
            </article>
          </div>
        </div>
      </section> : null}

      <section className="concept-field-notes concept-expedition-calendar" aria-labelledby="expedition-calendar-title" data-nav-label="Photo expeditions">
        <div className="concept-field-notes-header">
          <div>
            <p>Photographic expeditions</p>
            <h2 id="expedition-calendar-title">The next private departures.</h2>
          </div>
          <Link className="concept-text-link" href="/photo-expeditions">
            View all expeditions <ArrowUpRight size={15} />
          </Link>
        </div>
        <div
          className="concept-departure-salon"
          data-concept-reveal
          data-dossier-side={expeditionDossierSides[featuredDeparture.slug] ?? "right"}
        >
          <figure className="concept-departure-salon-image" data-scroll-expand>
            <Image
              key={featuredDeparture.slug}
              src={featuredDeparture.image.src}
              alt={featuredDeparture.image.alt}
              fill
              sizes="(max-width: 760px) 100vw, 78vw"
              style={{ objectPosition: featuredDeparture.image.focalPoint || "center" }}
            />
          </figure>

          <article className="concept-departure-dossier" aria-live="polite">
            <p>The next departure</p>
            <h3>{featuredDeparture.title}</h3>
            <dl>
              <div><dt>Destination</dt><dd>{expeditionLocations[featuredDeparture.slug]}</dd></div>
              <div><dt>Dates</dt><dd>{featuredDeparture.date ?? featuredDeparture.bestMonths}</dd></div>
              <div><dt>Duration</dt><dd>{featuredDeparture.duration ?? "By private arrangement"}</dd></div>
            </dl>
            <Link href={`/photo-expeditions/${featuredDeparture.slug}`}>
              Request expedition details <ArrowRight size={17} strokeWidth={1.25} />
            </Link>
          </article>
        </div>

        <nav className="concept-departure-index" aria-label="Choose a photographic expedition">
          {expeditions.map((expedition) => (
            <button
              className={expedition.slug === featuredDeparture.slug ? "is-active" : ""}
              type="button"
              aria-pressed={expedition.slug === featuredDeparture.slug}
              onClick={() => setFeaturedDepartureSlug(expedition.slug)}
              key={expedition.slug}
            >
              <span>{expeditionLocations[expedition.slug].split(",")[0]}</span>
              <small>{expedition.date ?? expedition.bestMonths}</small>
            </button>
          ))}
          {nextFeaturedDeparture ? (
            <button
              className="concept-departure-next"
              type="button"
              aria-label={`Next expedition: ${nextFeaturedDeparture.title}`}
              onClick={() => setFeaturedDepartureSlug(nextFeaturedDeparture.slug)}
            >
              <span>Next</span>
              <ArrowRight size={17} strokeWidth={1.4} aria-hidden="true" />
            </button>
          ) : null}
        </nav>
        <div className="concept-expedition-enquiry">
          <p>Looking for a different date or a privately crafted departure?</p>
          <Link href="/plan">Enquire privately <ArrowRight size={16} /></Link>
        </div>
      </section>

      {showHomepageConservation ? <section className="concept-conservation-statement" aria-labelledby="conservation-statement-title" data-nav-label="Our responsibility">
        <h2 id="conservation-statement-title">
          We practise<br />
          <em>and</em> support<br />
          responsible<br />
          tourism.
        </h2>
        <div className="concept-conservation-copy">
          <p>Wildlife travel comes with a responsibility to the wild places and the wildlife that make these journeys even possible.</p>
          <p>We favour responsible viewing, experienced local partners and conservation-aware operators. Through our wider conservation work and the Astral Foundation, we also support practical initiatives in wildlife landscapes across India.</p>
          <p>We believe responsible travel should be part of good planning. It is not an optional extra but the very foundation of our ethos.</p>
          <Link href="/conservation-commitment">
            Explore our commitment <ArrowRight size={16} strokeWidth={1.25} />
          </Link>
        </div>
      </section> : null}

      <section className="concept-concierge" data-nav-label="Begin your journey" data-concept-reveal>
        <div>
          <h2>Ready when<br />you are.</h2>
        </div>
        <div className="concept-concierge-card">
          <h3>Where would you like <em>to</em> begin?</h3>
          <div className="concept-choice-row">
            <Link href="/plan?region=India">
              <span>India</span>
              <small>Big Cats · Charismatic Wildlife · Birds · Himalaya · Forests · Archaeology · Ancient Culture</small>
            </Link>
            <Link href="/plan?region=Africa">
              <span>Africa</span>
              <small>Big Cats · Megafauna · Savannah · Private Conservancies · Primates</small>
            </Link>
            <Link href="/plan?region=South%20%26%20Central%20America">
              <span>South &amp; Central America</span>
              <small>Jaguar · Puma · Rainforests · Birds · Wetlands</small>
            </Link>
            <Link href="/plan?region=Arctic%20%26%20Beyond">
              <span>Arctic &amp; Beyond</span>
              <small>High Arctic · Polar Wildlife · Tundra · Expedition Cruising</small>
            </Link>
            <Link href="/plan?region=Surprise%20me">
              <span>Surprise me</span>
              <small>Let our specialists choose the right geography</small>
            </Link>
            <Link className="concept-choice-contact" href="/contact">
              <span>Speak with a specialist</span>
              <small>Begin with a private conversation</small>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
