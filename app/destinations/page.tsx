import { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CountryEditorialCard } from "@/components/DestinationEditorial";
import { PageHero } from "@/components/PageHero";
import { destinationContinents, destinations, getCountriesByContinent } from "@/lib/data";
import "../listing.css";

export const metadata: Metadata = {
  title: "Luxury Safari Destinations",
  description: "Explore private safari destination guides for India, Africa and beyond, with field notes on season, wildlife, access and journey pairings.",
  alternates: { canonical: "/destinations" }
};

const atlasChapters = {
  India: {
    title: "India",
    introduction: "Tiger forests, high-altitude frontiers and quietly observed wilderness, connected by private routes that reward time and patience.",
    featured: ["india"],
    labels: { india: "Subcontinent in focus" },
    summaries: { india: "From central India's teak forests to Ladakh's austere valleys, each journey is shaped around habitat, season and exceptional field craft." }
  },
  Africa: {
    title: "Africa",
    introduction: "Vast ecosystems read through migration, water, weather and the knowledge of guides who have spent their lives in the field.",
    featured: ["kenya", "rwanda", "botswana"],
    labels: { kenya: "Private conservancies", rwanda: "Primate encounters", botswana: "Water wilderness" },
    summaries: {
      kenya: "Open savannah, private conservancies and deeply experienced guiding create a safari with both scale and intimacy.",
      rwanda: "A considered mountain journey centred on forest, conservation and close, carefully managed encounters with great apes.",
      botswana: "Delta channels, floodplains and remote camps offer a measured safari rhythm far from conventional circuits."
    }
  },
  Americas: {
    title: "The Americas",
    introduction: "Rainforest, wetlands, mountains and polar edges, chosen for meaningful wildlife encounters and landscapes of uncommon scale.",
    featured: ["brazil", "peru", "canada"],
    labels: { brazil: "Wetlands and rainforest", peru: "Andes and Amazon", canada: "Northern wilderness" },
    summaries: {
      brazil: "Jaguar country, flooded grasslands and Amazonian forest explored with specialist naturalists and unhurried days.",
      peru: "Cloud forest, high Andes and Amazon tributaries brought together in a private journey of wildlife and living culture.",
      canada: "Temperate rainforest, tundra and remote coastlines where bears and marine life define the season."
    }
  },
  Arctic: {
    title: "Arctic & Beyond",
    introduction: "Expeditionary travel at the edge of the map, where access, ice conditions and an exceptional team matter more than a fixed itinerary.",
    featured: ["norway"],
    labels: { norway: "High Arctic expeditions" },
    summaries: { norway: "Svalbard's sea ice, fjords and remote archipelago are approached with patience, flexibility and specialist expedition leadership." }
  }
} as const;

export default function DestinationsPage() {
  return (
    <>
      <PageHero
        title="The wild, considered."
        copy="Private journeys shaped by habitat, season and the people who know a place intimately."
        image={destinations[0].image}
        meta="Destinations"
      />
      <section className="section atlas-page">
        <div className="container atlas-intro">
          <p className="eyebrow">A private atlas</p>
          <h2 className="h2">A few remarkable places, chosen with intent.</h2>
          <p>
            This is not an inventory of everywhere we can send you. It is a way into the
            landscapes we know, guided by what you hope to witness and how you want to travel.
          </p>
        </div>
        <nav className="container atlas-region-nav" aria-label="Destination regions">
          {destinationContinents.map((continent) => (
            <Link href={`#${continent.toLowerCase()}`} key={continent}>
              {atlasChapters[continent].title}
            </Link>
          ))}
        </nav>
        {destinationContinents.map((continent) => {
          const countries = getCountriesByContinent(continent);
          const chapter = atlasChapters[continent];
          const featured = chapter.featured
            .map((slug) => countries.find((country) => country.slug === slug))
            .filter((country): country is NonNullable<typeof country> => Boolean(country));
          const remaining = countries.filter((country) => !chapter.featured.includes(country.slug as never));
          if (!countries.length) return null;

          return (
            <div className="container atlas-section" id={continent.toLowerCase()} key={continent}>
              <div className="atlas-section-header">
                <span>Field chapter</span>
                <h2>{chapter.title}</h2>
                <p>{chapter.introduction}</p>
              </div>
              <div className="atlas-country-grid">
                {featured.map((country, index) => (
                  <CountryEditorialCard
                    key={country.slug}
                    country={country}
                    index={index}
                    label={chapter.labels[country.slug as keyof typeof chapter.labels]}
                    summary={chapter.summaries[country.slug as keyof typeof chapter.summaries]}
                  />
                ))}
              </div>
              {remaining.length ? (
                <div className="atlas-country-index">
                  <p>Continue through the region</p>
                  <div>
                    {remaining.map((country) => (
                      <Link href={`/destinations/${country.slug}`} key={country.slug}>
                        <span>{country.title}</span>
                        <ArrowUpRight aria-hidden="true" size={17} strokeWidth={1.4} />
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
        <div className="container atlas-closing">
          <p className="eyebrow">Private travel, personally composed</p>
          <h2>Tell us what draws you into the wild.</h2>
          <p>We will suggest the right geography, season and pace, then build the journey around you.</p>
          <Link className="button button-primary" href="/plan?source=destinations">Begin a private brief</Link>
        </div>
      </section>
    </>
  );
}
