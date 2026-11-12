import type { ImageAsset } from './data';

export function distinctLocationLabel(value: string) {
  const seen = new Set<string>();
  return value.split(',').map(part => part.trim()).filter(part => {
    const key = part.toLocaleLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).join(', ');
}

/** Keep each card's image where possible, using only its own supplied alternatives. */
export function distinctListingImages<T extends { image: ImageAsset; gallery?: ImageAsset[] }>(items: T[], reserved: string[] = []): T[] {
  const used = new Set(reserved);
  const primaryImages = new Set(items.map(item => item.image.src));
  return items.map(item => {
    const image = !used.has(item.image.src) ? item.image
      : item.gallery?.find(image => !used.has(image.src) && !primaryImages.has(image.src))
        || item.gallery?.find(image => !used.has(image.src)) || item.image;
    used.add(image.src);
    return {...item, image};
  });
}

export function listingHeroImage(preferred: ImageAsset, alternatives: ImageAsset[], cardImages: ImageAsset[]) {
  const used = new Set(cardImages.map(image => image.src));
  return [preferred, ...alternatives].find(image => !used.has(image.src)) || preferred;
}
