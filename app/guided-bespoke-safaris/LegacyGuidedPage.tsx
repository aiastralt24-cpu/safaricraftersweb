import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { GuidedSafariFaq } from "./GuidedSafariFaq";
import { GuidedSafariMotion } from "./GuidedSafariMotion";
import "./guided-bespoke-safaris.css";

const showSpecialistsCta = false;

export const metadata: Metadata = {
  title: "Bespoke Safaris",
  description: "Add an experienced Safari Crafters guide to a private journey for deeper field knowledge, thoughtful pacing and photographic guidance.",
  alternates: { canonical: "/guided-bespoke-safaris" },
  openGraph: {
    title: "Bespoke Safaris | Safari Crafters",
    description: "Private Journeys shaped by field knowledge, thoughtful pacing and a dedicated Safari Crafters guide.",
    images: [{
      url: "/assets/safari-crafters/laipikia-001e24e7.jpg",
      width: 2400,
      height: 1150,
      alt: "Black leopard moving through the grass in Laikipia"
    }]
  }
};

const fieldMoments = [
  {
    label: "Read the field",
    title: "Read the signs.",
    copy: "Alarm calls, herd movement, fresh tracks and a sudden silence all belong to the story. Your guide helps make those signals visible.",
    image: "/assets/destinations/kanha/kanha-05.jpg",
    alt: "Barasingha resting in the warm morning light at Kanha"
  },
  {
    label: "Work with the light",
    title: "Find the light.",
    copy: "For photographers, field knowledge becomes practical guidance on light, distance, background and animal movement without forcing the encounter.",
    image: "/assets/safari-crafters/jawai-74614ca9.jpg",
    alt: "Leopard standing against the granite hills of Jawai"
  },
  {
    label: "Understand the encounter",
    title: "Understand the moment.",
    copy: "Context turns a sighting into an experience: why an animal pauses, how a family moves and what the landscape is quietly revealing.",
    image: "/assets/safari-crafters/kenya-f64a9aa8.jpg",
    alt: "Cheetah family resting together in grassland"
  }
];

export default function GuidedBespokeSafarisPage() {
  return (
    <div className="guided-page">
      <GuidedSafariMotion />

      <PageHero
        title="The field, read with you."
        accent="read with you."
        titleSize="compact"
        variant="destination"
        meta="Bespoke Safaris"
        copy="A dedicated Safari Crafters guide brings deeper insight, thoughtful pacing and field knowledge to your private journey."
        image={{
          src: "/assets/safari-crafters/laipikia-001e24e7.jpg",
          alt: "Black leopard walking through the Laikipia landscape",
          credit: "Laikipia, Kenya · Safari Crafters archive"
        }}
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Bespoke Safaris" }]}
      />

      <section className="guided-introduction" id="guided-introduction" data-guided-reveal>
        <div className="guided-introduction-inner">
          <p className="eyebrow">A guide beside you</p>
          <h2>Know where<br />to <em className="editorial-accent">look.</em></h2>
          <div className="guided-introduction-copy">
            <p>
              An experienced guide knows when to wait, when to move and which small
              details may lead to an encounter.
            </p>
            <p>
              Working alongside local naturalists, your Safari Crafters guide shapes each
              day around your interests and helps you understand what you see,
              whether or not you carry a camera.
            </p>
          </div>
        </div>
      </section>

      <section className="guided-expand-shell" aria-label="A patient field encounter">
        <figure className="guided-expand-media" data-guided-expand>
          <Image
            src="/assets/destinations/ranthambhore/ranthambhore-03.jpg"
            alt="Tiger crossing the shore of a lake in the first light at Ranthambhore"
            fill
            sizes="100vw"
          />
        </figure>
      </section>

      <section className="guided-field" aria-labelledby="guided-field-title">
        <header className="guided-field-heading" data-guided-reveal>
          <p className="eyebrow">Field intelligence</p>
          <h2 id="guided-field-title">What <em className="editorial-accent">experience</em> changes.</h2>
          <p>A closer understanding of the landscape, the light and the wildlife around you.</p>
        </header>
        <div className="guided-field-grid">
          {fieldMoments.map((moment) => (
            <article key={moment.label} data-guided-reveal>
              <div className="guided-field-image">
                <Image src={moment.image} alt={moment.alt} fill sizes="(max-width: 720px) 100vw, 33vw" />
              </div>
              <p className="eyebrow">{moment.label}</p>
              <h3>{moment.title}</h3>
              <p>{moment.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="guided-photography" aria-labelledby="guided-photography-title">
        <div className="guided-photography-image" data-guided-reveal>
          <Image
            src="/assets/safari-crafters/indias-wild-heart-e0baa327.jpg"
            alt="Blackbuck standing in warm light across an open grassland"
            fill
            sizes="(max-width: 860px) 100vw, 52vw"
          />
        </div>
        <div className="guided-photography-copy" data-guided-reveal>
          <p className="eyebrow">For the photograph</p>
          <h2 id="guided-photography-title">The sighting is only the <em className="editorial-accent editorial-accent-light">beginning.</em></h2>
          <p>
            Good wildlife photography depends on more than proximity. Your guide considers
            light, positioning, animal movement and the patience an image may require. The aim
            is never to press the encounter, but to place you where observation can become a
            photograph.
          </p>
          <blockquote>“The camera follows the field, never the other way around.”</blockquote>
        </div>
      </section>

      <section className="guided-person" aria-labelledby="guided-person-title">
        <div className="guided-person-copy" data-guided-reveal>
          <p className="eyebrow">Your field companion</p>
          <h2 id="guided-person-title">From the first drive<br />to the <em className="editorial-accent">last.</em></h2>
          <p>
            Your dedicated guide stays with the journey. They understand your pace, remember
            what you have already seen and help every new encounter build on the one before it.
            Local knowledge remains essential; the Safari Crafters guide adds continuity,
            interpretation and a shared purpose across the trip.
          </p>
          {showSpecialistsCta ? (
            <Link href="/specialists">Meet our specialists <ArrowUpRight aria-hidden="true" size={17} /></Link>
          ) : null}
        </div>
        <figure className="guided-person-image" data-guided-reveal>
          <Image
            src="/assets/founders/gaurav-ramnarayanan.jpg"
            alt="Gaurav Ramnarayanan carrying a wildlife photography lens in the field"
            fill
            sizes="(max-width: 720px) 100vw, 42vw"
          />
          <figcaption>Gaurav Ramnarayanan · Chief Operating Officer</figcaption>
        </figure>
      </section>

      <section className="guided-paths" aria-labelledby="guided-paths-title">
        <header data-guided-reveal>
          <p className="eyebrow">Two ways to begin</p>
          <h2 id="guided-paths-title">Your safari, <em className="editorial-accent">with a guide.</em></h2>
          <p>Start with an itinerary you love or a place you want to explore.</p>
        </header>
        <div className="guided-paths-grid">
          <Link href="/journeys" data-guided-reveal>
            <div className="guided-path-image">
              <Image
                src="/assets/safari-crafters/golden-triangle-ae04a20e.jpg"
                alt="Humayun's Tomb within a private India journey"
                fill
                sizes="(max-width: 720px) 100vw, 50vw"
              />
            </div>
            <span className="eyebrow">Begin with an itinerary</span>
            <h3>Choose a journey.</h3>
            <p>Choose a Safari Crafters journey and we will consider the right field guide for its places, pace and purpose.</p>
            <strong>Explore journeys <ArrowUpRight aria-hidden="true" size={17} /></strong>
          </Link>
          <Link href="/destinations" data-guided-reveal>
            <div className="guided-path-image">
              <Image
                src="/assets/safari-crafters/laipikia-001e24e7.jpg"
                alt="Black leopard in Laikipia"
                fill
                sizes="(max-width: 720px) 100vw, 50vw"
              />
            </div>
            <span className="eyebrow">Begin with a place</span>
            <h3>Choose a destination.</h3>
            <p>Start with the landscape or species that draws you, then let us shape a private guided safari around it.</p>
            <strong>Explore destinations <ArrowUpRight aria-hidden="true" size={17} /></strong>
          </Link>
        </div>
      </section>

      <section className="guided-faq" aria-labelledby="guided-faq-title">
        <header data-guided-reveal>
          <p className="eyebrow">Before you travel</p>
          <h2 id="guided-faq-title">A few useful <em className="editorial-accent">answers.</em></h2>
        </header>
        <GuidedSafariFaq />
      </section>

    </div>
  );
}
