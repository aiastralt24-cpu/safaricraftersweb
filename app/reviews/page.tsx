import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { JsonLd } from "@/components/JsonLd";
import { heroImage, testimonials } from "@/lib/data";
import { breadcrumbSchema } from "@/lib/structured-data";
import "./reviews.css";

export const metadata: Metadata = {
  title: "Guest Notes",
  description: "Published guest notes from private Safari Crafters journeys, guided safaris and photography-led wildlife travel.",
  alternates: { canonical: "/reviews" }
};

const photographerNote = testimonials.find((item) => item.guestType === "Wildlife photographer");

const guestStories = [
  {
    name: "Pallavi Khemka",
    category: "Private journey",
    trip: "Ranthambhore",
    quote: "Thank you Gaurav and team for an amazing trip to the Ranthambore. Gaurav made our trip so very convenient. Extremely friendly and responsive and at the same time professional at work.",
    image: "/assets/destinations/ranthambhore/ranthambhore-02.jpg",
    alt: "Bengal tiger in Ranthambhore",
    href: "/destinations/ranthambhore"
  },
  {
    name: "Hemil & Riddhi Shah",
    category: "Private journey",
    trip: "India",
    quote: "We started our journey with no expectations and every single recommendation from your end was worth it.",
    image: "/assets/destinations/jawai/jawai-03.jpg",
    alt: "Leopard country in Jawai",
    href: "/journeys"
  },
  {
    name: "Masumi Jhurmarvala",
    category: "Private journey",
    trip: "Kabini",
    quote: "Sachin at safari crafters helped us a lot be it encouraging us to go to Kabini, booking the safaris, constant support, and ensuring all is done in a timely manner in spite of his remote access.",
    image: "/assets/destinations/kabini/kabini-02.jpg",
    alt: "Elephant in the forests of Kabini",
    href: "/destinations/kabini"
  },
  {
    name: "Chintan Amin",
    category: "Guided wildlife safari",
    trip: "Tiger country",
    quote: "Really professional and very experienced Guide and driver. The only reason we could experience tiger so up close was only because of the dedication and skills of the team.",
    image: "/assets/destinations/kanha/kanha-03.jpg",
    alt: "Tiger habitat in Kanha",
    href: "/guided-bespoke-safaris"
  },
  {
    name: photographerNote?.name || "Guest name withheld",
    category: "Photography-led journey",
    trip: photographerNote?.trip || "Snow leopard country",
    quote: photographerNote?.quote || "The preparation was as valuable as the sighting. The team made the mountains feel possible.",
    image: "/assets/destinations/spiti-valley/spiti-valley-01.jpg",
    alt: "Snow leopard country in the high Himalaya",
    href: "/photo-expeditions",
    anonymous: true
  },
  {
    name: "Nirvaan Harichandrai",
    category: "Wilderness journey",
    trip: "India",
    quote: "I had one of the most magical experiences of my life. Safari Crafters made it happen.",
    image: "/assets/destinations/pantanal/supplied/01.webp",
    alt: "Jaguar beside a riverbank in the Pantanal",
    href: "/journeys"
  }
];

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
            <h2>Specific memories.<br />Real names.</h2>
          </div>
          <div className="reviews-opening-copy">
            <p>These notes were published by Safari Crafters guests after private journeys and guided wildlife travel. Names appear where guests were publicly identified.</p>
            <p>One photography-led note remains anonymous because its original record did not include permission to publish a personal name.</p>
          </div>
        </div>
      </section>

      <section className="reviews-ledger" aria-labelledby="reviews-ledger-title">
        <div className="container reviews-ledger-layout">
          <aside className="reviews-ledger-aside">
            <p className="eyebrow">In their words</p>
            <h2 id="reviews-ledger-title">The part no itinerary can write.</h2>
            <p>Each entry pairs a guest’s own words with the landscape they travelled through.</p>
            <div className="reviews-ledger-key" aria-label="Guest note categories">
              <span>Private journeys</span>
              <span>Guided safaris</span>
              <span>Photography-led travel</span>
            </div>
          </aside>

          <div className="reviews-story-list">
            {guestStories.map((story, index) => (
              <article className="reviews-story" key={`${story.name}-${story.trip}`}>
                <figure>
                  <Image src={story.image} alt={story.alt} fill sizes="(max-width: 900px) 100vw, 34vw" />
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </figure>
                <div className="reviews-story-copy">
                  <p className="reviews-story-category">{story.category}</p>
                  <blockquote>“{story.quote}”</blockquote>
                  <footer>
                    <div>
                      <strong>{story.name}</strong>
                      <span>{story.trip}{story.anonymous ? " · Name withheld" : ""}</span>
                    </div>
                    <Link href={story.href} aria-label={`Explore ${story.trip}`}>Explore <ArrowUpRight size={16} /></Link>
                  </footer>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="container reviews-paths" aria-labelledby="reviews-paths-title">
        <header>
          <p className="eyebrow">Choose your rhythm</p>
          <h2 id="reviews-paths-title">Two ways into the wild.</h2>
          <p className="reviews-paths-intro">Choose a private journey shaped entirely around you, or join a fixed-date photographic expedition built around light, behaviour and time in the field.</p>
        </header>
        <div className="reviews-path-grid">
          <Link href="/journeys" className="reviews-path-card reviews-path-private">
            <span>01 · Private journeys</span>
            <h3>Built around your people, pace and priorities.</h3>
            <p>Private departures shaped from the ground up, with room to change tempo when the field asks for it.</p>
            <strong>Explore private journeys <ArrowUpRight size={18} /></strong>
          </Link>
          <Link href="/photo-expeditions" className="reviews-path-card reviews-path-photo">
            <span>02 · Photo expeditions</span>
            <h3>More time looking. Less time rushing.</h3>
            <p>Small-group, fixed-date departures led around light, behaviour and patient photographic opportunity.</p>
            <strong>Explore photo expeditions <ArrowUpRight size={18} /></strong>
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
