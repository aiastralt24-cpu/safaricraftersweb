import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { DestinationFinder } from "@/components/DestinationFinder";
import { destinations, getDestination, getRegionalAtlases } from "@/lib/data";
import "../listing.css";

export const metadata: Metadata = {
  title: "Luxury Safari Destinations",
  description: "Explore private safari destination guides for India, Africa and beyond, with field notes on season, wildlife, access and journey pairings.",
  alternates: { canonical: "/destinations" }
};

export default function DestinationsPage() {
  const atlases = getRegionalAtlases();
  return (
    <>
      <PageHero
        title="The wild, considered."
        copy="Private journeys shaped by habitat, season and the people who know a place intimately."
        image={destinations[0].image}
        meta="Destinations"
      />
      <section className="section atlas-page">
        <div className="atlas-discovery">
          <div className="container atlas-intro">
            <p className="eyebrow">A private atlas</p>
            <h2 className="h2">A few remarkable places, chosen with intent.</h2>
            <p>
              This is not an inventory of everywhere we can send you. It is a way into the
              landscapes we know, guided by what you hope to witness and how you want to travel.
            </p>
          </div>
          <div className="container atlas-region-cards" aria-label="Regional destination atlases">
            {atlases.map((atlas) => {
              const destination = getDestination(atlas.heroDestinationSlug) || destinations[0];
              const image = destination.image;
              const anchorId = atlas.continent === "Arctic" ? "arctic" : atlas.slug;
              return (
                <article id={anchorId} key={atlas.slug}>
                  <Link href={`/destinations/${atlas.slug}`} className="atlas-region-card-image">
                    <Image src={image.src} alt={image.alt} fill sizes="(max-width: 760px) 100vw, 50vw" />
                  </Link>
                  <p className="eyebrow">{atlas.meta}</p>
                  <h2><Link href={`/destinations/${atlas.slug}`}>{atlas.shortTitle}</Link></h2>
                  <span>{atlas.heroCopy}</span>
                  <Link className="atlas-region-card-link" href={`/destinations/${atlas.slug}`}>Open the atlas ↗</Link>
                </article>
              );
            })}
          </div>
          <DestinationFinder destinations={destinations} />
        </div>
      </section>
    </>
  );
}
