import { departureLabel, upcomingDepartures, isFeaturedExpedition } from "@/lib/departures";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Expedition } from "@/lib/data";
import { PageHero } from "@/components/PageHero";

function departure(expedition: Expedition) {
  return departureLabel(upcomingDepartures(expedition)[0]);
}

export function PhotoExpeditionFilm({ expeditions }: { expeditions: Expedition[] }) {
  const featured = expeditions.filter(isFeaturedExpedition).slice(0, 4);
  const upcoming = expeditions.flatMap(expedition => upcomingDepartures(expedition).map(date => ({...date, expedition}))).sort((a,b)=>a.date.localeCompare(b.date));
  const dateFormatter = new Intl.DateTimeFormat("en-GB", {day:"numeric",month:"short",year:"numeric",timeZone:"UTC"});
  const dateRange = (start:string,end?:string) => end ? dateFormatter.formatRange(new Date(start),new Date(end)) : dateFormatter.format(new Date(start));

  if (!expeditions.length) return null;

  return (
    <main className="journey-atlas expedition-atlas" aria-label="Photographic expeditions">
      <PageHero
        title="Field craft, framed."
        copy="Small groups, specialist mentorship and patient time in the field."
        image={expeditions[0].image}
        meta="Photographic expeditions"
      />

      <section className="journey-atlas-collection" aria-labelledby="expedition-collection-title">
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

      </section>
      <section className="fixed-departure-calendar" aria-labelledby="fixed-calendar-title">
        <div className="container">
          <header className="departure-calendar-heading"><div><p className="eyebrow">Plan your time in the wild</p><h2 id="fixed-calendar-title">Upcoming fixed departures</h2></div><p>Find your dates. Explore the expedition.</p></header>
          <div className="departure-calendar-list">{upcoming.map(item=><Link className="departure-calendar-row" key={item.expedition.slug+item.date} href={`/photo-expeditions/${item.expedition.slug}`}>
            <div className="departure-calendar-image"><Image src={item.expedition.image.src} alt={item.expedition.image.alt} fill sizes="(max-width:760px) 76px, 112px"/></div>
            <div className="departure-calendar-place"><h3>{item.expedition.title.replace(/ Wildlife Photography Expedition$| Photography Expedition$| Expedition$/, "")}</h3><p>{item.expedition.duration} · {item.expedition.publicationStatus === "preview" ? "Programme being finalised" : "Photography expedition"}</p></div>
            <div className="departure-calendar-date"><span>Departure</span><time dateTime={item.date}>{dateRange(item.date,item.endDate)}</time></div>
            <span className={"departure-calendar-status status-"+item.status.toLowerCase().replace(/ /g,"-")}>{item.availability && item.status === "Available" ? item.availability : item.status}</span>
            <span className="departure-calendar-arrow" aria-hidden="true"><ArrowRight size={20}/></span>
          </Link>)}</div>
          {!upcoming.length && <p>New dates are being planned. Contact us to register your interest.</p>}
        </div>
      </section>
    </main>
  );
}
