import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { EditorialProse } from "@/components/EditorialProse";
import { PageHero } from "@/components/PageHero";
import { destinations, getDestination } from "@/lib/data";
import { getFieldIntelligence } from "@/lib/luxury";
import "../../detail.css";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return destinations.map((destination) => ({ slug: destination.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const destination = getDestination(slug);
  if (!destination) return {};
  return {
    title: destination.title,
    description: destination.description
  };
}

export default async function DestinationDetailPage({ params }: Props) {
  const { slug } = await params;
  const destination = getDestination(slug);
  if (!destination) notFound();
  const intelligence = getFieldIntelligence(destination);

  return (
    <>
      <PageHero
        title={destination.title}
        copy={destination.description}
        image={destination.image}
        meta={destination.region}
      />
      <article className="section detail">
        <div className="container detail-grid">
          <div>
            <p className="eyebrow">Destination guide</p>
            <EditorialProse text={destination.intro} className="intro editorial-prose" />
          </div>
          <aside className="at-glance">
            <h2>At a glance</h2>
            <dl>
              <dt>Best months</dt>
              <dd>{destination.bestMonths}</dd>
              <dt>Wildlife signature</dt>
              <dd>{destination.wildlife}</dd>
              <dt>Photography</dt>
              <dd>{destination.photography}</dd>
            </dl>
          </aside>
        </div>
        <div className="container field-intelligence">
          <p className="eyebrow">Field intelligence</p>
          <div>
            <article>
              <span>Airport</span>
              <strong>{intelligence.airport}</strong>
            </article>
            <article>
              <span>Transfer</span>
              <strong>{intelligence.transfer}</strong>
            </article>
            <article>
              <span>Ideal stay</span>
              <strong>{intelligence.idealStay}</strong>
            </article>
            <article>
              <span>Safari rhythm</span>
              <strong>{intelligence.safariRhythm}</strong>
            </article>
            <article>
              <span>Access note</span>
              <strong>{intelligence.accessNote}</strong>
            </article>
          </div>
        </div>
        <div className="container timeline">
          <h2 className="h2">How we shape this place</h2>
          <section className="timeline-item">
            <span className="serif">01</span>
            <div>
              <h3 className="h3">Best time to visit</h3>
              <p>{destination.bestMonths} is the strongest window for light, comfort and wildlife movement.</p>
            </div>
          </section>
          <section className="timeline-item">
            <span className="serif">02</span>
            <div>
              <h3 className="h3">Wildlife highlights</h3>
              <p>{destination.wildlife} guide the route design, lodge choice and drive timings.</p>
            </div>
          </section>
          <section className="timeline-item">
            <span className="serif">03</span>
            <div>
              <h3 className="h3">Photography opportunities</h3>
              <p>{destination.photography} are considered before we recommend vehicle, guide and lodge position.</p>
            </div>
          </section>
        </div>
        {destination.gallery.length ? (
          <div className="container detail-section">
            <p className="eyebrow">Gallery</p>
            <div className="gallery-grid">
              {destination.gallery.slice(0, 9).map((image) => (
                <img key={image.src} src={image.src} alt={image.alt} loading="lazy" />
              ))}
            </div>
          </div>
        ) : null}
        {destination.journeys.length || destination.expeditions.length ? (
          <div className="container split-lists">
            {destination.journeys.length ? (
              <section>
                <h2 className="h3">Related journeys</h2>
                <ul>
                  {destination.journeys.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ) : null}
            {destination.expeditions.length ? (
              <section>
                <h2 className="h3">Photo expeditions</h2>
                <ul>
                  {destination.expeditions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}
        <div className="container specialist-callout">
          <p className="eyebrow">Begin here</p>
          <h2 className="h2">Begin a journey to {destination.title}.</h2>
          <Link className="button button-solid" href={`/plan?destination=${destination.slug}`}>
            Plan a Journey
          </Link>
        </div>
      </article>
    </>
  );
}
