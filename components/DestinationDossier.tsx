import { copyAlreadyCovered, uniqueDestinationParagraphs } from '@/lib/destination-content';
import { ItineraryBento } from "@/components/ItineraryBento";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Destination, DestinationCombo, DestinationPairing, Expedition, FAQItem, ImageAsset, Journey } from "@/lib/data";
import { getDedicatedDestinationCombos, getDestination } from "@/lib/data";
import type { FieldIntelligence } from "@/lib/luxury";
import { isApprovedEditorialImage } from "@/lib/media";
import { EditorialProse } from "@/components/EditorialProse";
import { ExpandableText } from "@/components/ExpandableText";
import { MediaGallery } from "@/components/MediaGallery";
import { DestinationMotion } from "@/components/DestinationMotion";
import { DestinationFieldNotes } from "@/components/DestinationFieldNotes";
import "./DestinationDossier.css";

type Props = { heroCopy?: string; destination: Destination; intelligence: FieldIntelligence; faqs: FAQItem[]; pairings: DestinationPairing[]; relatedJourneys: Journey[]; relatedExpeditions?: Expedition[] };

export function DestinationDossier({ destination, intelligence, faqs, pairings, heroCopy }: Props) {
  const dedicatedCombos = getDedicatedDestinationCombos(destination.slug);
  const visiblePairings = pairings.filter(pairing => getDestination(pairing.slug)).slice(0, 3);
  const approvedGallery = [...new Map([...destination.gallery, destination.image].filter(isApprovedEditorialImage).map((image) => [image.src, image])).values()];
  const gallery = approvedGallery.length ? approvedGallery : [destination.image];
  const photoGallery = gallery.slice(0, destination.slug === "masai-mara" ? 30 : 12);
  const introText = uniqueDestinationParagraphs(destination.intro, heroCopy ? [heroCopy] : []);
  const introParagraphs = introText.split(/\n\s*\n/).filter(Boolean);
  const chapters = [
    { label: "The landscape", title: destination.editorial?.landscapeHeadline || `${destination.title}, read slowly.`, copy: destination.editorial?.landscapeCopy || destination.habitat || introParagraphs[0] || destination.description, image: gallery[1] || gallery[0] },
    { label: "In the field", title: "Follow the rhythm, not a checklist.", copy: destination.safariRhythm || intelligence.safariRhythm, image: gallery[2] || gallery[0] },
    ...(!destination.editorial?.wildlifeCopy ? [{ label: "The encounter", title: destination.editorial?.wildlifeHeadline || "Wildlife, honestly framed.", copy: destination.wildlife, image: gallery[3] || gallery[1] || gallery[0] }] : [])
  ].filter(note => !copyAlreadyCovered(note.copy, [destination.intro]));
  const wildlifeCopy = destination.editorial?.wildlifeCopy;
  const showWildlifeStory = wildlifeCopy && !copyAlreadyCovered(wildlifeCopy, [destination.intro, ...chapters.map(note => note.copy)]);

  return <article className="destination-dossier">
    <DestinationMotion />
    <dl className="destination-facts" aria-label={`${destination.title} essentials`}>
      <Essential label={destination.editorial?.factsLabel || "Best for"} value={destination.bestFor.join(" · ")} collapsible />
      <Essential label="Best months" value={destination.bestMonths} />
      <Essential label="Ideal duration" value={destination.idealStay || intelligence.idealStay} />
      <Essential label="Getting there" value={destination.gateway || intelligence.airport} />
    </dl>

    {introText && <section className="container destination-opening">
      <div><p className="eyebrow">Introducing {destination.title}</p><h2>{destination.editorial?.openingHeadline ? <DestinationOpeningHeadline text={destination.editorial.openingHeadline} accent={destination.editorial.openingAccent} /> : <>{destination.title}, <em className="editorial-accent">up close.</em></>}</h2></div>
      <EditorialProse text={introText} className="destination-opening-prose" collapsible />
    </section>}

    {chapters.length > 0 && <DestinationFieldNotes destination={destination.title} notes={chapters} />}

    <section className="destination-photo-journal" aria-labelledby="destination-gallery-title">
      <header className="container destination-photo-heading destination-editorial-heading" data-destination-gallery-heading>
        <p className="eyebrow">Photo journal</p>
        <h2 id="destination-gallery-title"><span>{destination.title},</span><span>in <em className="editorial-accent">frames.</em></span></h2>
        <p>Open any photograph to explore the collection in full screen.</p>
      </header>
      <MediaGallery images={photoGallery} label={`${destination.title} photo gallery`} variant="story" maxImages={photoGallery.length} />
    </section>

    {showWildlifeStory ? <section className="container destination-wildlife-story">
      <div className="destination-wildlife-story-image"><Image src={(gallery[3] || gallery[1] || gallery[0]).src} alt={(gallery[3] || gallery[1] || gallery[0]).alt} fill sizes="(max-width: 900px) 100vw, 50vw" /></div>
      <div><p className="eyebrow">The encounter</p><h2>{destination.editorial?.wildlifeHeadline}</h2><EditorialProse text={wildlifeCopy} /></div>
    </section> : null}

    {dedicatedCombos.length ? <DestinationCombos destination={destination} combos={dedicatedCombos} /> : null}


    {faqs.length > 0 && <section className="container destination-faq-section" aria-label={`${destination.title} frequently asked questions`}><div><p className="eyebrow">Good to know</p><h2>Questions,<br /><em className="editorial-accent">answered.</em></h2></div><div className="destination-faqs">
      {faqs.map((faq) => <details key={faq.question} name="destination-faq"><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}
    </div></section>}

    {!dedicatedCombos.length && visiblePairings.length ? <section className="container destination-pairings"><header className="destination-editorial-heading"><p className="eyebrow">{destination.editorial?.relatedLabel || "Keep exploring"}</p><h2>{destination.editorial?.relatedHeadline ? <span>{destination.editorial.relatedHeadline}</span> : <>Places to <em className="editorial-accent">explore.</em></>}</h2><p className="destination-pairings-intro">{destination.editorial?.relatedIntro || "Extend the journey through landscapes that share a natural rhythm, wildlife story or sense of place."}</p></header><div className={`destination-card-grid${visiblePairings.length === 1 ? " is-single" : visiblePairings.length === 2 ? " has-two" : ""}`}>
      {visiblePairings.map((pairing) => { const place = getDestination(pairing.slug); return place ? <RelatedCard key={pairing.slug} href={`/destinations/${pairing.slug}`} image={place.image} wide={visiblePairings.length === 1} meta={place.country} title={pairing.title} description={pairing.reason} /> : null; })}
    </div><Link className="destination-all-link" href="/destinations">Explore all destinations <ArrowUpRight size={16} /></Link></section> : null}

    <DestinationPlan destination={destination} />
  </article>;
}


const openingAccents = [
  "prime theatre.", "defences.", "Ghost Cat", "rare ponders.", "earth.",
  "tiger country", "experience.", "close encounters", "able.", "greatness.",
  "calling you back.", "imagination.", "a volcano.", "wilder north.", "Kenya.",
  "ordinary.", "elemental.", "forest pace.", "look.", "savannah.", "coffee hills.",
  "the sea.", "Colombia.", "feel wild.", "cloud line.", "the water."
];

function DestinationOpeningHeadline({ text, accent: selectedAccent }: { text: string; accent?: string }) {
  const accent = selectedAccent && text.endsWith(selectedAccent) ? selectedAccent : openingAccents.find((phrase) => text.endsWith(phrase));
  if (!accent) return <>{text}</>;
  return <>{text.slice(0, -accent.length)}<em className="editorial-accent">{accent}</em></>;
}

function DestinationPlan({ destination }: { destination: Destination }) {
  return <section className="destination-plan"><div className="container destination-plan-inner">
    <div><p className="eyebrow">Your private journey</p><h2>{destination.editorial?.plannerHeadline || <>{destination.title},<br /><em className="editorial-accent-light">your way.</em></>}</h2></div>
    <div><p>{destination.editorial?.plannerCopy || "Tell us what draws you here. We will shape the right season, access, pace and places into one coherent private journey."}</p><Link className="destination-plan-link" href={`/plan?destination=${destination.slug}`}>{destination.editorial?.plannerCta || "Begin planning"} <ArrowUpRight size={16} /></Link></div>
  </div></section>;
}

function DestinationCombos({ destination, combos }: { destination: Destination; combos: DestinationCombo[] }) {
  return <section className="destination-combos" aria-labelledby={`destination-combos-${destination.slug}`}>
    <header className="container destination-combos-heading">
      <p className="eyebrow">Destination combinations</p>
      <h2 id={`destination-combos-${destination.slug}`}>Better <em className="editorial-accent">together.</em></h2>
      <p>Considered routes that place {destination.title} in a wider journey without rushing either landscape.</p>
    </header>
    <div className="container"><ItineraryBento items={combos.map((combo,index)=>{
      const place = getDestination(combo.imageSlug) || destination;
      const image = place.gallery[index % Math.max(place.gallery.length,1)] || place.image;
      return { title:combo.title, label:"Suggested journey", copy:combo.description, image, href:combo.href, cta:combo.href.startsWith("/journeys/") ? "Explore journey" : "Start planning" };
    })}/></div>
  </section>;
}

function Essential({ label, value, collapsible = false }: { label: string; value: string; collapsible?: boolean }) {
  return <div><dt>{label}</dt><dd>{collapsible ? <ExpandableText desktopLines={5} mobileLines={4}>{value}</ExpandableText> : value}</dd></div>;
}
function RelatedCard({ href, image, meta, title, description, wide = false }: { href: string; image: ImageAsset; meta: string; title: string; description: string; wide?: boolean }) { return <article className="destination-related-card"><Link className="destination-related-image" href={href}><Image src={image.src} alt={image.alt} fill sizes={wide ? "(max-width: 760px) 100vw, 55vw" : "(max-width: 760px) 100vw, 33vw"} /></Link><p>{meta}</p><h3><Link href={href}>{title}</Link></h3><p className="destination-related-description">{description}</p><Link className="destination-related-link" href={href}>Explore {title} <ArrowUpRight size={15} /></Link></article>; }
