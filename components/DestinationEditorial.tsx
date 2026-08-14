import Image from "next/image";
import Link from "next/link";
import type { CountryAtlas, Destination, ImageAsset } from "@/lib/data";
import { isApprovedEditorialImage } from "@/lib/media";
import "./DestinationEditorial.css";

function countryEditorialImage(country: CountryAtlas, index: number): ImageAsset {
  const available = country.destinations.flatMap((destination) => [destination.image, ...destination.gallery]).filter(isApprovedEditorialImage);
  return available[index % Math.max(available.length, 1)] || country.image;
}

export function CountryEditorialCard({
  country,
  index,
  showImage = true,
  summary,
  label
}: {
  country: CountryAtlas;
  index: number;
  showImage?: boolean;
  summary?: string;
  label?: string;
}) {
  const image = countryEditorialImage(country, index);
  const featured = index % 5 === 0;

  return (
    <article className={`${featured ? "atlas-country is-featured" : "atlas-country"}${showImage ? "" : " is-textual"}`}>
      {showImage ? (
        <Link className="atlas-country-image" href={`/destinations/${country.slug}`}>
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes={featured ? "(max-width: 760px) 100vw, 66vw" : "(max-width: 760px) 100vw, 34vw"}
          />
        </Link>
      ) : null}
      <div className="atlas-country-copy">
        <p>{label || (country.continent === "Arctic" ? "Arctic / Other" : country.continent)}</p>
        <h3><Link href={`/destinations/${country.slug}`}>{country.title}</Link></h3>
        <span>{summary || country.description}</span>
        <Link className="atlas-country-link" href={`/destinations/${country.slug}`}>Explore {country.title}</Link>
      </div>
    </article>
  );
}

export function DestinationEditorialCard({ destination, index, showImage = true }: { destination: Destination; index: number; showImage?: boolean }) {
  const approvedImages = [...destination.gallery, destination.image].filter(isApprovedEditorialImage);
  const image = approvedImages[index % Math.max(approvedImages.length, 1)];
  const renderImage = showImage && Boolean(image);

  return (
    <article className={`${index % 4 === 0 ? "destination-editorial-card is-wide" : "destination-editorial-card"}${renderImage ? "" : " is-textual"}`}>
      {renderImage && image ? (
        <Link className="destination-editorial-image" href={`/destinations/${destination.slug}`}>
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes={index % 4 === 0 ? "(max-width: 760px) 100vw, 62vw" : "(max-width: 760px) 100vw, 38vw"}
          />
        </Link>
      ) : null}
      <div>
        <p>{destination.parentRegion || destination.region}</p>
        <h3><Link href={`/destinations/${destination.slug}`}>{destination.title}</Link></h3>
        <span>{destination.description}</span>
        <Link className="atlas-country-link" href={`/destinations/${destination.slug}`}>Discover {destination.title}</Link>
      </div>
    </article>
  );
}
