import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
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
    <>
      <section className="aviation-hero">
        <div className="container aviation-hero-copy reveal">
          <p className="eyebrow">Private aviation · Safari Crafters × Kairamya Air</p>
          <h1>The wild,<br /> brought closer.</h1>
          <p>
            Considered air access for remote landscapes—shaped around the safari,
            never the other way around.
          </p>
          <Link href="/plan?experience=private-aviation">
            Plan a private journey <ArrowUpRight size={17} strokeWidth={1.5} />
          </Link>
        </div>
        <figure className="aviation-hero-image">
          <Image
            src="/assets/kairamya/private-aviation-hero.jpg"
            alt="Kairamya Air Gulfstream G150 ready for departure"
            fill
            priority
            loading="eager"
            fetchPriority="high"
            sizes="100vw"
          />
          <figcaption>Kairamya Air</figcaption>
        </figure>
      </section>

      <section className="aviation-intro section">
        <div className="container aviation-intro-grid">
          <div>
            <p className="eyebrow">Distance, made quiet</p>
            <h2 className="h2">More time in the wild. Less time between it.</h2>
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
      </section>

      <section className="aviation-fleet section">
        <div className="container">
          <div className="aviation-section-heading">
            <div>
              <p className="eyebrow">Aircraft, considered</p>
              <h2 className="h2">Chosen for the journey.</h2>
            </div>
            <p>
              The route comes first. Aircraft is then considered around distance, party size,
              baggage, airfield suitability and operating conditions.
            </p>
          </div>

          <div className="aviation-aircraft-grid">
            {aircraft.map((item) => (
              <article className="aviation-aircraft" key={item.name}>
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

      <section className="aviation-journey section">
        <div className="container aviation-journey-grid">
          <div className="aviation-journey-image">
            <Image
              src="/assets/safari-crafters/jawai-leopard-portrait.JPG"
              alt="A leopard among the granite rocks of Jawai, Rajasthan"
              fill
              sizes="(max-width: 900px) 100vw, 46vw"
            />
          </div>
          <div className="aviation-journey-copy">
            <p className="eyebrow">One continuous journey</p>
            <h2 className="h2">One route. No loose ends.</h2>
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
          <div className="aviation-section-heading">
            <div>
              <p className="eyebrow">Beyond the flight</p>
              <h2 className="h2">Everything between, considered.</h2>
            </div>
            <p>The value is not the aircraft alone. It is the continuity between remote airfields, ground teams, lodges and the field.</p>
          </div>
          <div className="aviation-service-grid">
            <article><span>01</span><h3>Route design</h3><p>Each connection is weighed against the time it returns to the journey.</p></article>
            <article><span>02</span><h3>For your party</h3><p>Aircraft and cabin are considered around your group, luggage and preferred pace.</p></article>
            <article><span>03</span><h3>Seamless arrival</h3><p>Airfield, vehicle and lodge teams work to one considered sequence.</p></article>
          </div>
        </div>
      </section>

      <section className="aviation-cta">
        <div className="container aviation-cta-inner">
          <p className="eyebrow">The journey comes first</p>
          <h2>Tell us where you want to spend your time.</h2>
          <p>We will consider whether air access genuinely improves the route and include it only when it earns its place.</p>
          <Link href="/plan?experience=private-aviation">Begin your private journey <ArrowUpRight size={17} strokeWidth={1.5} /></Link>
        </div>
      </section>
    </>
  );
}
