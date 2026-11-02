import Image from "next/image";
import Link from "next/link";
import type { Journey } from "@/lib/data";
import { tourPriceLabel } from "@/lib/tour-pricing";
import "./BigCatsOverview.css";

const chapters = [
  { animal: "Snow leopard", place: "Ladakh", slug: "ladakh", photo: "0f71412edf77", alt: "A snow leopard climbing a rocky cliff in Ladakh", position: "50% 50%" },
  { animal: "Bengal tiger", place: "Ranthambhore", slug: "ranthambhore", photo: "8b4d115003ed", alt: "A tiger walking beside a lake in Ranthambhore", position: "62% 70%" },
  { animal: "Indian leopard", place: "Jawai", slug: "jawai", photo: "4dcb8ddd665c", alt: "Two leopards among the granite boulders of Jawai", position: "50% 50%" },
  { animal: "Asiatic lion", place: "Gir", slug: "gir", photo: "834159d44bdd", alt: "An Asiatic lion resting in Gir forest", position: "60% 35%" }
];

export function BigCatsOverview({ journey }: { journey: Journey }) {
  return <section className="container cats-overview" aria-labelledby="cats-overview-title">
    <header className="cats-overview-intro">
      <div><p className="eyebrow">The journey</p><h2 id="cats-overview-title">Four cats. Four worlds.<br />One India.</h2></div>
      <p>Seek snow leopards in Ladakh, tigers in Ranthambhore, leopards in Jawai and Asiatic lions in Gir. Four distinct landscapes, connected by one private journey.</p>
    </header>
    <div className="cats-overview-photos">{chapters.map(chapter => <Link href={`/destinations/${chapter.slug}`} className="cats-overview-tile" key={chapter.slug}>
      <div className="cats-overview-photo"><Image src={`/assets/destinations/${chapter.slug}/field-photographs/${chapter.photo}.webp`} alt={chapter.alt} fill sizes="(max-width: 760px) 45vw, 23vw" style={{ objectPosition: chapter.position }} /></div>
      <span className="cats-overview-place">{chapter.place}<span aria-hidden="true">↗</span></span><h3>{chapter.animal}</h3>
    </Link>)}</div>
    <div className="cats-overview-footer"><dl>
      <div><dt>Group size</dt><dd>{journey.groupSize}</dd></div>
      <div><dt>Difficulty</dt><dd>{journey.difficulty}</dd></div>
      <div><dt>Journey price</dt><dd>{tourPriceLabel(journey.price)}</dd></div>
    </dl><Link className="cats-overview-action" href={`/plan?journey=${journey.slug}`}>Plan this journey <span aria-hidden="true">↗</span></Link></div>
  </section>;
}
