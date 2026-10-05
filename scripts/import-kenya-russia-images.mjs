import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const sourceRoot = process.argv[2] || "/Users/bunny/Downloads";
const selections = JSON.parse(await fs.readFile("content/kenya-russia-image-selections.json", "utf8"));
const content = JSON.parse(await fs.readFile("content/site-content.json", "utf8"));
const assets = {};

for (const [slug, selection] of Object.entries(selections)) {
  const directory = `public/assets/destinations/${slug}/supplied`;
  await fs.mkdir(directory, { recursive: true });
  assets[slug] = [];
  for (const [index, image] of selection.images.entries()) {
    const filename = `${String(index + 1).padStart(2, "0")}.webp`;
    await sharp(path.join(sourceRoot, selection.folder, image.file))
      .rotate()
      .resize({ width: 2400, height: 1800, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(path.join(directory, filename));
    assets[slug].push({
      src: `/assets/destinations/${slug}/supplied/${filename}`,
      alt: image.alt,
      credit: "Safari Crafters archive"
    });
  }
}

const laikipia = content.destinations.find((item) => item.slug === "laikipia");
const expedition = content.expeditions.find((item) => item.slug === "laikipia-black-leopard-expedition");
const kenya = content.destinations.find((item) => item.slug === "kenya");
if (!laikipia || !expedition || !kenya) throw new Error("Missing Kenya destination or expedition");
for (const item of [laikipia, expedition]) {
  item.image = assets.laikipia[0];
  item.gallery = assets.laikipia.slice(1);
}
// Keep Kenya's broader landscape coverage alongside the supplied Laikipia photos.
kenya.gallery = [...new Map([
  assets.laikipia[2], assets.laikipia[4], assets.laikipia[1], ...kenya.gallery
].filter((image) => image.src !== kenya.image.src).map((image) => [image.src, image])).values()];

// Reusable library shared by the Russia and Kamchatka destination content.
await fs.writeFile("content/kamchatka-image-library.json", `${JSON.stringify(assets.kamchatka, null, 2)}\n`);
await fs.writeFile("content/site-content.json", `${JSON.stringify(content, null, 2)}\n`);
console.log("Applied seven Laikipia images to Kenya, Laikipia and its expedition; refreshed thirteen Kamchatka library images.");
