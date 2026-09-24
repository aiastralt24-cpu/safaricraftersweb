import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Expedition, Journey } from "@/lib/data";
import "./AtlasDepartures.css";

export function AtlasDepartures({ id, expeditions, journeys = [] }: { id: string; expeditions: Expedition[]; journeys?: Journey[] }) {
  if (!expeditions.length && !journeys.length) return null;
  const rows = [
    ...expeditions.map(item => ({ slug: item.slug, title: item.title, label: "Guided photo expedition", timingLabel: item.date ? "Departure" : "Best time", timing: item.date || item.bestMonths, duration: item.duration, href: `/photo-expeditions/${item.slug}`, cta: "View expedition" })),
    ...journeys.map(item => ({ slug: item.slug, title: item.title, label: "Private journey", timingLabel: "Best time", timing: item.bestMonths, duration: item.duration, href: `/journeys/${item.slug}`, cta: "View journey" }))
  ];
  return <section className="atlas-departures" aria-labelledby={`${id}-departures-title`}>
    <div className="container">
      <header className="atlas-departures-heading">
        <p className="eyebrow">{journeys.length ? "Journeys & expeditions" : "Photo expeditions"}</p>
        <h2 id={`${id}-departures-title`}>{journeys.length ? "Find your next journey." : "Join a planned departure."}</h2>
        <p>{journeys.length ? "Explore a private itinerary or join a guided photo expedition, with the timing and details in one place." : "A date in the diary, an expert-led journey, and time dedicated to photography."}</p>
      </header>
      {rows.map(row => <article className="atlas-departure" key={row.href}>
        <div className="atlas-departure-name"><span>{row.label}</span><h3>{row.title}</h3></div>
        <dl><div><dt>{row.timingLabel}</dt><dd>{row.timing}</dd></div>{row.duration && <div><dt>Duration</dt><dd>{row.duration}</dd></div>}</dl>
        <Link className="atlas-departure-cta" href={row.href}>{row.cta} <ArrowUpRight size={18} aria-hidden="true" /></Link>
      </article>)}
    </div>
  </section>;
}
