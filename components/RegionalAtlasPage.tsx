import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { RegionalAtlasMotion } from "@/components/RegionalAtlasMotion";
import {
  destinations,
  expeditions,
  getCountriesByAtlas,
  getDestination,
  getDestinationsByAtlas,
  journeys,
  type Destination,
  type RegionalAtlas
} from "@/lib/data";
import "./RegionalAtlasPage.css";

function concise(value: string, maxWords = 24) {
  const words = value.replace(/\s+/g, " ").trim().split(" ");
  return words.length <= maxWords ? value : `${words.slice(0, maxWords).join(" ").replace(/[,.]$/, "")}…`;
}

function destinationImage(destination: Destination) {
  return destination.image;
}

export function RegionalAtlasPage({ atlas }: { atlas: RegionalAtlas }) {
  const regionDestinations = getDestinationsByAtlas(atlas.slug);
  const countries = getCountriesByAtlas(atlas.slug);
  const heroDestination = getDestination(atlas.heroDestinationSlug) || regionDestinations[0] || destinations[0];
  const featured = atlas.featuredDestinationSlugs.map(getDestination).filter(Boolean) as Destination[];
  const themeDestinations = Array.from(new Set(atlas.themes.flatMap((theme) => theme.destinationSlugs)))
    .map(getDestination)
    .filter(Boolean) as Destination[];
  const themeDestinationColumns = themeDestinations.length >= 7 ? 4 : Math.min(3, themeDestinations.length);
  const destinationTitles = new Set(regionDestinations.map((item) => item.title.toLowerCase()));
  const relatedJourneys = journeys.filter((journey) => journey.destinations.some((name) => destinationTitles.has(name.toLowerCase())));
  const relatedExpeditions = expeditions.filter((expedition) => regionDestinations.some((destination) =>
    destination.expeditions.some((name) => name.toLowerCase() === expedition.title.toLowerCase())
  ));

  return (
    <>
      <PageHero title={atlas.heroTitle} copy={atlas.heroCopy} image={destinationImage(heroDestination)} meta={atlas.meta} />
      <div className="regional-atlas">
        <RegionalAtlasMotion />
        <section className="container regional-atlas-section" aria-labelledby={`${atlas.slug}-ways`}>
          <header className="regional-atlas-heading" data-atlas-reveal>
            <p className="eyebrow">Ways into {atlas.shortTitle}</p>
            <h2 id={`${atlas.slug}-ways`}>Three lenses. One coherent journey.</h2>
            <p>Choose the atmosphere that draws you in; we will shape the sequence around season and access.</p>
          </header>
          <div className="regional-atlas-themes">
            {atlas.themes.map((theme, index) => {
              const imageDestination = getDestination(theme.imageSlug) || heroDestination;
              const themeImages = [imageDestination.image, ...imageDestination.gallery];
              const themeImage = themeImages[theme.imageIndex || 0] || imageDestination.image;
              return (
                <article key={theme.label} data-atlas-reveal style={{ "--atlas-delay": `${index * 70}ms` } as CSSProperties}>
                  <div className="regional-atlas-theme-image">
                    <Image src={themeImage.src} alt={themeImage.alt} fill sizes="(max-width: 760px) 100vw, 33vw" />
                  </div>
                  <p>{theme.label}</p>
                  <h3>{theme.title}</h3>
                  <span>{theme.copy}</span>
                </article>
              );
            })}
          </div>
          <nav className="regional-atlas-theme-directory" aria-labelledby={`${atlas.slug}-theme-destinations`} data-atlas-reveal>
            <div className="regional-atlas-theme-directory-heading">
              <p className="eyebrow" id={`${atlas.slug}-theme-destinations`}>Explore destinations</p>
              <span>{themeDestinations.length} field-led places</span>
            </div>
            <div
              className="regional-atlas-theme-links"
              style={{ "--atlas-destination-columns": themeDestinationColumns } as CSSProperties}
            >
              {themeDestinations.map((destination) => (
                <Link key={destination.slug} href={`/destinations/${destination.slug}`}>
                  <span>{destination.title}</span>
                  <ArrowUpRight size={17} strokeWidth={1.4} aria-hidden="true" />
                </Link>
              ))}
            </div>
          </nav>
        </section>

        <section className="container regional-atlas-section" aria-labelledby={`${atlas.slug}-featured`}>
          <header className="regional-atlas-heading" data-atlas-reveal>
            <p className="eyebrow">A considered edit</p>
            <h2 id={`${atlas.slug}-featured`}>Places that define the atlas.</h2>
            <p>Not a checklist—{featured.length} strong starting {featured.length === 1 ? "point" : "points"}, each with a distinct reason to travel.</p>
          </header>
          <div className={`regional-atlas-featured${featured.length === 1 ? " is-single" : ""}`}>
            {featured.map((destination, index) => (
              <article key={destination.slug} data-atlas-reveal style={{ "--atlas-delay": `${(index % 2) * 70}ms` } as CSSProperties}>
                <Link className="regional-atlas-featured-image" href={`/destinations/${destination.slug}`}>
                  <Image src={destinationImage(destination).src} alt={destinationImage(destination).alt} fill sizes="(max-width: 760px) 100vw, 50vw" />
                </Link>
                <p>{destination.region}</p>
                <h3><Link href={`/destinations/${destination.slug}`}>{destination.title}</Link></h3>
                <span>{concise(destination.description)}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="regional-atlas-countries">
          <div className="container">
            <header className="regional-atlas-heading is-light" data-atlas-reveal>
              <p className="eyebrow">By country</p>
              <h2>Build the geography before the itinerary.</h2>
              <p>Open a country chapter, then move from its signature places to quieter extensions.</p>
            </header>
            <div className="regional-atlas-country-list">
              {countries.map((country, index) => (
                <article key={country.slug} data-atlas-reveal>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div><h3><Link href={country.slug === atlas.slug ? `#${atlas.slug}-collection` : `/destinations/${country.slug}`}>{country.title}</Link></h3><p>{country.destinations.length} {country.destinations.length === 1 ? "place" : "places"}</p></div>
                  <div className="regional-atlas-country-links">
                    {country.destinations.slice(0, 4).map((destination) => <Link key={destination.slug} href={`/destinations/${destination.slug}`}>{destination.title}</Link>)}
                  </div>
                  <Link className="regional-atlas-arrow" href={country.slug === atlas.slug ? `#${atlas.slug}-collection` : `/destinations/${country.slug}`} aria-label={`Explore ${country.title}`}><ArrowUpRight /></Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="container regional-atlas-section" aria-labelledby={`${atlas.slug}-collection`}>
          <header className="regional-atlas-heading" data-atlas-reveal>
            <p className="eyebrow">The complete collection</p>
            <h2 id={`${atlas.slug}-collection`}>{regionDestinations.length} ways into {atlas.shortTitle}.</h2>
            <p>Every field brief uses the same concise format, making places easier to compare without flattening their character.</p>
          </header>
          <div className="regional-atlas-index">
            {regionDestinations.map((destination) => (
              <Link key={destination.slug} href={`/destinations/${destination.slug}`} data-atlas-reveal>
                <span>{destination.title}</span>
                <small>{destination.bestMonths}</small>
                <p>{concise(destination.description, 18)}</p>
                <ArrowUpRight aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>

        {(relatedJourneys.length > 0 || relatedExpeditions.length > 0) && (
          <section className="container regional-atlas-related" data-atlas-reveal>
            <p className="eyebrow">Travel this atlas</p>
            <h2>Journeys already taking shape.</h2>
            <div>
              {relatedJourneys.slice(0, 4).map((journey) => <Link key={journey.slug} href={`/journeys/${journey.slug}`}><span>{journey.title}</span><small>{journey.duration} · {journey.bestMonths}</small></Link>)}
              {relatedExpeditions.slice(0, 4).map((expedition) => <Link key={expedition.slug} href={`/photo-expeditions/${expedition.slug}`}><span>{expedition.title}</span><small>{expedition.duration || "Private departure"} · {expedition.bestMonths}</small></Link>)}
            </div>
          </section>
        )}

        <section className="container regional-atlas-cta" data-atlas-reveal>
          <p className="eyebrow">Begin planning</p>
          <h2>{atlas.closingTitle}</h2>
          <p>{atlas.closingCopy}</p>
          <Link className="button button-solid" href={`/plan?region=${encodeURIComponent(atlas.shortTitle)}`}>Begin a Private Journey</Link>
        </section>
      </div>
    </>
  );
}
