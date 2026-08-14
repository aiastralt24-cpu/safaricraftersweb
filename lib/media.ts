import type { ImageAsset } from "@/lib/data";

export function isApprovedEditorialImage(image: ImageAsset | undefined): image is ImageAsset {
  return Boolean(image && !/^temporary\b/i.test(image.alt.trim()));
}
