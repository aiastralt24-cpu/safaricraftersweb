import { photoTourFaqs, uniqueTourCopy } from '@/lib/tour-content';
import {cache} from 'react';
import {CmsExpedition} from '@/components/CmsExpedition';
import {PublicEnquiryForm} from '@/components/PublicEnquiryForm';
import {readPublishedExpedition,publicExpeditionConfig} from '@/lib/cms/public-expedition-runtime';
import {usesCmsExpedition,publishedExpeditionMetadata} from '@/lib/cms/expedition-route';
import {readSeoDefaults} from '@/lib/cms/seo-settings';
import { EditorialFilm } from "@/components/EditorialFilm";
import informationStyles from "@/components/TourInformation.module.css";
import { BookingConditions } from "@/components/BookingConditions";
import { tourPriceLabel } from "@/lib/tour-pricing";
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
import { breadcrumbSchema, expeditionSchema, faqSchema } from "@/lib/structured-data";
import { expeditions, getDestination, getExpedition } from "@/lib/data";
import "../../detail.css";

const loadCmsExpedition=cache((slug:string)=>readPublishedExpedition(slug,publicExpeditionConfig()));

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  if(usesCmsExpedition())return [];
  return expeditions.map((expedition) => ({ slug: expedition.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if(usesCmsExpedition()){const expedition=await loadCmsExpedition(slug);if(!expedition)notFound();return publishedExpeditionMetadata(expedition,await readSeoDefaults(),process.env.CMS_PUBLIC_SITE_ORIGIN??'https://safaricrafters.com');}
  const expedition = getExpedition(slug);
  if (!expedition) return {};
  return {
    title: expedition.seo?.title || expedition.title,
    description: expedition.seo?.description || expedition.description,
    alternates: {canonical: `/photo-expeditions/${expedition.slug}`},
    openGraph: {title: expedition.seo?.title || expedition.title, description: expedition.seo?.description || expedition.description, images: [{url: (expedition.seo?.socialImage || expedition.image).src, alt: (expedition.seo?.socialImage || expedition.image).alt}]}
  };
}

export default async function ExpeditionDetailPage({ params }: Props) {
  const { slug } = await params;
  if(usesCmsExpedition()){
    const expedition=await loadCmsExpedition(slug);if(!expedition)notFound();
    return <CmsExpedition expedition={expedition} enquiry={<PublicEnquiryForm formId={expedition.form.recordId} expedition={{recordId:expedition.recordId,revisionId:expedition.revisionId,slug:expedition.content.slug,formRevisionId:expedition.form.publishedRevisionId,departures:expedition.upcoming}}/>}/>;
  }
  const expedition = getExpedition(slug);
  if (!expedition) notFound();
  const heroSummaries: Record<string, {title:string; copy:string}> = {
    "kaziranga-wildlife-photography-expedition": {title:"Kaziranga", copy:"Six wildlife safaris, grassland encounters and a Gibbon Sanctuary visit, with photography mentoring from Team Safari Crafters."},
    "kamchatka-wildlife-photography-expedition": {title:"Kamchatka", copy:"Brown bears, salmon waters and photography on the shores of Lake Kuril."},
    "kanha-wildlife-photography-expedition": {title:"Kanha", copy:"Five days of wildlife photography, winter light and expert mentoring in Kanha’s forests and meadows."},
    "laikipia-black-leopard-expedition": {title:"Laikipia", copy:"Black leopard tracking and patient photography in Kenya’s private conservancies."},
    "svalbard-expedition": {title:"Svalbard", copy:"An intimate Arctic voyage shaped by sea ice, wildlife and extraordinary light."},
    "the-pantanal-wetlands": {title:"The Pantanal", copy:"Jaguar encounters, river safaris and remarkable birdlife in Brazil’s vast wetlands."}
  };
  const heroSummary = heroSummaries[slug] || {title:expedition.title.replace(/ Photography Expedition$/, ""), copy:expedition.description};
  const heroImage = (slug === "kaziranga-wildlife-photography-expedition" || slug === "kamchatka-wildlife-photography-expedition") ? expedition.image : expedition.gallery.find((image, index) => index > 0 && image.src !== expedition.image.src)
    || expedition.gallery.find((image) => image.src !== expedition.image.src)
    || expedition.image;
  const tourDestinations: Record<string, string> = {
    "corbett-wildlife-photography-expedition": "corbett",
    "tadoba-wildlife-photography-expedition": "tadoba",
    "kamchatka-wildlife-photography-expedition": "kamchatka",
    "kanha-wildlife-photography-expedition": "kanha",
    "laikipia-black-leopard-expedition": "laikipia",
    "svalbard-expedition": "svalbard",
    "the-pantanal-wetlands": "pantanal",
    "bharatpur-photography-expedition": "bharatpur-keoladeo",
    "panna-photography-expedition": "panna",
    "ranthambhore-photography-expedition": "ranthambhore",
    "kaziranga-wildlife-photography-expedition": "kaziranga"
  };
  const destinationSlug = tourDestinations[expedition.slug];
  const destinationGallery = destinationSlug === "kaziranga"
    ? (getDestination("kaziranga")?.gallery ?? []).filter((_, index) => [2, 3, 4, 6, 9].includes(index))
    : [];
  const seenImages = new Set<string>();
  const visualGallery = [expedition.image, ...expedition.gallery, ...destinationGallery]
    .filter((image) => image.src !== heroImage.src)
    .filter((image) => !destinationSlug || (image.src.startsWith(`/assets/destinations/${destinationSlug}/`) || image.src.startsWith(`/assets/expeditions/${destinationSlug}/`)))
    .filter((image) => {
      if (seenImages.has(image.src)) return false;
      seenImages.add(image.src);
      return true;
    });
  const departures = upcomingDepartures(expedition);
  const formatDate = (date:string) => new Date(date).toLocaleDateString("en-GB", {day:"numeric", month:"long", year:"numeric", timeZone:"UTC"});
  const bookableDepartures = departures.filter(item => item.status !== "Full");
  const departure = expedition.enquiryDeparture || (bookableDepartures.length ? departureLabel(bookableDepartures[0]) : undefined);
  const faqs = photoTourFaqs(expedition);
  const intro = uniqueTourCopy(expedition.intro.split(/\n\s*\n/), [expedition.heroCopy || expedition.description]).join('\n\n');
  const highlights = uniqueTourCopy(expedition.highlights, expedition.intro.split(/\n\s*\n/));
  const breadcrumbs = [
    { name: "Home", path: "/" },
    { name: "Photography Tours", path: "/photo-expeditions" },
    { name: expedition.title, path: `/photo-expeditions/${expedition.slug}` }
  ];

  return (
    <>
      <JsonLd data={expeditionSchema(expedition)} />
      <JsonLd data={faqSchema(faqs)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <div className="expedition-hero"><PageHero
        variant="destination"
        titleSize="compact"
        accent={expedition.heroTitle || heroSummary?.title || expedition.title}
        title={expedition.heroTitle || heroSummary?.title || expedition.title}
        copy={expedition.heroCopy || expedition.description}
        image={heroImage}
        meta="Photography Tours"
        breadcrumbs={breadcrumbs.map((item, index) => ({ label: index === breadcrumbs.length - 1 ? heroSummary?.title || item.name : item.name, ...(index < breadcrumbs.length - 1 ? { href: item.path } : {}) }))}
      /></div>
      {expedition.publicationStatus === "preview" && <p className="expedition-preview-note" role="note">Departure preview · The programme, accommodation and pricing are being finalised. Enquire to receive confirmed details.</p>}
      <article className="section detail expedition-detail">
        <div className="container detail-grid">
          <div>
            <h2 className="expedition-section-title">Photographer-led</h2>
            <EditorialProse
              text={intro}
              className="intro editorial-prose"
              collapsible
            />
        {highlights.length ? (
          <div className="expedition-opening-highlights">
            <h3 className="expedition-highlights-title">Highlights</h3>
            <ul className="highlight-list">
              {highlights.map((highlight) => (
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

              <dt>Tour price</dt><dd>{tourPriceLabel(expedition.price)}</dd>
            </dl>
            {expedition.equipment && <details className="expedition-equipment"><summary>Camera equipment</summary><p>{expedition.equipment}</p></details>}
            <section className="expedition-departures" aria-label="Upcoming departures">
              <h2>Upcoming departures</h2>
              {departures.length ? <ul>{departures.map(item => <li key={item.date}><span><time dateTime={item.date}>{formatDate(item.date)}{item.endDate ? " – " + formatDate(item.endDate) : ""}</time>{item.status === "Full" && expedition.enquiryDeparture && <span style={{ display: "block", marginTop: 8, fontSize: "0.875rem", fontWeight: 600 }}>Booking open for {expedition.enquiryDeparture.match(/20\d{2}/)?.[0]}</span>}</span><span className={"departure-status departure-status-" + item.status.toLowerCase().replace(/ /g,"-")}>{item.status === "Full" ? "Sold out" : item.availability && item.status === "Available" ? item.availability : item.status}</span></li>)}</ul> : <p>New dates being finalised. Enquire to register your interest.</p>}
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
            <MediaGallery images={visualGallery} maxImages={30} initialCount={6} label={`${expedition.title} complete photographic journal`} />
          </section>
        ) : null}
        <section data-tour-faq className={`container ${informationStyles.section}`} aria-labelledby="tour-faq-heading"><header className={informationStyles.intro}><p className="eyebrow">Photography tour questions</p><h2 id="tour-faq-heading">Before you <em className="editorial-accent">set out.</em></h2><p>Practical answers to help you prepare for your photography tour.</p></header><div className={informationStyles.questions}>{faqs.map(faq => <details key={faq.question} name="photography-faq"><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div></section>
        <EditorialFilm video={expedition.video} />
        <BookingConditions cancellationPolicy={expedition.cancellationPolicy} paymentTerms={expedition.paymentTerms} />
        <ExpeditionEnquiry
          title={expedition.title}
          slug={expedition.slug}
          departure={departure}
          departureOptions={expedition.enquiryDeparture ? [expedition.enquiryDeparture] : bookableDepartures.map(item=>departureLabel(item))}
          mentor={expedition.mentor}
          region={expedition.category}
        />
      </article>
    </>
  );
}

// Time-based departure filtering must not be frozen at build time.
export const dynamic = "force-dynamic";
