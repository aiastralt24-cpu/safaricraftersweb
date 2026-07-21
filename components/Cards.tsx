import Image from "next/image";
import Link from "next/link";
import { CountryAtlas, Destination, Expedition, ImageAsset, JournalArticle, Journey } from "@/lib/data";
import "./Cards.css";

export function EditorialCard({
  href,
  image,
  meta,
  title,
  copy,
  cta = "Read more"
}: {
  href: string;
  image: ImageAsset;
  meta: string;
  title: string;
  copy: string;
  cta?: string;
}) {
  return (
    <article className="editorial-card">
      <Link href={href} className="image-frame editorial-card-image">
        <Image src={image.src} alt={image.alt} fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw" />
      </Link>
      <p className="eyebrow">{meta}</p>
      <h2 className="h3">
        <Link href={href}>{title}</Link>
      </h2>
      <p>{copy}</p>
      <Link className="brass-link" href={href}>
        {cta}
      </Link>
    </article>
  );
}

export function JourneyCard({ journey }: { journey: Journey }) {
  return (
    <EditorialCard
      href={`/journeys/${journey.slug}`}
      image={journey.image}
      meta={`${journey.category} · ${journey.duration} · ${journey.bestMonths}`}
      title={journey.title}
      copy={journey.description}
      cta="Refine this journey"
    />
  );
}

export function DestinationCard({ destination }: { destination: Destination }) {
  return (
    <article className="editorial-card destination-card">
      <Link href={`/destinations/${destination.slug}`} className="image-frame editorial-card-image">
        <Image src={destination.image.src} alt={destination.image.alt} fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw" />
      </Link>
      <p className="eyebrow">{destination.country} · {destination.status === "rich" ? "Guide" : "Concierge brief"}</p>
      <h2 className="h3">
        <Link href={`/destinations/${destination.slug}`}>{destination.title}</Link>
      </h2>
      <p>{destination.description}</p>
      {destination.bestFor?.length ? (
        <div className="destination-card-tags" aria-label={`Best for ${destination.title}`}>
          {destination.bestFor.slice(0, 3).map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      ) : null}
      <Link className="brass-link" href={`/destinations/${destination.slug}`}>
        {destination.status === "rich" ? "Explore destination" : "Begin a private brief"}
      </Link>
    </article>
  );
}

export function CountryCard({ country }: { country: CountryAtlas }) {
  const richCount = country.destinations.filter((destination) => destination.status === "rich").length;

  return (
    <article className="editorial-card destination-card">
      <Link href={`/destinations/${country.slug}`} className="image-frame editorial-card-image">
        <Image src={country.image.src} alt={country.image.alt} fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw" />
      </Link>
      <p className="eyebrow">
        {country.continent === "Arctic" ? "Arctic / Other" : country.continent} · {country.destinations.length} places
      </p>
      <h2 className="h3">
        <Link href={`/destinations/${country.slug}`}>{country.title}</Link>
      </h2>
      <p>{country.description}</p>
      <div className="destination-card-tags" aria-label={`${country.title} atlas summary`}>
        <span>{richCount} guides</span>
        <span>{country.destinations.length - richCount} briefs</span>
      </div>
      <Link className="brass-link" href={`/destinations/${country.slug}`}>
        Enter country atlas
      </Link>
    </article>
  );
}

export function ExpeditionCard({ expedition }: { expedition: Expedition }) {
  return (
    <EditorialCard
      href={`/photo-expeditions/${expedition.slug}`}
      image={expedition.image}
      meta={`${expedition.skill} · ${expedition.groupSize}`}
      title={expedition.title}
      copy={expedition.description}
      cta="Join a photo expedition"
    />
  );
}

export function JournalCard({ article }: { article: JournalArticle }) {
  return (
    <EditorialCard
      href={`/journal/${article.slug}`}
      image={article.image}
      meta={`${article.category} · ${article.readTime}`}
      title={article.title}
      copy={article.description}
      cta="Read this story"
    />
  );
}
