import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { CountryAtlas, Destination } from "@/lib/data";
import { specialists, testimonials } from "@/lib/data";
import { PageHero } from "@/components/PageHero";
import "./IndiaCountryPage.css";

const approachDefinitions = [
  {
    label: "01 / Forests",
    title: "Tigers and central India",
    copy: "A patient route through sal and teak forests, composed around repeated drives, exceptional naturalists and enough time for the landscape to reveal itself.",
    imageSlug: "kanha",
    places: ["kanha", "bandhavgarh", "panna"]
  },
  {
    label: "02 / Rajasthan",
    title: "Leopards, tigers and desert",
    copy: "Wildlife and Rajasthan held in one considered arc, moving from Ranthambhore's tiger country to Jawai's granite hills without rushing the space between.",
    imageSlug: "jawai",
    places: ["ranthambhore", "jawai"]
  },
  {
    label: "03 / High country",
    title: "The Himalayan frontier",
    copy: "An expeditionary journey shaped by acclimatisation, weather and patient tracking in remote snow-leopard habitat.",
    imageSlug: "spiti-valley",
    places: ["spiti-valley", "ladakh", "singalila"]
  }
] as const;

const featuredSlugs = ["ranthambhore", "jawai", "spiti-valley", "kanha", "kaziranga", "gir"];

function findDestination(country: CountryAtlas, slug: string) {
  return country.destinations.find((destination) => destination.slug === slug);
}

function editorialImage(destination: Destination) {
  return destination.gallery[0] || destination.image;
}

export function IndiaCountryPage({ country }: { country: CountryAtlas }) {
  const featured = featuredSlugs
    .map((slug) => findDestination(country, slug))
    .filter((destination): destination is Destination => Boolean(destination));
  const remaining = country.destinations.filter((destination) => !featuredSlugs.includes(destination.slug));
  const specialist = specialists[0];
  const guestNote = testimonials[0];

  return (
    <>
      <PageHero
        title="India, privately composed."
        copy="Field-led journeys through tiger forests, leopard country and the high Himalaya."
        image={country.image}
        meta="India / Private safari atlas"
      />

      <main className="india-country-page">
        <section className="container india-country-opening">
          <div>
            <p className="eyebrow">The India edit</p>
            <h2>We know India deeply enough to choose the right few.</h2>
          </div>
          <div>
            <p>
              India rewards judgement more than speed. The right journey balances season, permits,
              forest rhythm and the naturalists who will share each day in the field.
            </p>
            <p>
              We begin with what draws you here, then shape a private route with room for wildlife,
              rest and the unexpected.
            </p>
          </div>
        </section>

        <section className="container india-approaches" aria-labelledby="india-approaches-title">
          <header>
            <p className="eyebrow">Three ways into India</p>
            <h2 id="india-approaches-title">Begin with the character of the journey.</h2>
          </header>
          <div className="india-approach-grid">
            {approachDefinitions.map((approach) => {
              const imageDestination = findDestination(country, approach.imageSlug);
              if (!imageDestination) return null;
              const image = editorialImage(imageDestination);
              return (
                <article key={approach.title}>
                  <Link className="india-approach-image" href={`/destinations/${imageDestination.slug}`}>
                    <Image src={image.src} alt={image.alt} fill sizes="(max-width: 760px) 100vw, 33vw" />
                  </Link>
                  <p>{approach.label}</p>
                  <h3>{approach.title}</h3>
                  <span>{approach.copy}</span>
                  <div>
                    {approach.places.map((slug) => {
                      const place = findDestination(country, slug);
                      return place ? <Link href={`/destinations/${place.slug}`} key={slug}>{place.title}</Link> : null;
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="india-guidance" aria-label="India private journey guidance">
          <div className="container">
            <p className="eyebrow">A considered route</p>
            <h2>Comfort is not only where you stay. It is how the journey moves.</h2>
            <dl>
              <div><dt>Season</dt><dd>October to March for cooler travel; warmer spring conditions can suit focused wildlife journeys.</dd></div>
              <div><dt>Time</dt><dd>Allow ten to fourteen nights for a meaningful multi-region journey without compressing the field rhythm.</dd></div>
              <div><dt>Access</dt><dd>Gateways, private road transfers and aviation are sequenced around the chosen reserves, not added afterward.</dd></div>
              <div><dt>Stay</dt><dd>Lodge character is matched to privacy, naturalist quality, location and the pace you prefer.</dd></div>
            </dl>
            <Link href="/private-aviation">Explore private aviation <ArrowUpRight size={16} strokeWidth={1.4} /></Link>
          </div>
        </section>

        <section className="container india-featured" aria-labelledby="india-featured-title">
          <header>
            <p className="eyebrow">Six places we return to</p>
            <h2 id="india-featured-title">Distinct landscapes, selected with purpose.</h2>
          </header>
          <div className="india-featured-grid">
            {featured.map((destination) => {
              const image = editorialImage(destination);
              return (
                <article key={destination.slug}>
                  <Link className="india-featured-image" href={`/destinations/${destination.slug}`}>
                    <Image src={image.src} alt={image.alt} fill sizes="(max-width: 760px) 100vw, 50vw" />
                  </Link>
                  <p>{destination.parentRegion || destination.region}</p>
                  <h3><Link href={`/destinations/${destination.slug}`}>{destination.title}</Link></h3>
                  <span>{destination.bestFor.slice(0, 2).join(" / ")}</span>
                </article>
              );
            })}
          </div>
        </section>

        <section className="container india-complete-atlas">
          <div>
            <p className="eyebrow">The complete India atlas</p>
            <h2>For travellers drawn beyond the first edit.</h2>
          </div>
          <div>
            {remaining.map((destination) => (
              <Link href={`/destinations/${destination.slug}`} key={destination.slug}>
                <span>{destination.title}</span>
                <ArrowUpRight size={17} strokeWidth={1.4} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>

        <section className="india-guest-proof">
          <div className="container">
            <p className="eyebrow">A guest note</p>
            <blockquote>“{guestNote.quote}”</blockquote>
            <footer>
              <span>{guestNote.guestType || guestNote.name}</span>
              <span>{guestNote.trip}</span>
              <span>{guestNote.city}</span>
            </footer>
          </div>
        </section>

        <section className="india-specialist">
          <div className="india-specialist-image">
            <Image src="/assets/founders/kairav-engineer.jpg" alt={`${specialist.name}, ${specialist.role} at Safari Crafters`} fill sizes="(max-width: 760px) 100vw, 44vw" />
          </div>
          <div className="india-specialist-copy">
            <p className="eyebrow">Your India specialist</p>
            <h2>Shape India with {specialist.name}.</h2>
            <p>{specialist.expertise}</p>
            <span>{specialist.moment}</span>
            <Link className="button button-solid" href={`/plan?region=India&specialist=${encodeURIComponent(specialist.name)}`}>
              Begin with {specialist.name.split(" ")[0]}
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
