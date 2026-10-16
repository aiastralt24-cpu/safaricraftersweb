import { departureLabel, upcomingDepartures, isFeaturedExpedition } from "@/lib/departures";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Expedition } from "@/lib/data";
import { PageHero } from "@/components/PageHero";

import { DepartureCalendar } from "@/components/DepartureCalendar";

const showFeaturedExpeditions = false;

function departure(expedition: Expedition) {
  return departureLabel(upcomingDepartures(expedition)[0]);
}

export function PhotoExpeditionFilm({ expeditions }: { expeditions: Expedition[] }) {
  const featured = expeditions.filter(isFeaturedExpedition).slice(0, 4);
  const upcoming = expeditions.flatMap(expedition => upcomingDepartures(expedition).map(date => ({...date, expedition}))).sort((a,b)=>a.date.localeCompare(b.date));


  if (!expeditions.length) return null;

  return (
    <main className="journey-atlas expedition-atlas" aria-label="Photography Tours">
      <PageHero
        title="Field craft, framed."
        copy="Small groups, specialist mentorship and patient time in the field."
        image={expeditions[0].image}
        meta="Photography Tours"
        variant="destination"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Photography Tours" }]}
      />

      {showFeaturedExpeditions && <section className="journey-atlas-collection" aria-labelledby="expedition-collection-title">
        <header className="expedition-stack-intro"><p className="eyebrow">Featured expeditions</p><h2 id="expedition-collection-title">A closer look at the wild.</h2></header>
        <div className="expedition-stack">
          {featured.map((expedition) => (
            <article className="expedition-stack-card" key={expedition.slug}>
              <h3>{expedition.title}</h3>
              <div className="expedition-stack-body">
                <Link className="expedition-stack-image" href={`/photo-expeditions/${expedition.slug}`} aria-label={`View ${expedition.title}`}><Image src={expedition.image.src} alt={expedition.image.alt} fill sizes="(max-width: 760px) 100vw, 55vw" /></Link>
                <div className="expedition-stack-copy">
                  <p className="eyebrow">{expedition.route || expedition.category}</p>
                  <p>{expedition.description}</p>
                  <dl><div><dt>Duration</dt><dd>{expedition.duration || `${expedition.days.length} days`}</dd></div><div><dt>Departure</dt><dd>{departure(expedition)}</dd></div></dl>
                  <Link href={`/photo-expeditions/${expedition.slug}`}>View expedition <ArrowRight size={18}/></Link>
                </div>
              </div>
            </article>
          ))}
        </div>

      </section>}
      <DepartureCalendar upcoming={upcoming} />
    </main>
  );
}
