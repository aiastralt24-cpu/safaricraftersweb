import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Destination, DestinationPairing, FAQItem, Journey } from "@/lib/data";
import { getDestination, specialists } from "@/lib/data";
import type { FieldIntelligence } from "@/lib/luxury";
import { EditorialProse } from "@/components/EditorialProse";
import "./DestinationDossier.css";

type Props = {
  destination: Destination;
  intelligence: FieldIntelligence;
  faqs: FAQItem[];
  pairings: DestinationPairing[];
  relatedJourneys: Journey[];
};

export function DestinationDossier({ destination, intelligence, faqs, pairings, relatedJourneys }: Props) {
  const isConcierge = destination.status === "concierge";
  const gallery = destination.gallery.length ? destination.gallery : [destination.image];
  const specialist = destination.continent === "India" ? specialists[0] : specialists[1];
  const specialistPortrait = destination.continent === "India"
    ? "/assets/founders/kairav-engineer.jpg"
    : "/assets/founders/gaurav-ramnarayanan.jpg";

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

      <section className="destination-visual-story" aria-label={`${destination.title} photographic story`}>
        <div className="container destination-visual-heading">
          <p className="eyebrow">In the field</p>
          <h2>{destination.title}, in its own light.</h2>
        </div>
        <div className="destination-visual-grid">
          {gallery.slice(0, 5).map((image, index) => (
            <figure className={`destination-visual-frame frame-${index + 1}`} key={`${image.src}-${index}`}>
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes={index === 0 ? "100vw" : "(max-width: 760px) 100vw, 50vw"}
              />
              {image.credit ? <figcaption>{image.credit}</figcaption> : null}
            </figure>
          ))}
        </div>
      </section>

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

      <section className="container destination-wildlife">
        <div className="destination-wildlife-image">
          <Image
            src={(gallery[5] || gallery[1] || destination.image).src}
            alt={(gallery[5] || gallery[1] || destination.image).alt}
            fill
            sizes="(max-width: 760px) 100vw, 52vw"
          />
        </div>
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
              return (
                <article className={pairingImageCount === 1 ? "has-image" : "is-textual"} key={pairing.slug}>
                  {pairedDestination && pairingImageCount === 1 ? (
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

      <section className="destination-specialist">
        <div className="destination-specialist-image">
          <Image src={specialistPortrait} alt={`${specialist.name}, ${specialist.role} at Safari Crafters`} fill sizes="(max-width: 760px) 100vw, 42vw" />
        </div>
        <div className="destination-specialist-copy">
          <p className="eyebrow">Your private brief</p>
          <h2>Shape {destination.title} with {specialist.name}.</h2>
          <p>{specialist.expertise}</p>
          <span>{specialist.moment}</span>
          <Link className="button button-solid" href={`/plan?destination=${destination.slug}&specialist=${encodeURIComponent(specialist.name)}`}>
            Begin with {specialist.name.split(" ")[0]}
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
