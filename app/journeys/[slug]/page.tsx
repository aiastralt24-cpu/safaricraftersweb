import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { EditorialProse } from "@/components/EditorialProse";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
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
      <PageHero
        title={journey.title}
        copy={journey.description}
        image={journey.image}
        meta={`${journey.duration} · ${journey.region}`}
      />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Journeys", href: "/journeys" }, { label: journey.title }]} />
      <article className="section detail">
        <div className="container detail-grid">
          <div>
            <p className="eyebrow">{journey.category}</p>
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
              <dt>From</dt>
              <dd>{journey.price}</dd>
            </dl>
          </aside>
        </div>
        <div className="container luxury-brief">
          <section>
            <p className="eyebrow">Private brief</p>
            <h2 className="h2">Built around the guest, not a fixed departure.</h2>
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
        {journey.highlights.length ? (
          <div className="container detail-section">
            <p className="eyebrow">Highlights</p>
            <ul className="highlight-list">
              {journey.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {journey.body?.length ? (
          <div className="container detail-copy">
            {journey.body.slice(0, 3).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        ) : null}
        <div className="container timeline">
          <h2 className="h2">Day by day</h2>
          {journey.days.map((day, index) => (
            <section key={day.title} className="timeline-item">
              <span className="serif">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3 className="h3">{day.title}</h3>
                <p>{day.copy}</p>
                {day.stay ? <p className="muted">Stay: {day.stay}</p> : null}
              </div>
            </section>
          ))}
        </div>
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
          <div className="container detail-section">
            <p className="eyebrow">Gallery</p>
            <div className="gallery-grid">
              {journey.gallery.slice(0, 9).map((image) => (
                <img key={image.src} src={image.src} alt={image.alt} loading="lazy" />
              ))}
            </div>
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
        <div className="container specialist-callout">
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
