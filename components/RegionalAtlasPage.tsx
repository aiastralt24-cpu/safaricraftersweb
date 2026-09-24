import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
import { AtlasDepartures } from "@/components/AtlasDepartures";
import { PageHero } from "@/components/PageHero";
import { JsonLd } from "@/components/JsonLd";
import { RegionalAtlasMotion } from "@/components/RegionalAtlasMotion";
import africaAtlasImages from "@/content/africa-atlas-images.json";
import { getAtlasHeroImage } from "@/lib/media";
import {
  destinations,
  expeditions,
  getCountriesByAtlas,
  getDestination,
  getDestinationsByAtlas,
  journeys,
  type Destination,
  type ImageAsset,
  type RegionalAtlas
} from "@/lib/data";
import { breadcrumbSchema } from "@/lib/structured-data";
import "./RegionalAtlasPage.css";

function concise(value: string, maxWords = 24) {
  const words = value.replace(/\s+/g, " ").trim().split(" ");
  return words.length <= maxWords ? value : `${words.slice(0, maxWords).join(" ").replace(/[,.]$/, "")}…`;
}

function destinationImage(destination: Destination) {
  return destination.image;
}

export function RegionalAtlasPage({ atlas }: { atlas: RegionalAtlas }) {
  const isArcticBeyond = atlas.slug === "arctic-beyond";
  const generatedImages: Record<string, ImageAsset> = atlas.slug === "africa" ? africaAtlasImages : {};
  const atlasImage = (destination: Destination, role: "destination" | "featured" = "destination") =>
    generatedImages[role === "featured" ? `featured-${destination.slug}` : destination.slug] || destinationImage(destination);
  const regionDestinations = getDestinationsByAtlas(atlas.slug);
  const countries = getCountriesByAtlas(atlas.slug);
  const isIndia = atlas.slug === "india";
  const countryCollectionSlugs: Record<string, string[]> = {
    africa: ["kenya", "tanzania", "uganda"],
    americas: ["brazil", "chile", "costa-rica", "colombia"]
  };
  const selectedCountries = countryCollectionSlugs[atlas.slug]?.flatMap((slug) => {
    // Chile has its own destination page within the combined Chile/Argentina country group.
    const place = countries.find((country) => country.slug === slug) || getDestination(slug);
    return place ? [{ slug: place.slug, title: place.title, image: generatedImages[slug] || place.image }] : [];
  });
  const collection = isIndia ? regionDestinations : selectedCountries || countries;
  const showCountryIndex = false;
  const heroDestination = getDestination(atlas.heroDestinationSlug) || regionDestinations[0] || destinations[0];
  const featured = atlas.featuredDestinationSlugs.map(getDestination).filter(Boolean) as Destination[];
  const destinationTitles = new Set(regionDestinations.map((item) => item.title.toLowerCase()));
  const relatedJourneys = journeys.filter((journey) => journey.destinations.some((name) => destinationTitles.has(name.toLowerCase())));
  const relatedExpeditions = expeditions.filter((expedition) => regionDestinations.some((destination) =>
    destination.expeditions.some((name) => name.toLowerCase() === expedition.title.toLowerCase())
  ));
  const isSingleDestination = regionDestinations.length === 1;
  const singleDestination = regionDestinations[0];
  const singleTravelOption = relatedExpeditions[0]
    ? {
        href: `/photo-expeditions/${relatedExpeditions[0].slug}`,
        label: "Photo expedition",
        title: relatedExpeditions[0].title,
        meta: `${relatedExpeditions[0].duration || "Private departure"} · ${relatedExpeditions[0].bestMonths}`
      }
    : relatedJourneys[0]
      ? {
          href: `/journeys/${relatedJourneys[0].slug}`,
          label: "Private journey",
          title: relatedJourneys[0].title,
          meta: `${relatedJourneys[0].duration} · ${relatedJourneys[0].bestMonths}`
        }
      : null;
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Destinations", href: "/destinations" },
    { label: atlas.shortTitle }
  ];

  return (
    <>
      <JsonLd data={breadcrumbSchema(breadcrumbItems.map((item) => ({ name: item.label, path: item.href ?? `/destinations/${atlas.slug}` })))} />
      <PageHero title={atlas.heroTitle} copy={atlas.heroCopy} image={getAtlasHeroImage(atlas, heroDestination)} meta={atlas.meta} variant="destination" breadcrumbs={breadcrumbItems} />
      <div className={`regional-atlas${isSingleDestination ? " is-single-destination" : ""}`}>
        <RegionalAtlasMotion />

        {isSingleDestination && singleDestination && (
          <section className="container regional-atlas-single" aria-labelledby={`${atlas.slug}-focus`}>
            <header className="regional-atlas-heading" data-atlas-reveal>
              <p className="eyebrow">The atlas, distilled</p>
              <h2 id={`${atlas.slug}-focus`}>One place, fully considered.</h2>
              <p>{singleDestination.description}</p>
            </header>
            <div className="regional-atlas-single-stage">
              <Link className="regional-atlas-single-image" href={`/destinations/${singleDestination.slug}`} data-atlas-reveal>
                <Image
                  src={destinationImage(singleDestination).src}
                  alt={destinationImage(singleDestination).alt}
                  fill
                  sizes="(max-width: 760px) 100vw, 62vw"
                />
              </Link>
              <div className="regional-atlas-single-copy" data-atlas-reveal>
                <p className="eyebrow">{singleDestination.region}</p>
                <h3>{singleDestination.title}</h3>
                <p>{concise(singleDestination.intro, 42)}</p>
                <dl>
                  <div><dt>Best time</dt><dd>{singleDestination.bestMonths}</dd></div>
                  <div><dt>Come for</dt><dd>{singleDestination.bestFor.slice(0, 2).join(" · ")}</dd></div>
                </dl>
                <Link className="text-link" href={`/destinations/${singleDestination.slug}`}>Explore {singleDestination.title} <ArrowUpRight aria-hidden="true" /></Link>
                {singleTravelOption && (
                  <Link className="regional-atlas-single-journey" href={singleTravelOption.href}>
                    <span>{singleTravelOption.label}</span>
                    <strong>{singleTravelOption.title}</strong>
                    <small>{singleTravelOption.meta}</small>
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                )}
              </div>
            </div>
          </section>
        )}

        {!isSingleDestination && <section className="container regional-atlas-section" aria-labelledby={`${atlas.slug}-featured`}>
          <header className="regional-atlas-heading" data-atlas-reveal>
            <p className="eyebrow">Signature places</p>
            <h2 id={`${atlas.slug}-featured`}>{isArcticBeyond ? "Two landscapes. Two distinct journeys." : "Places that define the atlas."}</h2>
            {isArcticBeyond
              ? <p>Follow the sea ice in Svalbard or explore the volcanic wilderness of Kamchatka.</p>
              : <p>Not a checklist—{featured.length} strong starting {featured.length === 1 ? "point" : "points"}, each with a distinct reason to travel.</p>}
            {atlas.slug === "africa" && <p>Atlas imagery is AI-generated to illustrate each destination’s wildlife and landscapes.</p>}
          </header>
          <div className={`regional-atlas-featured${featured.length === 1 ? " is-single" : ""}`}>
            {featured.map((destination, index) => (
              <article key={destination.slug} data-atlas-reveal style={{ "--atlas-delay": `${(index % 2) * 70}ms` } as CSSProperties}>
                <Link className="regional-atlas-featured-image" href={`/destinations/${destination.slug}`}>
                  <Image src={atlasImage(destination, "featured").src} alt={atlasImage(destination, "featured").alt} fill sizes="(max-width: 760px) 100vw, 50vw" />
                </Link>
                <p>{isArcticBeyond && destination.slug === "kamchatka" ? "Russian Far East" : destination.region}</p>
                <h3><Link href={`/destinations/${destination.slug}`}>{destination.title}</Link></h3>
                <span>{isArcticBeyond
                  ? destination.slug === "svalbard"
                    ? "Glaciers, sea ice and Arctic wildlife, explored through private and small-group journeys shaped around the season."
                    : "Brown bears, salmon waters and volcanic landscapes, with a Pacific coast shaped by weather and confirmed access."
                  : concise(destination.description)}</span>
                {isArcticBeyond && <Link className="regional-atlas-explore" href={`/destinations/${destination.slug}`}>Explore {destination.title} <ArrowUpRight size={17} aria-hidden="true" /></Link>}
              </article>
            ))}
          </div>
        </section>}

        {showCountryIndex && countries.length > 1 && (
          <section className="regional-atlas-countries">
            <div className="container">
              <header className="regional-atlas-heading is-light" data-atlas-reveal>
                <p className="eyebrow">By country</p>
                <h2>Build the geography before the itinerary.</h2>
                <p>Open a country chapter, then move from its signature places to quieter extensions.</p>
              </header>
              <div className="regional-atlas-country-list">
                {countries.map((country, index) => {
                  const children = country.destinations.filter((destination) => destination.slug !== country.slug);
                  const places = children.length ? children : country.destinations;
                  return (
                  <article key={country.slug} data-atlas-reveal>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div><h3><Link href={country.slug === atlas.slug ? `#${atlas.slug}-collection` : `/destinations/${country.slug}`}>{country.title}</Link></h3><p>{places.length} {places.length === 1 ? "place" : "places"}</p></div>
                    <div className="regional-atlas-country-links">
                      {places.slice(0, 4).map((destination) => <Link key={destination.slug} href={`/destinations/${destination.slug}`}>{destination.title}</Link>)}
                    </div>
                    <Link className="regional-atlas-arrow" href={country.slug === atlas.slug ? `#${atlas.slug}-collection` : `/destinations/${country.slug}`} aria-label={`Explore ${country.title}`}><ArrowUpRight /></Link>
                  </article>
                ); })}
              </div>
            </div>
          </section>
        )}

        {!isSingleDestination && !isArcticBeyond && <section className="container regional-atlas-section" aria-labelledby={`${atlas.slug}-collection`}>
          <header className="regional-atlas-heading" data-atlas-reveal>
            <p className="eyebrow">The complete collection</p>
            <h2 id={`${atlas.slug}-collection`}>{isIndia ? "Explore India’s wild places." : `Explore ${atlas.shortTitle} by country.`}</h2>
            <p>{isIndia ? "Choose a destination to discover its wildlife, landscapes and field brief." : "Choose a country to discover its landscapes, wildlife and places to explore."}</p>
          </header>
          <div className="regional-atlas-index">
            {collection.map((place, index) => (
              <Link
                className="regional-atlas-place-card"
                key={place.slug}
                href={`/destinations/${place.slug}`}
                data-atlas-reveal
                style={{ "--atlas-delay": `${(index % 3) * 60}ms` } as CSSProperties}
              >
                <Image
                  src={place.image.src}
                  alt={place.image.alt}
                  fill
                  sizes="(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 33vw"
                />
                <span className="regional-atlas-place-shade" aria-hidden="true" />
                <span className="regional-atlas-place-copy">
                  <strong>{place.title}</strong>
                </span>
                <ArrowUpRight aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>}

        {!isSingleDestination && <AtlasDepartures id={atlas.slug} expeditions={relatedExpeditions.slice(0, 4)} journeys={isArcticBeyond ? [] : relatedJourneys.slice(0, 4)} />}

      </div>
    </>
  );
}
