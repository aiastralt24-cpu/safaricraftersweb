import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Destination, DestinationCombo, DestinationPairing, Expedition, FAQItem, ImageAsset, Journey } from "@/lib/data";
import { getDedicatedDestinationCombos, getDestination } from "@/lib/data";
import type { FieldIntelligence } from "@/lib/luxury";
import { isApprovedEditorialImage } from "@/lib/media";
import { EditorialProse } from "@/components/EditorialProse";
import { MediaGallery } from "@/components/MediaGallery";
import { DestinationMotion } from "@/components/DestinationMotion";
import { DestinationFieldNotes } from "@/components/DestinationFieldNotes";
import "./DestinationDossier.css";

type Props = { destination: Destination; intelligence: FieldIntelligence; faqs: FAQItem[]; pairings: DestinationPairing[]; relatedJourneys: Journey[]; relatedExpeditions?: Expedition[] };

const supplementalImages: Record<string, ImageAsset[]> = {
  laikipia: [
    { src: "/assets/safari-crafters/kenya-1-e9e06241.jpg", alt: "Black leopard moving through Laikipia grassland", credit: "Safari Crafters archive" },
    { src: "/assets/safari-crafters/kenya-2-d6840ff9.jpg", alt: "Serval in Kenya's highland grassland", credit: "Safari Crafters archive" },
    { src: "/assets/safari-crafters/laikipia-highlights-fc6df289.jpg", alt: "Black leopard crossing a Laikipia river", credit: "Safari Crafters archive" }
  ]
};

export function DestinationDossier({ destination, intelligence, faqs, pairings }: Props) {
  const dedicatedCombos = getDedicatedDestinationCombos(destination.slug);
  const approvedGallery = [...new Map([...destination.gallery, ...(supplementalImages[destination.slug] || []), destination.image].filter(isApprovedEditorialImage).map((image) => [image.src, image])).values()];
  const gallery = approvedGallery.length ? approvedGallery : [destination.image];
  const photoGallery = gallery.slice(0, 6);
  const introParagraphs = destination.intro.split(/\n\s*\n/).filter(Boolean);
  const chapters = [
    { label: "The landscape", title: destination.editorial?.landscapeHeadline || `${destination.title}, read slowly.`, copy: destination.habitat || introParagraphs[0] || destination.description, image: gallery[1] || gallery[0] },
    { label: "In the field", title: "Follow the rhythm, not a checklist.", copy: destination.safariRhythm || intelligence.safariRhythm, image: gallery[2] || gallery[0] },
    { label: "The encounter", title: destination.editorial?.wildlifeHeadline || "Wildlife, honestly framed.", copy: destination.wildlife, image: gallery[3] || gallery[1] || gallery[0] }
  ];

  return <article className="destination-dossier">
    <DestinationMotion />
    <dl className="destination-facts" aria-label={`${destination.title} essentials`}>
      <Essential label="Best for" value={destination.bestFor.join(" · ")} />
      <Essential label="Best months" value={destination.bestMonths} />
      <Essential label="Ideal duration" value={destination.idealStay || intelligence.idealStay} />
      <Essential label="Getting there" value={destination.gateway || intelligence.airport} />
    </dl>

    <section className="container destination-opening">
      <div><p className="eyebrow">Introducing {destination.title}</p><h2>{destination.editorial?.openingHeadline || "A landscape with no need to perform."}</h2></div>
      <EditorialProse text={destination.intro} className="destination-opening-prose" />
    </section>

    <DestinationFieldNotes destination={destination.title} notes={chapters} />

    <section className="destination-photo-journal" aria-labelledby="destination-gallery-title">
      <header className="container destination-photo-heading destination-editorial-heading" data-destination-gallery-heading>
        <p className="eyebrow">Photo journal</p>
        <h2 id="destination-gallery-title"><span>{destination.title},</span><span>in frames.</span></h2>
        <p>Open any photograph to explore the collection in full screen.</p>
      </header>
      <MediaGallery images={photoGallery} label={`${destination.title} photo gallery`} variant="story" />
    </section>

    {dedicatedCombos.length ? <DestinationCombos destination={destination} combos={dedicatedCombos} /> : null}

    <section className="destination-plan"><div className="container destination-plan-inner">
      <div><p className="eyebrow">Your private journey</p><h2>Make your own {destination.title} plan.</h2></div>
      <div><p>Tell us what draws you here. We will shape the right season, access, pace and places into one coherent private journey.</p><Link className="destination-plan-link" href={`/plan?destination=${destination.slug}`}>Begin planning <ArrowUpRight size={16} /></Link></div>
    </div></section>

    <section className="container destination-faq-section"><div><p className="eyebrow">Good to know</p><h2>Question, meet answer.</h2></div><div className="destination-faqs">
      {faqs.map((faq) => <details key={faq.question} name="destination-faq"><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}
    </div></section>

    {!dedicatedCombos.length && pairings.length ? <section className="container destination-pairings"><header className="destination-editorial-heading"><p className="eyebrow">Keep exploring</p><h2><span>Places in the same</span><span>conversation.</span></h2><p className="destination-pairings-intro">Extend the journey through landscapes that share a natural rhythm, wildlife story or sense of place.</p></header><div className="destination-card-grid">
      {pairings.slice(0, 3).map((pairing) => { const place = getDestination(pairing.slug); return place ? <RelatedCard key={pairing.slug} href={`/destinations/${pairing.slug}`} image={place.image} meta={place.country} title={pairing.title} /> : null; })}
    </div></section> : null}
  </article>;
}

function DestinationCombos({ destination, combos }: { destination: Destination; combos: DestinationCombo[] }) {
  return <section className="destination-combos" aria-labelledby={`destination-combos-${destination.slug}`}>
    <header className="container destination-combos-heading">
      <p className="eyebrow">Destination combinations</p>
      <h2 id={`destination-combos-${destination.slug}`}>Better together.</h2>
      <p>Considered routes that place {destination.title} in a wider journey without rushing either landscape.</p>
    </header>
    <div className={`container destination-combo-grid${combos.length === 2 ? " has-two" : ""}`}>
      {combos.map((combo, index) => {
        const place = getDestination(combo.imageSlug) || destination;
        const image = place.gallery[0] || place.image;
        return <article key={combo.title} className="destination-combo-card">
          <Link className="destination-combo-image" href={combo.href}>
            <Image src={image.src} alt={image.alt} fill sizes="(max-width: 760px) 100vw, 34vw" />
            <span>{String(index + 1).padStart(2, "0")}</span>
          </Link>
          <div>
            <h3><Link href={combo.href}>{combo.title}</Link></h3>
            <p>{combo.description}</p>
            <Link className="destination-combo-link" href={combo.href}>{combo.href.startsWith("/journeys/") ? "Explore journey" : "Start planning"} <ArrowUpRight size={15} /></Link>
          </div>
        </article>;
      })}
    </div>
  </section>;
}

function Essential({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
function RelatedCard({ href, image, meta, title }: { href: string; image: ImageAsset; meta: string; title: string }) { return <article className="destination-related-card"><Link className="destination-related-image" href={href}><Image src={image.src} alt={image.alt} fill sizes="(max-width: 760px) 100vw, 33vw" /></Link><p>{meta}</p><h3><Link href={href}>{title}</Link></h3></article>; }
