import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { expeditions } from "@/lib/data";
import "./scheduled-departures.css";

export const metadata: Metadata = {
  title: "Scheduled Safari Departures",
  description: "Fixed-date hosted small-group safaris and specialist photography expeditions from Safari Crafters.",
  alternates: { canonical: "/scheduled-departures" }
};

export default function ScheduledDeparturesPage() {
  const nextDeparture = expeditions[0];

  return (
    <>
      <PageHero
        title="Shared journeys, deliberately small."
        copy="Fixed dates, informed leadership and enough time in the field to let a place reveal itself."
        image={nextDeparture.image}
        meta="Scheduled departures"
      />

      <section className="section scheduled-intro" aria-labelledby="scheduled-intro-title">
        <div className="container scheduled-intro-grid">
          <div>
            <p className="eyebrow">Two ways to travel</p>
            <h2 className="h2" id="scheduled-intro-title">Choose the purpose of the departure.</h2>
          </div>
          <p>
            Hosted small-group safaris prioritise the shared field experience. Photo expeditions add dedicated
            photographic mentorship, explicit equipment guidance and a shooting-led daily rhythm.
          </p>
        </div>
        <div className="container scheduled-types">
          <article>
            <p className="eyebrow">Hosted small-group safaris</p>
            <h3>Field-led, without photography tuition.</h3>
            <p>For travellers who prefer fixed dates, a carefully selected group and a Safari Crafters host.</p>
            <Link href="/plan?travel=hosted-small-group">Register your interest <ArrowRight size={17} /></Link>
          </article>
          <article>
            <p className="eyebrow">Specialist photo expeditions</p>
            <h3>Photography is the purpose.</h3>
            <p>For photographers who want patient field time, specialist mentorship and clearly stated group sizes.</p>
            <Link href="/photo-expeditions">View photo expeditions <ArrowRight size={17} /></Link>
          </article>
        </div>
      </section>

      <section className="section scheduled-calendar" aria-labelledby="scheduled-calendar-title">
        <div className="container scheduled-calendar-heading">
          <div><p className="eyebrow">Published calendar</p><h2 className="h2" id="scheduled-calendar-title">The next photographic departures.</h2></div>
          <p>Dates, duration, group size, leader and suitability remain visible before you open a departure.</p>
        </div>
        <div className="container scheduled-grid">
          {expeditions.map((expedition) => (
            <article key={expedition.slug}>
              <Link className="scheduled-image" href={`/photo-expeditions/${expedition.slug}`}>
                <Image src={expedition.image.src} alt={expedition.image.alt} fill sizes="(max-width: 760px) 100vw, 50vw" />
              </Link>
              <div className="scheduled-copy">
                <p className="eyebrow">Photo expedition</p>
                <h3><Link href={`/photo-expeditions/${expedition.slug}`}>{expedition.title}</Link></h3>
                <dl>
                  <div><dt>Departure</dt><dd>{expedition.date || expedition.bestMonths}</dd></div>
                  <div><dt>Duration</dt><dd>{expedition.duration || `${expedition.days.length} days`}</dd></div>
                  <div><dt>Group</dt><dd>{expedition.groupSize}</dd></div>
                  <div><dt>Leader</dt><dd>{expedition.mentor}</dd></div>
                  <div><dt>Level</dt><dd>{expedition.skill}</dd></div>
                  <div><dt>Price</dt><dd>{expedition.price || "Available on request"}</dd></div>
                  <div><dt>Status</dt><dd>Enquire for availability</dd></div>
                </dl>
                <Link className="scheduled-action" href={`/photo-expeditions/${expedition.slug}`}>Check availability <ArrowRight size={17} /></Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
