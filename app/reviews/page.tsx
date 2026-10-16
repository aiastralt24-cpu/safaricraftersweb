import { GuestNotes } from "@/components/GuestNotes";
import { guestStories } from "@/lib/guest-notes";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { JsonLd } from "@/components/JsonLd";
import { heroImage } from "@/lib/data";
import { breadcrumbSchema } from "@/lib/structured-data";
import "./reviews.css";

export const metadata: Metadata = {
  title: "Guest Notes",
  description: "Published guest notes from private Safari Crafters journeys, guided safaris and photography-led wildlife travel.",
  alternates: { canonical: "/reviews" }
};

export default function ReviewsPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Guest Notes", path: "/reviews" }])} />
      <div className="reviews-hero">
        <PageHero
          title="What stayed with them."
          copy="Guest notes about the details that mattered after the journey was over: the pacing, the people and the time allowed in the field."
          image={heroImage}
          meta="Guest Notes"
          variant="destination"
          breadcrumbs={[{ label: "Home", href: "/" }, { label: "Guest Notes" }]}
        />
      </div>

      <section className="reviews-opening">
        <div className="container reviews-opening-grid">
          <div>
            <p className="eyebrow">The guest ledger</p>
            <h2>Specific <em className="editorial-accent">memories.</em><br />Real names.</h2>
          </div>
          <div className="reviews-opening-copy">
            <p>These notes were published by Safari Crafters guests after private journeys and guided wildlife travel. Names appear where guests were publicly identified.</p>
            <p>One photography-led note remains anonymous because its original record did not include permission to publish a personal name.</p>
          </div>
        </div>
      </section>

      <GuestNotes stories={guestStories} />

      <section className="container reviews-paths" aria-labelledby="reviews-paths-title">
        <header>
          <p className="eyebrow">Choose your rhythm</p>
          <h2 id="reviews-paths-title">Two ways into the <em className="editorial-accent">wild.</em></h2>
          <p className="reviews-paths-intro">Choose a private journey shaped entirely around you, or join a fixed-date photography tour built around light, behaviour and time in the field.</p>
        </header>
        <div className="reviews-path-grid">
          <Link href="/journeys" className="reviews-path-card reviews-path-private">
            <span>01 · Private journeys</span>
            <h3>Built around your people, pace and priorities.</h3>
            <p>Private departures shaped from the ground up, with room to change tempo when the field asks for it.</p>
            <strong>Explore private journeys <ArrowUpRight size={18} /></strong>
          </Link>
          <Link href="/photo-expeditions" className="reviews-path-card reviews-path-photo">
            <span>02 · Photography Tours</span>
            <h3>More time looking. Less time rushing.</h3>
            <p>Small-group, fixed-date departures led around light, behaviour and patient photographic opportunity.</p>
            <strong>Explore photography tours <ArrowUpRight size={18} /></strong>
          </Link>
        </div>
      </section>

      <section className="reviews-final">
        <div className="container reviews-final-inner">
          <p className="eyebrow">Your journey, next</p>
          <h2>Give us the detail you care about most.</h2>
          <Link className="button button-solid" href="/plan">Begin a private brief</Link>
        </div>
      </section>
    </>
  );
}
