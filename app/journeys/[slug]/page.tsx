import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { EditorialProse } from "@/components/EditorialProse";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { MediaGallery } from "@/components/MediaGallery";
import { Itinerary } from "@/components/Itinerary";
import { getJourney, journeys } from "@/lib/data";
import { getJourneyIntelligence } from "@/lib/luxury";
import { getJourneyFaqs, journeySeo } from "@/lib/content-intelligence";
import { breadcrumbSchema, faqSchema, journeySchema, siteUrl } from "@/lib/structured-data";
import "../../detail.css";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return journeys.map((journey) => ({ slug: journey.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const journey = getJourney(slug);
  if (!journey) return {};
  const seo = journeySeo(journey);
  return {
    ...seo,
    alternates: { canonical: `/journeys/${journey.slug}` },
    openGraph: { ...seo, url: `${siteUrl}/journeys/${journey.slug}`, images: [{ url: journey.image.src, alt: journey.image.alt }] }
  };
}

export default async function JourneyDetailPage({ params }: Props) {
  const { slug } = await params;
  const journey = getJourney(slug);
  if (!journey) notFound();
  const heroImage = journey.gallery.find((image, index) => index > 0 && image.src !== journey.image.src)
    || journey.gallery.find((image) => image.src !== journey.image.src)
    || journey.image;
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
      <JsonLd data={faqSchema(faqs)} />
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
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Journeys", href: "/journeys" }, { label: journey.title }]} />
      <article className="section detail journey-detail" id="overview">
        <div className="container journey-opening">
          <div>
            <p className="eyebrow">The journey</p>
            {journey.tagline ? <h2 className="journey-signature-line">{journey.tagline}</h2> : null}
            <EditorialProse text={journey.intro} className="intro editorial-prose" />
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
              <dt>Indicative investment</dt>
              <dd>{journey.price}</dd>
            </dl>
            <Link className="at-glance-action" href={`/plan?journey=${journey.slug}`}>Refine this private journey</Link>
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
        {journey.body && journey.body.length > 3 ? (
          <section className="container journey-worlds" aria-labelledby="journey-worlds-title">
            <header>
              <p className="eyebrow">The worlds within</p>
              <h2 className="h2" id="journey-worlds-title">Each landscape changes the story.</h2>
            </header>
            <div>
              {journey.body.slice(3).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ) : null}
        <div id="itinerary"><Itinerary days={journey.days} /></div>
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
        {journey.gallery.length ? (
          <div className="container detail-section detail-gallery" id="gallery">
            <p className="eyebrow">Gallery</p>
            <MediaGallery images={journey.gallery.filter((image) => image.src !== heroImage.src)} label={`${journey.title} gallery`} />
          </div>
        ) : null}
        <section className="container faq-section">
          <p className="eyebrow">Private journey questions</p>
          <h2 className="h2">Before we refine the route</h2>
          <div>
            {faqs.map((faq) => (
              <details key={faq.question}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
          <p className="content-reviewed">Journey information reviewed {journey.seo?.reviewedAt || "July 2026"}.</p>
        </section>
        <div className="container specialist-callout" id="enquire">
          <p className="eyebrow">Specialist recommendation</p>
          <h2 className="h2">This journey is shaped with {journey.specialist}.</h2>
          <Link className="button button-solid" href={`/plan?journey=${journey.slug}`}>
            Refine This Journey
          </Link>
        </div>
      </article>
    </>
  );
}
