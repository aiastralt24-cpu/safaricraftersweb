import type { CountryAtlas, Destination, ImageAsset, RegionalAtlas } from "@/lib/data";
import heroImages from "@/content/destination-hero-images.json";

const heroes: Record<string, ImageAsset> = heroImages;

export function getDestinationHeroImage(destination: Destination): ImageAsset {
  return heroes[destination.slug] || destination.image;
}

export function getCountryHeroImage(country: CountryAtlas): ImageAsset {
  return heroes[country.slug] || country.image;
}

export function getAtlasHeroImage(atlas: RegionalAtlas, destination: Destination): ImageAsset {
  return heroes[`atlas-${atlas.slug}`] || getDestinationHeroImage(destination);
}

export function isApprovedEditorialImage(image: ImageAsset | undefined): image is ImageAsset {
  return Boolean(image && !/^temporary\b/i.test(image.alt.trim()));
}
