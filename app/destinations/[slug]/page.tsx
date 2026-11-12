import {CmsTanzaniaPage} from '@/components/CmsTanzaniaPage';
import {readPublishedTanzania,usesCmsTanzania} from '@/lib/cms/published-tanzania';
import {CmsKenyaPage} from '@/components/CmsKenyaPage';
import {readPublishedKenya,usesCmsKenya} from '@/lib/cms/published-kenya';
import {resolvedSeoMetadata} from '@/lib/cms/seo-metadata';
import {readSeoDefaults} from '@/lib/cms/seo-settings';
import {reservedDestinationSlugs} from '@/lib/cms/destination-reserved-routes';
import {cache} from 'react';
import {CmsDestination} from '@/components/CmsDestination';
import {publicDestinationConfig,readPublishedDestination} from '@/lib/cms/public-destination-runtime';
import {publishedDestinationMetadata,usesCmsDestination} from '@/lib/cms/destination-route';
import '../cms-destination.css';
import { siteContent } from "@/lib/data";
import { EditorialFilm } from "@/components/EditorialFilm";
import { BrazilCountryPage } from "@/components/BrazilCountryPage";
import { brazilDescription } from "@/content/brazil-editorial";
import { UgandaRwandaCountryPage } from "@/components/UgandaRwandaCountryPage";
import { ugandaDescription } from "@/content/uganda-rwanda-editorial";
import { tanzaniaDescription } from "@/content/tanzania-editorial";
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { TanzaniaCountryPage } from "@/components/TanzaniaCountryPage";
import { KenyaCountryPage } from "@/components/KenyaCountryPage";
import { kenyaDescription } from "@/content/kenya-editorial";
import { DestinationDossier } from "@/components/DestinationDossier";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { MediaGallery } from "@/components/MediaGallery";
import { RegionalAtlasPage } from "@/components/RegionalAtlasPage";
import { destinations, expeditions, getCountryAtlas, getCountryBySlug, getDestination, getRegionalAtlas, getRegionalAtlases } from "@/lib/data";
import { getFieldIntelligence } from "@/lib/luxury";
import { getCountryHeroImage, getDestinationHeroImage, isApprovedEditorialImage } from "@/lib/media";
import { destinationSeo, getDestinationFaqs, getDestinationPairings, getRelatedJourneys } from "@/lib/content-intelligence";
import { breadcrumbSchema, destinationSchema, faqSchema, siteUrl } from "@/lib/structured-data";
import "../../detail.css";
import "../../listing.css";

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamic='force-dynamic';
const cmsTanzania=cache(()=>readPublishedTanzania());
const cmsKenya=cache(()=>readPublishedKenya());
const cmsDestination=cache((slug:string)=>readPublishedDestination(slug,publicDestinationConfig()));

const heroIntroductions: Record<string, string> = {
  jawai: "Granite hills, wild leopards and Rabari herders: a landscape shaped by a remarkable coexistence.",
  kanha: "Tigers among tall sal trees, barasingha in golden meadows and patient mornings in the forest.",
  panna: "Ancient rock, dry forest and the emerald Ken River: tiger country with a landscape all its own.",
  kabini: "Elephants, tigers and forest encounters along the Kabini River, between two iconic national parks.",
  russia: "Brown bears, volcanic peaks and a rugged Pacific coast. Discover Russia through the remote wilderness of Kamchatka.",
  kamchatka: "Volcanoes, salmon-filled rivers, immense brown bears and wild Pacific coastlines – Kamchatka is where fire and water have created one of the planet’s great wildlife frontiers."
};

function destinationHeroCopy(slug: string, description: string) {
  return (siteContent.contentSource === "sanity" ? description : heroIntroductions[slug]) || description
    .replace(/, with private journeys planned around.*$/, ".")
    .replace(/ and best understood through a carefully paced stay\.$/, ".");
}

function conciseCountryCopy(value: string, maxWords = 26) {
  const words = value.replace(/\s+/g, " ").trim().split(" ");
  return words.length <= maxWords ? value : `${words.slice(0, maxWords).join(" ").replace(/[,.]$/, "")}…`;
}

export function generateStaticParams() {
  const destinationParams = destinations.filter(destination=>!usesCmsDestination(destination.slug,reservedDestinationSlugs)).map((destination) => ({ slug: destination.slug }));
  const countryParams = getCountryAtlas().map((country) => ({ slug: country.slug }));
  const atlasParams = getRegionalAtlases().map((atlas) => ({ slug: atlas.slug }));
  return Array.from(new Map([...atlasParams, ...countryParams, ...destinationParams].map((item) => [item.slug, item])).values());
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if(slug==='tanzania'&&usesCmsTanzania()){
    const published=await cmsTanzania();
    if(!published)return {robots:{index:false,follow:false}};
    const {content:{page},seoDefaults}=published;
    return resolvedSeoMetadata(page.seo,seoDefaults,{origin:'https://safaricrafters.com',path:page.path,title:page.title});
  }
  if(slug==='kenya'&&usesCmsKenya()){
    const published=await cmsKenya();
    if(!published)return {robots:{index:false,follow:false}};
    const {content:{page},seoDefaults}=published;
    return resolvedSeoMetadata(page.seo,seoDefaults,{origin:'https://safaricrafters.com',path:page.path,title:page.title});
  }
  if(usesCmsDestination(slug,reservedDestinationSlugs)){
    const destination=await cmsDestination(slug);
    return destination?publishedDestinationMetadata(destination,await readSeoDefaults()):{title:'Destination unavailable',robots:{index:false,follow:false}};
  }
  if (["uganda", "rwanda", "uganda-rwanda"].includes(slug)) return { title: "Uganda & Rwanda", description: ugandaDescription, alternates: { canonical: "/destinations/uganda" } };
  const atlas = getRegionalAtlas(slug);
  if (atlas) {
    return {
      title: atlas.title,
      description: atlas.heroCopy,
      alternates: { canonical: `/destinations/${atlas.slug}` }
    };
  }
  const country = getCountryBySlug(slug);
  if (country) {
    return {
      title: country.title,
      description: country.slug === "brazil" ? brazilDescription : country.slug === "kenya" ? kenyaDescription : country.slug === "tanzania" ? tanzaniaDescription : country.description,
      alternates: { canonical: `/destinations/${country.slug}` },
      openGraph: { images: [{ url: getCountryHeroImage(country).src, alt: getCountryHeroImage(country).alt }] }
    };
  }
  const destination = getDestination(slug);
  if (!destination) return {};
  const seo = destinationSeo(destination);
  const socialImage = destination.seo?.socialImage || getDestinationHeroImage(destination);
  const hasAccurateSocialImage = isApprovedEditorialImage(socialImage);
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
  if(slug==='tanzania'&&usesCmsTanzania()){
    const published=await cmsTanzania();if(!published)notFound();
    return <CmsTanzaniaPage page={published.content.page}/>;
  }
  if(slug==='kenya'&&usesCmsKenya()){
    const published=await cmsKenya();if(!published)notFound();
    return <CmsKenyaPage page={published.content.page}/>;
  }
  if(usesCmsDestination(slug,reservedDestinationSlugs)){
    const destination=await cmsDestination(slug);if(!destination)notFound();
    return <CmsDestination destination={destination}/>;
  }
  if (slug === "rwanda" || slug === "uganda-rwanda") redirect("/destinations/uganda");
  if (slug === "uganda") return <UgandaRwandaCountryPage />;
  if (slug === "brazil") return <BrazilCountryPage />;
  const atlas = getRegionalAtlas(slug);
  if (atlas) return <RegionalAtlasPage atlas={atlas} />;
  const country = getCountryBySlug(slug);
  if (country) {
    if (country.slug === "kenya") return <KenyaCountryPage />;
    if (country.slug === "tanzania") return <TanzaniaCountryPage />;
    return <CountryDestinationPage country={country} />;
  }

  const destination = getDestination(slug);
  if (!destination) notFound();
  const heroImage = getDestinationHeroImage(destination);
  const intelligence = getFieldIntelligence(destination);
  const faqs = getDestinationFaqs(destination);
  const pairings = getDestinationPairings(destination);
  const relatedJourneys = getRelatedJourneys(destination);
  const relatedExpeditions = expeditions.filter((expedition) =>
    destination.expeditions.some((title) => title.toLowerCase() === expedition.title.toLowerCase())
  );
  const parentAtlas = getRegionalAtlases().find((item) => item.continent === destination.continent);
  const parentCountry = getCountryAtlas().find((item) => item.continent === destination.continent && item.country === destination.country);
  const breadcrumbs = [
    { name: "Home", path: "/" },
    { name: "Destinations", path: "/destinations" },
    ...(parentAtlas ? [{ name: parentAtlas.shortTitle, path: `/destinations/${parentAtlas.slug}` }] : []),
    ...(parentCountry && parentCountry.slug !== parentAtlas?.slug ? [{ name: parentCountry.title, path: `/destinations/${parentCountry.slug}` }] : []),
    { name: destination.title, path: `/destinations/${destination.slug}` }
  ];

  return (
    <>
      <JsonLd data={destinationSchema(destination)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      {faqs.length > 0 && <JsonLd data={faqSchema(faqs)} />}
      <PageHero
        titleSize="compact"
        title={destination.title}
        accent={destination.title}
        copy={destinationHeroCopy(destination.slug, destination.description)}
        image={heroImage}
        meta={[destination.country, destination.slug === "kamchatka" ? "Far East" : destination.country === "Russia" ? "Russian Far East" : destination.continent === "Arctic" ? "Arctic / Other" : destination.continent]
          .filter((value, index, values) => values.indexOf(value) === index)
          .join(" · ")}
        breadcrumbs={breadcrumbs.map((item, index) => ({ label: item.name, ...(index < breadcrumbs.length - 1 ? { href: item.path } : {}) }))}
        showImage
        variant="destination"
      />
      <EditorialFilm video={destination.video} />
      <DestinationDossier
        destination={{ ...destination, image: heroImage }}
        heroCopy={destinationHeroCopy(destination.slug, destination.description)}
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
  const countryOverview = country.destinations.find((destination) =>
    destination.slug === country.slug || destination.title.toLowerCase() === country.title.toLowerCase()
  );
  const places = country.destinations.filter((destination) => destination !== countryOverview);
  const gallerySource = countryOverview || (places.length === 1 ? places[0] : undefined);
  const countryGallery = gallerySource?.gallery.filter(isApprovedEditorialImage) || [];
  const placeImageCounts = new Map(places.map((destination) => [getDestinationHeroImage(destination).src, places.filter((item) => getDestinationHeroImage(item).src === getDestinationHeroImage(destination).src).length]));
  const featured = places.filter((destination) =>
    destination.gallery.some(isApprovedEditorialImage)
    || (isApprovedEditorialImage(getDestinationHeroImage(destination)) && (placeImageCounts.get(getDestinationHeroImage(destination).src) || 0) === 1)
  ).slice(0, 3);
  const featuredSlugs = new Set(featured.map((destination) => destination.slug));
  const extensions = places.filter((destination) => !featuredSlugs.has(destination.slug));
  const countryHeroImage = getCountryHeroImage(country);
  const showCountryHeroImage = isApprovedEditorialImage(countryHeroImage);
  const parentAtlas = getRegionalAtlases().find((item) => item.continent === country.continent);
  const breadcrumbs = [
    { name: "Home", path: "/" },
    { name: "Destinations", path: "/destinations" },
    ...(parentAtlas && parentAtlas.slug !== country.slug ? [{ name: parentAtlas.shortTitle, path: `/destinations/${parentAtlas.slug}` }] : []),
    { name: country.title, path: `/destinations/${country.slug}` }
  ];
  return (
    <>
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <PageHero
        titleSize="compact"
        title={country.title}
        accent={country.title}
        copy={destinationHeroCopy(country.slug, countryOverview?.description || country.description)}
        image={countryHeroImage}
        meta={`${country.continent === "Arctic" ? "Arctic & Beyond" : country.continent} · Country atlas`}
        breadcrumbs={breadcrumbs.map((item, index) => ({ label: item.name, ...(index < breadcrumbs.length - 1 ? { href: item.path } : {}) }))}
        showImage={showCountryHeroImage}
        variant="destination"
      />
      <main className="country-guide">
        <section className="container country-guide-primary" aria-labelledby={`${country.slug}-places`}>
          <header className="country-guide-intro">
            <p className="eyebrow">Country atlas</p>
            <h2 id={`${country.slug}-places`}>{places.length} {places.length === 1 ? "place" : "places"}. One coherent {country.title} journey.</h2>
            <p>Begin with the landscape that draws you. We will connect the right places around season, access and the pace you want to keep.</p>
          </header>

          {featured.length > 0 && (
            <div className={`country-guide-featured${featured.length === 1 ? " is-single" : featured.length === 2 ? " has-two" : ""}`}>
              {featured.map((destination, index) => {
                const image = getDestinationHeroImage(destination);
                return (
                  <article key={destination.slug}>
                    <Link className="country-guide-card-image" href={`/destinations/${destination.slug}`}>
                      <Image src={image.src} alt={image.alt} fill sizes={featured.length === 1 ? "(max-width: 760px) 100vw, 55vw" : "(max-width: 760px) 100vw, 33vw"} priority={index === 0} />
                    </Link>
                    <p>{destination.parentRegion || destination.region}</p>
                    <h3><Link href={`/destinations/${destination.slug}`}>{destination.title}</Link></h3>
                    <span>{conciseCountryCopy(destination.description)}</span>
                    <Link className="country-guide-card-link" href={`/destinations/${destination.slug}`}>Explore <ArrowUpRight aria-hidden="true" /></Link>
                  </article>
                );
              })}
            </div>
          )}

          {extensions.length > 0 && (
            <div className="country-guide-extensions">
              <div>
                <p className="eyebrow">Explore further</p>
                <h2>More ways into {country.title}.</h2>
              </div>
              <div className="country-guide-extension-list">
                {extensions.map((destination, index) => (
                  <Link href={`/destinations/${destination.slug}`} key={destination.slug}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{destination.title}</strong>
                    <small>{conciseCountryCopy(destination.description, 18)}</small>
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
        {countryGallery.length > 0 && (
          <section className="section surface-white" aria-labelledby={`${country.slug}-photographs`}>
            <div className="container">
              <header className="country-guide-intro">
                <p className="eyebrow">Photo journal</p>
                <h2 id={`${country.slug}-photographs`}>{country.title}, in frames.</h2>
                <p>Moments from the field. Open a photograph to explore the collection.</p>
              </header>
              <MediaGallery images={countryGallery} label={`${country.title} field photographs`} variant="story" maxImages={country.slug === "colombia" ? 30 : undefined} />
            </div>
          </section>
        )}
      </main>
    </>
  );
}
