import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PrivateAviationMotion } from "./PrivateAviationMotion";
import "./private-aviation.css";

const aircraft = [
  {
    name: "Gulfstream G150",
    type: "Super-midsize jet",
    image: "/assets/kairamya/aviation-concierge.jpg",
    alt: "Kairamya Air Gulfstream G150",
    summary: "A spacious cabin and extended range for longer private routes and multi-city journeys.",
    details: ["Up to 3,000 nautical miles", "Approximately 6 hours nonstop", "8 passengers"]
  },
  {
    name: "Cessna Citation CJ2",
    type: "Light jet",
    image: "/assets/kairamya/cessna-citation-cj2.png",
    alt: "Kairamya Air Cessna Citation CJ2",
    summary: "An efficient light jet suited to shorter sectors, regional connectivity and point-to-point travel.",
    details: ["Up to 1,500 nautical miles", "Approximately 3 hours nonstop", "6 passengers"]
  }
];

export const metadata: Metadata = {
  title: "Private Aviation",
  description:
    "Private aviation for Safari Crafters journeys through Kairamya Air, with aircraft routing coordinated around safari circuits, lodges and ground arrangements."
};

export default function PrivateAviationPage() {
  return (
    <main className="aviation-page">
      <PrivateAviationMotion />
      <section className="aviation-hero">
        <div className="container aviation-hero-copy">
          <div>
            <p className="eyebrow">Safari Crafters × Kairamya Air</p>
            <h1>Private flight.<br /><em>Wild arrival.</em></h1>
          </div>
          <div className="aviation-hero-aside">
            <p>Considered air access for remote landscapes—shaped around the safari, never the other way around.</p>
            <Link href="/plan?experience=private-aviation">
              Plan a private journey <ArrowUpRight size={17} strokeWidth={1.5} />
            </Link>
          </div>
        </div>
        <figure className="aviation-hero-image" data-aviation-image>
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/assets/kairamya/private-aviation-hero.jpg"
            aria-hidden="true"
          >
            <source src="/assets/kairamya/fleet-arrival.mp4" type="video/mp4" />
          </video>
          <figcaption><span>Private aviation</span><span>India · By arrangement</span></figcaption>
        </figure>
      </section>

      <section className="aviation-intro section" data-aviation-reveal>
        <div className="container aviation-intro-grid">
          <div>
            <p className="eyebrow">Distance, made quiet</p>
            <h2>More time in the wild.<br /><em>Less time between it.</em></h2>
          </div>
          <div className="aviation-intro-copy">
            <p>
              India&apos;s wildlife regions can sit far apart. We bring the route, lodges, permits and
              ground teams together, using air access only where it meaningfully improves the journey.
            </p>
            <p>
              The result is a quieter sequence: fewer compromised connections, considered arrivals and
              more of each day spent where you came to be.
            </p>
            <Link className="aviation-link" href="/plan?experience=private-aviation">
              Discuss your journey <ArrowUpRight size={16} strokeWidth={1.5} />
            </Link>
          </div>
        </div>
        <div className="container aviation-route" aria-label="A private aviation safari journey sequence">
          {[
            { title: "Gateway arrival", copy: "Meet your journey team after your international or domestic arrival." },
            { title: "Private departure", copy: "Fly at a time shaped around the safari rather than a fixed airline schedule." },
            { title: "Wilderness landing", copy: "Touch down at the most suitable airfield for the reserve and season." },
            { title: "Into the field", copy: "Continue with your naturalist and private vehicle towards the lodge or first game drive." }
          ].map((step, index) => (
            <div key={step.title}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step.title}</strong><p>{step.copy}</p></div>
          ))}
        </div>
      </section>

      <section className="aviation-fleet section">
        <div className="container">
          <div className="aviation-section-heading" data-aviation-reveal>
            <div>
              <p className="eyebrow">Aircraft selection</p>
              <h2>The safari decides<br />the aircraft.</h2>
            </div>
            <p>
              A short runway near tiger country asks different questions from a longer flight between regions. We consider distance, daylight, seasonal conditions, party size and camera baggage before recommending the aircraft that best protects your time in the field.
            </p>
          </div>

          <div className="aviation-aircraft-grid">
            {aircraft.map((item) => (
              <article className="aviation-aircraft" key={item.name} data-aviation-reveal>
                <div className="aviation-aircraft-image">
                  <Image src={item.image} alt={item.alt} fill sizes="(max-width: 800px) 100vw, 50vw" />
                </div>
                <div className="aviation-aircraft-copy">
                  <p className="eyebrow">{item.type}</p>
                  <h3>{item.name}</h3>
                  <p>{item.summary}</p>
                  <dl>
                    <div><dt>Range</dt><dd>{item.details[0]}</dd></div>
                    <div><dt>Flight time</dt><dd>{item.details[1]}</dd></div>
                    <div><dt>Seating</dt><dd>{item.details[2]}</dd></div>
                  </dl>
                </div>
              </article>
            ))}
          </div>
          <p className="aviation-source-note">Specifications published by Kairamya Air. Aircraft and routing remain subject to availability, permissions and operating conditions.</p>
        </div>
      </section>

      <section className="aviation-journey section" data-aviation-reveal>
        <div className="container aviation-journey-grid">
          <div className="aviation-journey-image">
            <Image
              src="/assets/kairamya/fleet-banner.jpg"
              alt="The considered cabin interior of a private aircraft"
              fill
              sizes="(max-width: 900px) 100vw, 46vw"
            />
          </div>
          <div className="aviation-journey-copy">
            <p className="eyebrow">Beyond the runway</p>
            <h2>One route.<br /><em>No loose ends.</em></h2>
            <ol>
              <li><span>01</span><div><h3>The safari brief</h3><p>Regions, lodges, wildlife priorities, party size and preferred pace are considered first.</p></div></li>
              <li><span>02</span><div><h3>The considered connection</h3><p>Kairamya Air coordinates the appropriate aircraft and routing around the proposed journey.</p></div></li>
              <li><span>03</span><div><h3>The ground sequence</h3><p>Transfers, check-ins and lodge arrivals are planned as part of the same itinerary.</p></div></li>
            </ol>
          </div>
        </div>
      </section>

      <section className="aviation-service section">
        <div className="container">
          <div className="aviation-section-heading" data-aviation-reveal>
            <div>
              <p className="eyebrow">Built around the safari</p>
              <h2>More time where<br />the wild is.</h2>
            </div>
            <p>Private air access earns its place when it protects time in the field—linking distant wildlife regions without sacrificing the game drives, light and seasonal encounters that shape the journey.</p>
          </div>
          <div className="aviation-service-grid">
            <article data-aviation-reveal><span>01</span><h3>Follow the season</h3><p>Routing is built around the right wildlife region at the right time—from tiger forests and leopard country to migration landscapes—not around an airline timetable.</p></article>
            <article data-aviation-reveal><span>02</span><h3>Made for the field</h3><p>Party size, camera equipment, soft-sided luggage and remote-airfield conditions are considered before the aircraft is selected.</p></article>
            <article data-aviation-reveal><span>03</span><h3>Arrive safari-ready</h3><p>Your naturalist, private vehicle and lodge team are coordinated with the landing, helping you move from airfield to wilderness without losing a valuable afternoon in the field.</p></article>
          </div>
        </div>
      </section>

      <section className="aviation-cta">
        <div className="container aviation-cta-inner" data-aviation-reveal>
          <p className="eyebrow">The journey comes first</p>
          <h2>Tell us where you want to spend your time.</h2>
          <p>We will consider whether air access genuinely improves the route and include it only when it earns its place.</p>
          <Link href="/plan?experience=private-aviation">Begin your private journey <ArrowUpRight size={17} strokeWidth={1.5} /></Link>
        </div>
      </section>
    </main>
  );
}
