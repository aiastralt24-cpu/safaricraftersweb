import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { EditorialProse } from "@/components/EditorialProse";
import { PageHero } from "@/components/PageHero";
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

  return (
    <>
      <PageHero
        title={expedition.title}
        copy={expedition.description}
        image={expedition.image}
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
              {expedition.date ? (
                <>
                  <dt>Departure</dt>
                  <dd>{expedition.date}</dd>
                </>
              ) : null}
              {expedition.route ? (
                <>
                  <dt>Route</dt>
                  <dd>{expedition.route}</dd>
                </>
              ) : null}
              <dt>Skill level</dt>
              <dd>{expedition.skill}</dd>
              <dt>Group size</dt>
              <dd>{expedition.groupSize}</dd>
              <dt>Best months</dt>
              <dd>{expedition.bestMonths}</dd>
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
          </aside>
        </div>
        {expedition.highlights.length ? (
          <div className="container detail-section">
            <p className="eyebrow">Highlights</p>
            <ul className="highlight-list">
              {expedition.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {expedition.body?.length ? (
          <div className="container detail-copy">
            {expedition.body.slice(0, 3).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        ) : null}
        <div className="container timeline">
          <h2 className="h2">Expedition rhythm</h2>
          {expedition.days.map((day, index) => (
            <section key={day.title} className="timeline-item">
              <span className="serif">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3 className="h3">{day.title}</h3>
                <p>{day.copy}</p>
              </div>
            </section>
          ))}
        </div>
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
          <div className="container detail-section">
            <p className="eyebrow">Gallery</p>
            <div className="gallery-grid">
              {expedition.gallery.slice(0, 9).map((image) => (
                <img key={image.src} src={image.src} alt={image.alt} loading="lazy" />
              ))}
            </div>
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
