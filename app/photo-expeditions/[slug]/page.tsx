import { upcomingDepartures, departureLabel } from "@/lib/departures";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { EditorialProse } from "@/components/EditorialProse";
import { PageHero } from "@/components/PageHero";
import { MediaGallery } from "@/components/MediaGallery";
import { Itinerary } from "@/components/Itinerary";
import { ExpeditionEnquiry } from "@/components/ExpeditionEnquiry";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbSchema, expeditionSchema } from "@/lib/structured-data";
import { expeditions, getDestination, getExpedition } from "@/lib/data";
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
  const heroSummaries: Record<string, {title:string; copy:string}> = {
    "kanha-wildlife-photography-expedition": {title:"Kanha", copy:"Five days of wildlife photography, winter light and expert mentoring in Kanha’s forests and meadows."},
    "laikipia-black-leopard-expedition": {title:"Laikipia", copy:"Black leopard tracking and patient photography in Kenya’s private conservancies."},
    "svalbard-expedition": {title:"Svalbard", copy:"An intimate Arctic voyage shaped by sea ice, wildlife and extraordinary light."},
    "the-pantanal-wetlands": {title:"The Pantanal", copy:"Jaguar encounters, river safaris and remarkable birdlife in Brazil’s vast wetlands."}
  };
  const heroSummary = heroSummaries[slug] || {title:expedition.title.replace(/ Photography Expedition$/, ""), copy:expedition.description};
  const heroImage = expedition.gallery.find((image, index) => index > 0 && image.src !== expedition.image.src)
    || expedition.gallery.find((image) => image.src !== expedition.image.src)
    || expedition.image;
  const destinationGallery = expedition.slug === "kanha-wildlife-photography-expedition"
    ? getDestination("kanha")?.gallery ?? []
    : [];
  const seenImages = new Set<string>();
  const visualGallery = [expedition.image, ...expedition.gallery, ...destinationGallery]
    .filter((image) => image.src !== heroImage.src)
    .filter((image) => {
      if (seenImages.has(image.src)) return false;
      seenImages.add(image.src);
      return true;
    });
  const departures = upcomingDepartures(expedition);
  const formatDate = (date:string) => new Date(date).toLocaleDateString("en-GB", {day:"numeric", month:"long", year:"numeric", timeZone:"UTC"});
  const departure = departures.length ? departureLabel(departures[0]) : undefined;
  const breadcrumbs = [
    { name: "Home", path: "/" },
    { name: "Photo Expeditions", path: "/photo-expeditions" },
    { name: expedition.title, path: `/photo-expeditions/${expedition.slug}` }
  ];

  return (
    <>
      <JsonLd data={expeditionSchema(expedition)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <div className="expedition-hero"><PageHero
        variant="destination"
        title={heroSummary?.title || expedition.title}
        copy={heroSummary?.copy || expedition.description}
        image={heroImage}
        meta="Wildlife photography expedition"
        breadcrumbs={breadcrumbs.map((item, index) => ({ label: index === breadcrumbs.length - 1 ? heroSummary?.title || item.name : item.name, ...(index < breadcrumbs.length - 1 ? { href: item.path } : {}) }))}
      /></div>
      {expedition.publicationStatus === "preview" && <p className="expedition-preview-note" role="note">Departure preview · The programme, accommodation and pricing are being finalised. Enquire to receive confirmed details.</p>}
      <article className="section detail expedition-detail">
        <div className="container detail-grid">
          <div>
            <h2 className="expedition-section-title">Photographer-led</h2>
            <EditorialProse
              text={expedition.intro}
              className="intro editorial-prose"
              collapsible
            />
        {expedition.highlights.length ? (
          <div className="expedition-opening-highlights">
            <h3 className="expedition-highlights-title">Highlights</h3>
            <ul className="highlight-list">
              {expedition.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </div>
        ) : null}

          </div>
          <aside className="at-glance">

            <dl>
              <dt>Duration</dt>
              <dd>{expedition.duration || `${expedition.days.length} days`}</dd>
              {expedition.route ? (
                <>
                  <dt>Route</dt>
                  <dd>{expedition.route}</dd>
                </>
              ) : null}
              {expedition.skill && <><dt>Skill level</dt><dd>{expedition.skill}</dd></>}
              <dt>Group size</dt>
              <dd>{/spots?|available/i.test(expedition.groupSize) ? "Small-group expedition" : expedition.groupSize}</dd>
              {expedition.bestMonths && !/[0-9]{4}/.test(expedition.bestMonths) && <><dt>Season</dt><dd>{expedition.bestMonths}</dd></>}
              {expedition.species && <><dt>Species focus</dt><dd>{expedition.species}</dd></>}

              {expedition.price ? (
                <>
                  <dt>From</dt>
                  <dd>{expedition.price}</dd>
                </>
              ) : null}
            </dl>
            {expedition.equipment && <details className="expedition-equipment"><summary>Camera equipment</summary><p>{expedition.equipment}</p></details>}
            <section className="expedition-departures" aria-label="Upcoming departures">
              <h2>Upcoming departures</h2>
              {departures.length ? <ul>{departures.map(item => <li key={item.date}><time dateTime={item.date}>{formatDate(item.date)}{item.endDate ? " – " + formatDate(item.endDate) : ""}</time><span className={"departure-status departure-status-" + item.status.toLowerCase().replace(/ /g,"-")}>{item.availability && item.status === "Available" ? item.availability : item.status}</span></li>)}</ul> : <p>New dates being finalised. Enquire to register your interest.</p>}
            </section>
            <Link className="at-glance-action" href="#expedition-enquiry">Enquire about departures</Link>
          </aside>
        </div>
        {expedition.days.length > 0 && <Itinerary days={expedition.days} title="Expedition rhythm" />}
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
        {visualGallery.length ? (
          <section className="container detail-section detail-gallery expedition-field-notes" aria-labelledby="expedition-field-notes-title">
            <header>
              <div>
                <p className="eyebrow">Field notes in photographs</p>
                <h2 className="h2" id="expedition-field-notes-title">From the field.</h2>
              </div>
              <p>Wildlife encounters sit within a larger story of weather, terrain, patience and place.</p>
            </header>
            <MediaGallery images={visualGallery} label={`${expedition.title} complete photographic journal`} />
          </section>
        ) : null}
        <ExpeditionEnquiry
          title={expedition.title}
          slug={expedition.slug}
          departure={departure}
          departureOptions={departures.map(item=>departureLabel(item))}
          mentor={expedition.mentor}
          region={expedition.category}
        />
      </article>
    </>
  );
}

// Time-based departure filtering must not be frozen at build time.
export const dynamic = "force-dynamic";
