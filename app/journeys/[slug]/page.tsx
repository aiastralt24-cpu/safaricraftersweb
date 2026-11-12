import { uniqueTourCopy } from '@/lib/tour-content';
import {readSeoDefaults} from '@/lib/cms/seo-settings';
import {resolvedSeoMetadata} from '@/lib/cms/seo-metadata';
import {newPageSeo} from '@/lib/cms/page-seo';
import {cache} from 'react';
import {CmsJourney} from '@/components/CmsJourney';
import {readPublishedJourney} from '@/lib/cms/published-journey';
import {publicPageConfig} from '@/lib/cms/public-page-runtime';
import '../cms-journey.css';
import { EditorialFilm } from "@/components/EditorialFilm";
import { BookingConditions } from "@/components/BookingConditions";
import { tourPriceLabel } from "@/lib/tour-pricing";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { EditorialProse } from "@/components/EditorialProse";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { MediaGallery } from "@/components/MediaGallery";
import { JourneyExperience, hasJourneyExperience } from "@/components/JourneyExperience";
import { BigCatsExperience } from "@/components/BigCatsExperience";
import { JourneyItinerary } from "@/components/JourneyItinerary";
import { getJourney, journeys } from "@/lib/data";
import { getJourneyIntelligence } from "@/lib/luxury";
import { getJourneyFaqs, journeySeo } from "@/lib/content-intelligence";
import { breadcrumbSchema, faqSchema, journeySchema, siteUrl } from "@/lib/structured-data";
import "../../detail.css";

export const dynamic='force-dynamic';
const cmsEnabled=()=>process.env.CMS_JOURNEY_RENDERING_ENABLED==='true';
const cmsJourney=cache((slug:string)=>readPublishedJourney(slug,publicPageConfig()));

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  if(cmsEnabled())return [];
  return journeys.map((journey) => ({ slug: journey.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if(cmsEnabled()){
    const journey=await cmsJourney(slug);if(!journey)return {title:'Journey unavailable',robots:{index:false,follow:false}};
    const defaults=await readSeoDefaults();
    if(defaults)return resolvedSeoMetadata({...newPageSeo(),title:journey.seoTitle||'',description:journey.seoDescription||''},defaults,{origin:siteUrl,path:`/journeys/${journey.slug}`,title:journey.title});
    const title=journey.seoTitle||journey.title,description=journey.seoDescription||journey.description;
    return {title,description,alternates:{canonical:`/journeys/${journey.slug}`},openGraph:{title,description,url:`/journeys/${journey.slug}`,images:[]},twitter:{title,description,images:[]}};
  }
  const journey = getJourney(slug);
  if (!journey) return {};
  const seo = journeySeo(journey);
  return {
    ...seo,
    alternates: { canonical: `/journeys/${journey.slug}` },
    openGraph: { ...seo, url: `${siteUrl}/journeys/${journey.slug}`, images: [{ url: (journey.seo?.socialImage || journey.image).src, alt: (journey.seo?.socialImage || journey.image).alt }] }
  };
}

export default async function JourneyDetailPage({ params }: Props) {
  const { slug } = await params;
  if(cmsEnabled()){const journey=await cmsJourney(slug);if(!journey)notFound();return <CmsJourney journey={journey}/>;}
  const journey = getJourney(slug);
  if (!journey) notFound();
  if (slug === "big-cats-of-india") return <BigCatsExperience journey={journey} />;
  if (hasJourneyExperience(slug)) return <JourneyExperience journey={journey} />;
  const heroImage = journey.heroImage || journey.gallery.find((image, index) => index > 0 && image.src !== journey.image.src)
    || journey.gallery.find((image) => image.src !== journey.image.src)
    || journey.image;
  const gallery = [...new Map(journey.gallery.filter(image => image.src !== heroImage.src).map(image => [image.src, image])).values()];
  const intro = uniqueTourCopy(journey.intro.split(/\n\s*\n/), [journey.description]).join('\n\n');
  const body = uniqueTourCopy((journey.body || []).slice(3), [journey.description, ...journey.intro.split(/\n\s*\n/)]);
  const intelligence = getJourneyIntelligence(journey);
  const faqs = getJourneyFaqs(journey);
  const breadcrumbs = [
    { name: "Home", path: "/" },
    { name: "Journeys", path: "/journeys" },
    { name: journey.title, path: `/journeys/${journey.slug}` }
  ];

  return (
    <>
      <JsonLd data={journeySchema(journey)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      {faqs.length > 0 && <JsonLd data={faqSchema(faqs)} />}
      <section className="journey-detail-hero">
        <Image
          src={heroImage.src}
          alt={heroImage.alt}
          fill
          priority
          loading="eager"
          sizes="100vw"
          style={{ objectPosition: heroImage.focalPoint || "center" }}
        />
        <div className="journey-detail-hero-shade" />
        <div className="container journey-detail-hero-content">
          <Breadcrumbs items={breadcrumbs.map((item, index) => ({ label: item.name, ...(index < breadcrumbs.length - 1 ? { href: item.path } : {}) }))} variant="hero" />
          <p className="eyebrow">Private journey · {journey.region}</p>
          <h1>{journey.title}</h1>
          <p className="journey-detail-dek">{journey.description}</p>
        </div>
        <dl className="container journey-hero-ledger">
          <div><dt>Duration</dt><dd>{journey.duration}</dd></div>
          <div><dt>Route</dt><dd>{journey.route || journey.region}</dd></div>
          <div><dt>Best season</dt><dd>{journey.bestMonths}</dd></div>
          <div><dt>Travel style</dt><dd>{journey.style || journey.category}</dd></div>
        </dl>
      </section>
      <nav className="journey-chapters" aria-label="Journey chapters">
        <div className="container">
          <Link href="/journeys">All journeys</Link>
          <a href="#overview">The journey</a>
          <a href="#itinerary">Day by day</a>
          <a href="#gallery">Field notes</a>
          <a href="#enquire">Begin planning</a>
        </div>
      </nav>
      <article className="section detail journey-detail" id="overview">
        <div className="container journey-opening">
          <div>
            <p className="eyebrow">The journey</p>
            {journey.tagline ? <h2 className="journey-signature-line">{journey.tagline}</h2> : null}
            <EditorialProse text={intro} className="intro editorial-prose" collapsible />
          </div>
          <aside className="at-glance">
            <h2>At a glance</h2>
            <dl>
              <dt>Duration</dt>
              <dd>{journey.duration}</dd>
              {journey.route ? (
                <>
                  <dt>Route</dt>
                  <dd>{journey.route}</dd>
                </>
              ) : null}
              <dt>Group size</dt>
              <dd>{journey.groupSize}</dd>
              <dt>Best months</dt>
              <dd>{journey.bestMonths}</dd>
              {journey.statesOrRegions?.length ? (
                <>
                  <dt>States / regions</dt>
                  <dd>{journey.statesOrRegions.join(" · ")}</dd>
                </>
              ) : null}
              <dt>Difficulty</dt>
              <dd>{journey.difficulty}</dd>
              <dt>Journey price</dt>
              <dd>{tourPriceLabel(journey.price)}</dd>
            </dl>
            <Link className="at-glance-action" href={`/plan?journey=${journey.slug}`}>Shape this journey</Link>
          </aside>
        </div>
        {journey.highlights.length ? (
          <section className="container journey-promise" aria-labelledby="journey-promise-title">
            <header>
              <p className="eyebrow">What defines this journey</p>
              <h2 className="h2" id="journey-promise-title">A route designed for depth, not haste.</h2>
            </header>
            <div>
              <p>{journey.highlights[0]}</p>
              {journey.wildlifeFocus ? (
                <dl>
                  <dt>In focus</dt>
                  <dd>{journey.wildlifeFocus}</dd>
                </dl>
              ) : null}
            </div>
          </section>
        ) : null}
        <div className="container luxury-brief">
          <section>
            <p className="eyebrow">Private brief</p>
            <h2 className="h2">Everything is considered before anything is confirmed.</h2>
          </section>
          <dl>
            <div>
              <dt>Ideal for</dt>
              <dd>{intelligence.idealFor}</dd>
            </div>
            <div>
              <dt>Transfers</dt>
              <dd>{intelligence.transfers}</dd>
            </div>
            <div>
              <dt>Lodges and comfort</dt>
              <dd>{intelligence.comfort}</dd>
            </div>
            <div>
              <dt>Wildlife expectation</dt>
              <dd>{intelligence.wildlifeExpectation}</dd>
            </div>
            <div>
              <dt>Photography</dt>
              <dd>{intelligence.photography}</dd>
            </div>
            <div>
              <dt>Journey style</dt>
              <dd>{journey.style || journey.category}</dd>
            </div>
            <div>
              <dt>Pace</dt>
              <dd>{journey.pace || "Unhurried, with the final rhythm shaped around field conditions and guest comfort."}</dd>
            </div>
          </dl>
        </div>
        {body.length > 0 ? (
          <section className="container journey-worlds" aria-labelledby="journey-worlds-title">
            <header>
              <p className="eyebrow">The worlds within</p>
              <h2 className="h2" id="journey-worlds-title">Each landscape changes the story.</h2>
            </header>
            <div>
              {body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ) : null}
        <div id="itinerary"><JourneyItinerary days={journey.days} slug={journey.slug} duration={journey.duration} /></div>
        {journey.inclusions?.length || journey.exclusions?.length ? (
          <div className="container split-lists">
            {journey.inclusions?.length ? (
              <section>
                <h2 className="h3">Inclusions</h2>
                <ul>
                  {journey.inclusions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ) : null}
            {journey.exclusions?.length ? (
              <section>
                <h2 className="h3">Exclusions</h2>
                <ul>
                  {journey.exclusions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}
        {gallery.length ? (
          <div className="container detail-section detail-gallery" id="gallery">
            <p className="eyebrow">Gallery</p>
            <MediaGallery images={gallery} label={`${journey.title} gallery`} />
          </div>
        ) : null}
        {faqs.length > 0 && <section data-tour-faq className="container faq-section">
          <p className="eyebrow">Private journey questions</p>
          <h2 className="h2">Before we refine the route</h2>
          <div>
            {faqs.map((faq) => (
              <details key={faq.question} name="journey-faq">
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
          {journey.seo?.reviewedAt ? <p className="content-reviewed">Journey information reviewed {journey.seo.reviewedAt}.</p> : null}
        </section>}
      <EditorialFilm video={journey.video} />
        <BookingConditions />
        <div className="container specialist-callout" id="enquire">
          <p className="eyebrow">Specialist recommendation</p>
          <h2 className="h2">This journey is shaped with {journey.specialist}.</h2>
          <Link className="button button-solid" href={`/plan?journey=${journey.slug}`}>
            Begin planning
          </Link>
        </div>
      </article>
    </>
  );
}
