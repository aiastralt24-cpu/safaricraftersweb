import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { EditorialProse } from "@/components/EditorialProse";
import { PageHero } from "@/components/PageHero";
import { MediaGallery } from "@/components/MediaGallery";
import { Itinerary } from "@/components/Itinerary";
import { ExpeditionEnquiry } from "@/components/ExpeditionEnquiry";
import { JsonLd } from "@/components/JsonLd";
import { expeditionSchema } from "@/lib/structured-data";
import { expeditions, getExpedition } from "@/lib/data";
import "../../detail.css";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return expeditions.map((expedition) => ({ slug: expedition.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const expedition = getExpedition(slug);
  if (!expedition) return {};
  return {
    title: expedition.title,
    description: expedition.description
  };
}

export default async function ExpeditionDetailPage({ params }: Props) {
  const { slug } = await params;
  const expedition = getExpedition(slug);
  if (!expedition) notFound();
  const heroImage = expedition.gallery.find((image, index) => index > 0 && image.src !== expedition.image.src)
    || expedition.gallery.find((image) => image.src !== expedition.image.src)
    || expedition.image;
  const parsedDeparture = expedition.date ? new Date(expedition.date) : null;
  const departure = parsedDeparture && !Number.isNaN(parsedDeparture.valueOf()) && parsedDeparture >= new Date()
    ? expedition.date
    : undefined;

  return (
    <>
      <JsonLd data={expeditionSchema(expedition)} />
      <PageHero
        title={expedition.title}
        copy={expedition.description}
        image={heroImage}
        meta={expedition.category}
      />
      <article className="section detail">
        <div className="container detail-grid">
          <div>
            <p className="eyebrow">Photographer-led</p>
            <EditorialProse text={expedition.intro} className="intro editorial-prose" />
          </div>
          <aside className="at-glance">
            <h2>At a glance</h2>
            <dl>
              <dt>Duration</dt>
              <dd>{expedition.duration || `${expedition.days.length} days`}</dd>
              {departure ? (
                <>
                  <dt>Departure</dt>
                  <dd>{departure}</dd>
                </>
              ) : <><dt>Departure</dt><dd>New dates being finalised</dd></>}
              {expedition.route ? (
                <>
                  <dt>Route</dt>
                  <dd>{expedition.route}</dd>
                </>
              ) : null}
              <dt>Skill level</dt>
              <dd>{expedition.skill}</dd>
              <dt>Group size</dt>
              <dd>{departure ? expedition.groupSize : "Small group · availability on request"}</dd>
              <dt>Best months</dt>
              <dd>{expedition.bestMonths === expedition.date && !departure ? "New season being confirmed" : expedition.bestMonths}</dd>
              <dt>Species focus</dt>
              <dd>{expedition.species}</dd>
              <dt>Equipment</dt>
              <dd>{expedition.equipment}</dd>
              {expedition.price ? (
                <>
                  <dt>From</dt>
                  <dd>{expedition.price}</dd>
                </>
              ) : null}
            </dl>
            <Link className="at-glance-action" href="#expedition-enquiry">Ask about this departure</Link>
          </aside>
        </div>
        {expedition.highlights.length ? (
          <div className="container detail-section detail-highlights">
            <p className="eyebrow">Highlights</p>
            <ul className="highlight-list">
              {expedition.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <ExpeditionEnquiry
          title={expedition.title}
          slug={expedition.slug}
          departure={departure}
          mentor={expedition.mentor}
          region={expedition.category}
        />
        {expedition.body?.length ? (
          <div className="container detail-copy detail-editorial-copy">
            {expedition.body.slice(0, 3).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        ) : null}
        <Itinerary days={expedition.days} title="Expedition rhythm" />
        {expedition.inclusions?.length || expedition.exclusions?.length ? (
          <div className="container split-lists">
            {expedition.inclusions?.length ? (
              <section>
                <h2 className="h3">Inclusions</h2>
                <ul>
                  {expedition.inclusions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ) : null}
            {expedition.exclusions?.length ? (
              <section>
                <h2 className="h3">Exclusions</h2>
                <ul>
                  {expedition.exclusions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}
        {expedition.gallery.length ? (
          <div className="container detail-section detail-gallery">
            <p className="eyebrow">Gallery</p>
            <MediaGallery images={expedition.gallery.filter((image) => image.src !== heroImage.src)} label={`${expedition.title} gallery`} />
          </div>
        ) : null}
        <div className="container specialist-callout">
          <p className="eyebrow">Photo-led safari</p>
          <h2 className="h2">Join this expedition with {expedition.mentor}.</h2>
          <Link className="button button-solid" href={`/plan?expedition=${expedition.slug}`}>
            Join a Photo Expedition
          </Link>
        </div>
      </article>
    </>
  );
}
