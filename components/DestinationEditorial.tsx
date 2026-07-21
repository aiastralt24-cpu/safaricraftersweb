import Image from "next/image";
import Link from "next/link";
import type { CountryAtlas, Destination, ImageAsset } from "@/lib/data";
import "./DestinationEditorial.css";

const temporaryCountryImages: Record<string, ImageAsset> = {
  Rwanda: { src: "/assets/safari-crafters/gallery-1-14-fa4d3962.jpg", alt: "Mountain gorilla in forest", credit: "Temporary Safari Crafters archive selection" },
  "Zambia & Zimbabwe": { src: "/assets/safari-crafters/gallery-2-16-scaled-2f00989a.jpg", alt: "Elephants crossing water", credit: "Temporary Safari Crafters archive selection" },
  Zimbabwe: { src: "/assets/safari-crafters/gallery-3-14-cd02a642.jpg", alt: "Lion in open woodland", credit: "Temporary Safari Crafters archive selection" },
  Zambia: { src: "/assets/safari-crafters/gallery-2-23-scaled-7442c2ea.jpg", alt: "Elephant family moving through woodland", credit: "Temporary Safari Crafters archive selection" },
  Botswana: { src: "/assets/safari-crafters/gallery-2-12-scaled-89c39810.jpg", alt: "Wetland landscape at sunset", credit: "Temporary Safari Crafters archive selection" },
  "South Africa": { src: "/assets/safari-crafters/gallery-3-12-2607d57f.jpg", alt: "White rhinoceros in grassland", credit: "Temporary Safari Crafters archive selection" },
  Namibia: { src: "/assets/safari-crafters/gallery-1-21-scaled-c26b1eb5.jpg", alt: "Antelope crossing open dry country", credit: "Temporary Safari Crafters archive selection" },
  Colombia: { src: "/assets/safari-crafters/gallery-5-13-57488933.jpg", alt: "Tropical mountain rainforest", credit: "Temporary Safari Crafters archive selection" },
  Peru: { src: "/assets/safari-crafters/gallery-4-5-b47d9048.jpg", alt: "High mountain landscape at first light", credit: "Temporary Safari Crafters archive selection" },
  "Costa Rica": { src: "/assets/safari-crafters/gallery-6-9-scaled-f56619a9.jpg", alt: "Mist moving through tropical forest", credit: "Temporary Safari Crafters archive selection" },
  Panama: { src: "/assets/safari-crafters/gallery-2-feea87b8.jpg", alt: "Wildlife moving through a tropical river", credit: "Temporary Safari Crafters archive selection" },
  Canada: { src: "/assets/safari-crafters/gallery-1-3-scaled-52ab7008.jpg", alt: "Polar bear and cub on sea ice", credit: "Temporary Safari Crafters archive selection" },
  USA: { src: "/assets/safari-crafters/gallery-1-12-ee6b0e3a.jpg", alt: "Puma in mountain country", credit: "Temporary Safari Crafters archive selection" }
};

const temporaryDestinationPools: Record<Destination["continent"], Array<Omit<ImageAsset, "credit">>> = {
  India: [
    { src: "/assets/safari-crafters/gallery-3-14-cd02a642.jpg", alt: "Lion in open woodland" },
    { src: "/assets/safari-crafters/gallery-3-12-2607d57f.jpg", alt: "Rhinoceros in grassland" },
    { src: "/assets/safari-crafters/gallery-1-21-scaled-c26b1eb5.jpg", alt: "Antelope crossing open country" },
    { src: "/assets/safari-crafters/gallery-4-5-b47d9048.jpg", alt: "Mountain landscape at first light" }
  ],
  Africa: [
    { src: "/assets/safari-crafters/gallery-2-16-scaled-2f00989a.jpg", alt: "Elephants crossing water" },
    { src: "/assets/safari-crafters/gallery-2-23-scaled-7442c2ea.jpg", alt: "Elephant family moving through woodland" },
    { src: "/assets/safari-crafters/gallery-2-12-scaled-89c39810.jpg", alt: "Wetland landscape at sunset" },
    { src: "/assets/safari-crafters/gallery-3-14-cd02a642.jpg", alt: "Lion in open woodland" },
    { src: "/assets/safari-crafters/gallery-3-12-2607d57f.jpg", alt: "White rhinoceros in grassland" },
    { src: "/assets/safari-crafters/gallery-1-14-fa4d3962.jpg", alt: "Mountain gorilla in forest" },
    { src: "/assets/safari-crafters/gallery-1-21-scaled-c26b1eb5.jpg", alt: "Antelope crossing dry country" }
  ],
  Americas: [
    { src: "/assets/safari-crafters/gallery-5-13-57488933.jpg", alt: "Tropical mountain rainforest" },
    { src: "/assets/safari-crafters/gallery-6-9-scaled-f56619a9.jpg", alt: "Mist moving through tropical forest" },
    { src: "/assets/safari-crafters/gallery-2-feea87b8.jpg", alt: "Wildlife moving through a tropical river" },
    { src: "/assets/safari-crafters/gallery-4-5-b47d9048.jpg", alt: "High mountain landscape at first light" },
    { src: "/assets/safari-crafters/gallery-1-12-ee6b0e3a.jpg", alt: "Puma in mountain country" },
    { src: "/assets/safari-crafters/gallery-1-3-scaled-52ab7008.jpg", alt: "Polar bear and cub on sea ice" }
  ],
  Arctic: [
    { src: "/assets/safari-crafters/gallery-1-3-scaled-52ab7008.jpg", alt: "Polar bear and cub on sea ice" }
  ]
};

function temporaryDestinationImage(destination: Destination): ImageAsset {
  const pool = temporaryDestinationPools[destination.continent];
  const position = Array.from(destination.slug).reduce((total, character) => total + character.charCodeAt(0), 0) % pool.length;
  return { ...pool[position], credit: "Temporary Safari Crafters archive selection" };
}

function countryEditorialImage(country: CountryAtlas, index: number): ImageAsset {
  if (temporaryCountryImages[country.title]) return temporaryCountryImages[country.title];
  const available = country.destinations.flatMap((destination) => [destination.image, ...destination.gallery]);
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
  const hasTemporaryImage = Boolean(temporaryCountryImages[country.title]);
  const featured = index % 5 === 0;

  return (
    <article className={`${featured ? "atlas-country is-featured" : "atlas-country"}${showImage || hasTemporaryImage ? "" : " is-textual"}`}>
      {showImage || hasTemporaryImage ? (
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
  const hasTemporaryImage = !showImage;
  const image = hasTemporaryImage
    ? temporaryDestinationImage(destination)
    : destination.gallery[index % Math.max(destination.gallery.length, 1)] || destination.image;

  return (
    <article className={index % 4 === 0 ? "destination-editorial-card is-wide" : "destination-editorial-card"}>
      {showImage || hasTemporaryImage ? (
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
