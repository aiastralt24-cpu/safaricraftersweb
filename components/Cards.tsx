import Link from "next/link";
import { Destination, Expedition, ImageAsset, JournalArticle, Journey } from "@/lib/data";
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
        <img src={image.src} alt={image.alt} loading="lazy" />
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
      meta={`${journey.category} · ${journey.duration}`}
      title={journey.title}
      copy={journey.description}
      cta="Plan this journey"
    />
  );
}

export function DestinationCard({ destination }: { destination: Destination }) {
  return (
    <EditorialCard
      href={`/destinations/${destination.slug}`}
      image={destination.image}
      meta={destination.region}
      title={destination.title}
      copy={destination.description}
      cta="Explore destination"
    />
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
