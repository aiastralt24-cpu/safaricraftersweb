import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Destination, DestinationPairing, Expedition, FAQItem, Journey } from "@/lib/data";
import { getDestination } from "@/lib/data";
import type { FieldIntelligence } from "@/lib/luxury";
import { isApprovedEditorialImage } from "@/lib/media";
import { EditorialProse } from "@/components/EditorialProse";
import { MediaGallery } from "@/components/MediaGallery";
import "./DestinationDossier.css";

type Props = {
  destination: Destination;
  intelligence: FieldIntelligence;
  faqs: FAQItem[];
  pairings: DestinationPairing[];
  relatedJourneys: Journey[];
  relatedExpeditions?: Expedition[];
};

const preferredFieldImages: Record<string, string> = {
  ranthambhore: "/assets/safari-crafters/gallery-1-4-36bf1cbd.jpg",
  "spiti-valley": "/assets/safari-crafters/gallery-1-6-scaled-3cc0d563.jpg",
  bandhavgarh: "/assets/safari-crafters/gallery-6-8-scaled-4b3cd8ba.jpg",
  kanha: "/assets/safari-crafters/gallery-4-9-scaled-e430583e.jpg",
  panna: "/assets/safari-crafters/gallery-7-10-scaled-11e6dbd2.jpg",
  kaziranga: "/assets/safari-crafters/gallery-4-12-7f229eee.jpg",
  uganda: "/assets/safari-crafters/gallery-1-14-fa4d3962.jpg",
  chile: "/assets/safari-crafters/gallery-4-11-scaled-adcc3b24.jpg",
  gir: "/assets/safari-crafters/gallery-2-6-47d03ed0.jpg"
};

export function DestinationDossier({ destination, intelligence, faqs, pairings, relatedJourneys, relatedExpeditions = [] }: Props) {
  const isConcierge = destination.status === "concierge";
  const sourceGallery = [...new Map(
    [...destination.gallery, destination.image]
      .filter(isApprovedEditorialImage)
      .map((image) => [image.src, image])
  ).values()];
  const preferredFieldImage = preferredFieldImages[destination.slug];
  const gallery = preferredFieldImage
    ? [...sourceGallery].sort((left, right) => Number(right.src === preferredFieldImage) - Number(left.src === preferredFieldImage))
    : sourceGallery;
  const hasVisualStory = gallery.length >= 3;
  const fieldImage = hasVisualStory ? (gallery[5] || gallery[1]) : undefined;

  return (
    <article className="destination-dossier">
      <section className="container destination-opening">
        <div>
          <p className="eyebrow">The character of {destination.title}</p>
          <h2>A landscape understood through time in the field.</h2>
        </div>
        <EditorialProse text={destination.intro} className="destination-opening-prose" />
      </section>

      <dl className="container destination-essentials" aria-label={`${destination.title} essentials`}>
        <Essential label="Best window" value={destination.bestMonths} />
        <Essential label="Ideal stay" value={destination.idealStay || intelligence.idealStay} />
        <Essential label="Gateway" value={destination.gateway || intelligence.airport} />
        <Essential label="Best suited to" value={destination.bestFor.join(" · ")} />
      </dl>

      {isConcierge ? (
        <section className="container destination-private-note">
          <p className="eyebrow">A note from the atelier</p>
          <h2>Held for a considered private brief.</h2>
          <p>{destination.planningNote}</p>
        </section>
      ) : null}

      {hasVisualStory ? <section className="destination-visual-story" aria-label={`${destination.title} photographic story`}>
        <div className="container destination-visual-heading">
          <p className="eyebrow">In the field</p>
          <h2>{destination.title}, in its own light.</h2>
        </div>
        <MediaGallery images={gallery.slice(0, 5)} label={`${destination.title} photographic story`} variant="story" />
      </section> : null}

      <section className="container destination-rhythm">
        <div className="destination-rhythm-heading">
          <p className="eyebrow">The rhythm of the place</p>
          <h2>Space around the sighting.</h2>
          <p>{destination.safariRhythm || intelligence.safariRhythm}</p>
        </div>
        <div className="destination-rhythm-notes">
          <RhythmNote number="01" label="Field priority" text={destination.wildlife} />
          <RhythmNote number="02" label="Photographic character" text={destination.photography} />
          <RhythmNote number="03" label="Arrival and access" text={destination.access || intelligence.transfer} />
        </div>
      </section>

      <section className={`container destination-wildlife${fieldImage ? "" : " is-textual"}`}>
        {fieldImage ? <div className="destination-wildlife-image">
          <Image
            src={fieldImage.src}
            alt={fieldImage.alt}
            fill
            sizes="(max-width: 760px) 100vw, 52vw"
            style={{ objectPosition: fieldImage.focalPoint || "center" }}
          />
        </div> : null}
        <div className="destination-wildlife-copy">
          <p className="eyebrow">Wildlife, honestly framed</p>
          <h2>What defines the encounter.</h2>
          <p>{destination.wildlife}</p>
          <p>{destination.habitat || destination.planningNote}</p>
          <span>Every proposal is reconfirmed against current local conditions, access and ethical field practice.</span>
        </div>
      </section>

      {relatedJourneys.length ? (
        <section className="container destination-journeys">
          <div className="destination-section-heading">
            <p className="eyebrow">Private journey blueprints</p>
            <h2>Routes that hold {destination.title} naturally.</h2>
          </div>
          <div className="destination-journey-grid">
            {relatedJourneys.slice(0, 3).map((journey) => (
              <article key={journey.slug}>
                <Link className="destination-journey-image" href={`/journeys/${journey.slug}`}>
                  <Image src={journey.image.src} alt={journey.image.alt} fill sizes="(max-width: 760px) 100vw, 33vw" />
                </Link>
                <p>{journey.duration} · {journey.bestMonths}</p>
                <h3><Link href={`/journeys/${journey.slug}`}>{journey.title}</Link></h3>
                <Link className="destination-inline-link" href={`/journeys/${journey.slug}`}>Refine this journey <ArrowUpRight size={15} /></Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {relatedExpeditions.length ? (
        <section className="container destination-journeys">
          <div className="destination-section-heading">
            <p className="eyebrow">Photography-led expedition</p>
            <h2>Go further into {destination.title}.</h2>
          </div>
          <div className="destination-journey-grid">
            {relatedExpeditions.slice(0, 3).map((expedition) => (
              <article key={expedition.slug}>
                <Link className="destination-journey-image" href={`/photo-expeditions/${expedition.slug}`}>
                  <Image
                    src={expedition.image.src}
                    alt={expedition.image.alt}
                    fill
                    sizes="(max-width: 760px) 100vw, 33vw"
                    style={{ objectPosition: expedition.image.focalPoint || "center" }}
                  />
                </Link>
                <p>{expedition.skill} · Future dates on request</p>
                <h3><Link href={`/photo-expeditions/${expedition.slug}`}>{expedition.title}</Link></h3>
                <Link className="destination-inline-link" href={`/photo-expeditions/${expedition.slug}`}>Explore the expedition <ArrowUpRight size={15} /></Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {pairings.length ? (
        <section className="container destination-pairings">
          <div className="destination-section-heading">
            <p className="eyebrow">Continue with purpose</p>
            <h2>Places that belong in the same conversation.</h2>
          </div>
          <div>
            {pairings.map((pairing, index) => {
              const pairedDestination = getDestination(pairing.slug);
              const pairingImageCount = pairedDestination
                ? pairings.filter((item) => getDestination(item.slug)?.image.src === pairedDestination.image.src).length
                : 0;
              const showPairingImage = Boolean(pairedDestination && isApprovedEditorialImage(pairedDestination.image) && pairingImageCount === 1);
              return (
                <article className={showPairingImage ? "has-image" : "is-textual"} key={pairing.slug}>
                  {showPairingImage && pairedDestination ? (
                    <Link className="destination-pairing-image" href={`/destinations/${pairing.slug}`}>
                      <Image src={pairedDestination.image.src} alt={pairedDestination.image.alt} fill sizes="(max-width: 760px) 100vw, 33vw" />
                    </Link>
                  ) : null}
                  <span>0{index + 1}</span>
                  <h3><Link href={`/destinations/${pairing.slug}`}>{pairing.title}</Link></h3>
                  <p>{pairing.reason}</p>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="container destination-planning-questions">
        <div className="destination-section-heading">
          <p className="eyebrow">Before you travel</p>
          <h2>Planning {destination.title}</h2>
        </div>
        <div className="destination-faqs">
          {faqs.map((faq) => (
            <details key={faq.question}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
        <p className="content-reviewed">Planning information reviewed {destination.seo?.reviewedAt || "July 2026"}. Conditions remain subject to local advice.</p>
        {destination.sources?.length ? (
          <details className="destination-sources">
            <summary>Research and source notes</summary>
            <ul>
              {destination.sources.map((source) => (
                <li key={source.url}><a href={source.url} rel="noreferrer" target="_blank">{source.publisher}: {source.title}</a></li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>

      <section className="destination-specialist destination-specialist-textual">
        <div className="destination-specialist-copy">
          <p className="eyebrow">Your private brief</p>
          <h2>Plan {destination.title} with Safari Crafters.</h2>
          <p>Each itinerary is designed around your expectations, preferred accommodation and the natural rhythm of each day in the wilderness.</p>
          <Link className="button button-solid" href={`/plan?destination=${destination.slug}`}>
            Begin planning
          </Link>
        </div>
      </section>
    </article>
  );
}

function Essential({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function RhythmNote({ number, label, text }: { number: string; label: string; text: string }) {
  return <article><span>{number}</span><div><h3>{label}</h3><p>{text}</p></div></article>;
}
