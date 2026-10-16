"use client";

import { useState } from "react";
import { departureLabel } from "@/lib/departures";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Expedition, ExpeditionDeparture } from "@/lib/data";

const filters = ["All", "India", "International"] as const;
type Filter = typeof filters[number];
type Departure = ExpeditionDeparture & { expedition: Expedition };

export function DepartureCalendar({ upcoming }: { upcoming: Departure[] }) {
  const [filter, setFilter] = useState<Filter>("All");
  const visible = upcoming.filter(item => filter === "All" || item.expedition.geography === filter);


  return (
      <section className="fixed-departure-calendar" aria-labelledby="fixed-calendar-title">
        <div className="container">
          <header className="departure-calendar-heading"><div><p className="eyebrow">Plan your time in the wild</p><h2 id="fixed-calendar-title">Upcoming fixed <em className="editorial-accent editorial-accent-light">departures</em></h2></div><p>Find your dates. Explore the expedition.</p></header>
          <div className="departure-calendar-filters" role="group" aria-label="Filter departures by geography">
            {filters.map(option => <button key={option} type="button" aria-pressed={filter === option} aria-controls="departure-calendar-results" onClick={() => setFilter(option)}>{option}</button>)}
          </div>
          <p className="departure-calendar-count" role="status">{visible.length} {visible.length === 1 ? "departure" : "departures"}{filter !== "All" ? ` · ${filter}` : ""}</p>
          <div id="departure-calendar-results" className="departure-calendar-list">{visible.map(item=><Link className="departure-calendar-row" key={item.expedition.slug+item.date} href={`/photo-expeditions/${item.expedition.slug}`}>
            <div className="departure-calendar-image"><Image src={item.expedition.image.src} alt={item.expedition.image.alt} fill sizes="(max-width:760px) 76px, 112px"/></div>
            <div className="departure-calendar-place"><h3>{item.expedition.title.replace(/ Wildlife Photography Expedition$| Photography Expedition$| Expedition$/, "")}</h3><p>{item.expedition.duration} · {item.expedition.publicationStatus === "preview" ? "Programme being finalised" : "Photography Tours"}</p></div>
            <div className="departure-calendar-date"><span>Departure</span><time dateTime={item.date}>{departureLabel(item)}</time></div>
            <span className={"departure-calendar-status status-"+item.status.toLowerCase().replace(/ /g,"-")}>{item.availability && item.status === "Available" ? item.availability : item.status}</span>
            <span className="departure-calendar-arrow" aria-hidden="true"><ArrowRight size={20}/></span>
          </Link>)}</div>
          {!visible.length && <p>No upcoming departures{filter !== "All" ? ` for ${filter}` : ""}. Contact us to register your interest.</p>}
        </div>
      </section>
  );
}
