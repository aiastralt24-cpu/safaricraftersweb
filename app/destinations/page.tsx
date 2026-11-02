import {CmsDestinationListing} from '@/components/CmsDestinationListing';
import {destinationListReader,readPublishedDestinationList} from '@/lib/cms/published-destination-list';
import {reservedDestinationSlugs} from '@/lib/cms/destination-reserved-routes';
import './cms-destination.css';
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { JsonLd } from "@/components/JsonLd";
import { DestinationFinder } from "@/components/DestinationFinder";
import { destinations, getDestination, getRegionalAtlases } from "@/lib/data";
import { breadcrumbSchema } from "@/lib/structured-data";
import "../listing.css";

export const dynamic='force-dynamic';
export const metadata: Metadata = {
  title: "Luxury Safari Destinations",
  description: "Explore private safari destination guides for India, Africa and beyond, with field notes on season, wildlife, access and journey pairings.",
  alternates: { canonical: "/destinations" }
};

export default async function DestinationsPage() {
  const atlases = getRegionalAtlases();
  if(process.env.CMS_DESTINATION_RENDERING_ENABLED==='true'){
    const published=(await readPublishedDestinationList(destinationListReader())).filter(item=>!reservedDestinationSlugs.includes(item.slug));
    return <CmsDestinationListing destinations={published} atlases={atlases.map(atlas=>({slug:atlas.slug,title:atlas.shortTitle,description:atlas.heroCopy}))}/>;
  }
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Destinations", path: "/destinations" }])} />
      <PageHero
        title="The wild, considered."
        titleSize="compact"
        copy="Private journeys shaped by habitat, season and the people who know a place intimately."
        image={getDestination("kanha")!.gallery.find(photo => photo.src.includes("7e01f2bddc64"))!}
        meta="Destinations"
        variant="destination"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Destinations" }]}
      />
      <section className="section atlas-page">
        <div className="atlas-discovery">
          <div className="container atlas-intro">
            <p className="eyebrow">A private atlas</p>
            <h2 className="h2">Remarkable <em className="editorial-accent">places.</em><br />Chosen with <em className="editorial-accent">intent.</em></h2>
            <p>
              Explore the landscapes we know, chosen around what you hope to encounter
              and how you want to travel.
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
