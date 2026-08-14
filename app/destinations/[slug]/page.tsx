import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DestinationDossier } from "@/components/DestinationDossier";
import { DestinationEditorialCard } from "@/components/DestinationEditorial";
import { JsonLd } from "@/components/JsonLd";
import { IndiaCountryPage } from "@/components/IndiaCountryPage";
import { PageHero } from "@/components/PageHero";
import { destinations, expeditions, getCountryAtlas, getCountryBySlug, getDestination } from "@/lib/data";
import { getFieldIntelligence } from "@/lib/luxury";
import { isApprovedEditorialImage } from "@/lib/media";
import { destinationSeo, getDestinationFaqs, getDestinationPairings, getRelatedJourneys } from "@/lib/content-intelligence";
import { breadcrumbSchema, destinationSchema, faqSchema, siteUrl } from "@/lib/structured-data";
import "../../detail.css";
import "../../listing.css";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  const destinationParams = destinations.map((destination) => ({ slug: destination.slug }));
  const countryParams = getCountryAtlas().map((country) => ({ slug: country.slug }));
  return [...countryParams, ...destinationParams];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const country = getCountryBySlug(slug);
  if (country) {
    return {
      title: country.title,
      description: country.description,
      alternates: { canonical: `/destinations/${country.slug}` }
    };
  }
  const destination = getDestination(slug);
  if (!destination) return {};
  const seo = destinationSeo(destination);
  const galleryHero = destination.gallery.find((image, index) => index > 0 && isApprovedEditorialImage(image))
    || destination.gallery.find(isApprovedEditorialImage);
  const socialImage = galleryHero || destination.image;
  const socialImageUseCount = destinations.filter((item) => item.image.src === socialImage.src).length;
  const hasAccurateSocialImage = isApprovedEditorialImage(socialImage) && (Boolean(galleryHero) || socialImageUseCount === 1);
  return {
    ...seo,
    alternates: { canonical: `/destinations/${destination.slug}` },
    openGraph: {
      ...seo,
      url: `${siteUrl}/destinations/${destination.slug}`,
      ...(hasAccurateSocialImage ? { images: [{ url: socialImage.src, alt: socialImage.alt }] } : {})
    }
  };
}

export default async function DestinationDetailPage({ params }: Props) {
  const { slug } = await params;
  const country = getCountryBySlug(slug);
  if (country) {
    if (country.slug === "india") return <IndiaCountryPage country={country} />;
    return <CountryDestinationPage country={country} />;
  }

  const destination = getDestination(slug);
  if (!destination) notFound();
  const galleryHero = destination.gallery.find((image, index) => index > 0 && isApprovedEditorialImage(image))
    || destination.gallery.find(isApprovedEditorialImage);
  const heroImage = galleryHero || destination.image;
  const heroImageUseCount = destinations.filter((item) => item.image.src === heroImage.src).length;
  const showHeroImage = isApprovedEditorialImage(heroImage) && (Boolean(galleryHero) || heroImageUseCount === 1);
  const intelligence = getFieldIntelligence(destination);
  const faqs = getDestinationFaqs(destination);
  const pairings = getDestinationPairings(destination);
  const relatedJourneys = getRelatedJourneys(destination);
  const relatedExpeditions = expeditions.filter((expedition) =>
    destination.expeditions.some((title) => title.toLowerCase() === expedition.title.toLowerCase())
  );
  const breadcrumbs = [
    { name: "Home", path: "/" },
    { name: "Destinations", path: "/destinations" },
    { name: destination.title, path: `/destinations/${destination.slug}` }
  ];

  return (
    <>
      <JsonLd data={destinationSchema(destination)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={faqSchema(faqs)} />
      <PageHero
        title={destination.title}
        copy={destination.description}
        image={heroImage}
        meta={[destination.country, destination.continent === "Arctic" ? "Arctic / Other" : destination.continent]
          .filter((value, index, values) => values.indexOf(value) === index)
          .join(" · ")}
        showImage={showHeroImage}
      />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Destinations", href: "/destinations" }, { label: destination.title }]} />
      <DestinationDossier
        destination={destination}
        intelligence={intelligence}
        faqs={faqs}
        pairings={pairings}
        relatedJourneys={relatedJourneys}
        relatedExpeditions={relatedExpeditions}
      />
    </>
  );
}

function CountryDestinationPage({ country }: { country: NonNullable<ReturnType<typeof getCountryBySlug>> }) {
  const imageCounts = new Map(country.destinations.map((destination) => [destination.image.src, country.destinations.filter((item) => item.image.src === destination.image.src).length]));
  const countryGalleryHero = country.destinations.flatMap((destination) => destination.gallery).find(isApprovedEditorialImage);
  const countryHeroImage = countryGalleryHero || country.image;
  const countryHeroUseCount = destinations.filter((destination) => destination.image.src === countryHeroImage.src).length;
  const showCountryHeroImage = isApprovedEditorialImage(countryHeroImage) && (Boolean(countryGalleryHero) || countryHeroUseCount === 1);
  return (
    <>
      <PageHero
        title={country.title}
        copy={country.description}
        image={countryHeroImage}
        meta={`${country.continent === "Arctic" ? "Arctic / Other" : country.continent} · Country atlas`}
        showImage={showCountryHeroImage}
      />
      <section className="section atlas-page">
        <div className="container atlas-intro">
          <p className="eyebrow">Country atlas</p>
          <h2 className="h2">Different landscapes. One considered private route.</h2>
          <p>
            Explore the places that define {country.title}, then let a Safari Crafters specialist shape
            the pace, access and sequence around the way you want to travel.
          </p>
        </div>
        <div className="container atlas-section">
          <div className="atlas-section-header">
            <span>{String(country.destinations.length).padStart(2, "0")} places</span>
            <h2>{country.title}</h2>
            <p>From signature wildlife regions to quieter extensions beyond the familiar circuit.</p>
          </div>
          <div className="destination-editorial-grid">
            {country.destinations.map((destination, index) => (
              <DestinationEditorialCard
                key={destination.slug}
                destination={destination}
                index={index}
                showImage={destination.gallery.some(isApprovedEditorialImage) || (isApprovedEditorialImage(destination.image) && (imageCounts.get(destination.image.src) || 0) === 1)}
              />
            ))}
          </div>
        </div>
        <div className="container specialist-callout">
          <p className="eyebrow">Begin here</p>
          <h2 className="h2">Begin a private {country.title} brief.</h2>
          <Link className="button button-solid" href={`/plan?destination=${country.destinations[0]?.slug ?? ""}`}>
            Begin a Private Brief
          </Link>
        </div>
      </section>
    </>
  );
}
