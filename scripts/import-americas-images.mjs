import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Curated from the supplied folders. Override the source root when reimporting.
const sourceRoot = process.argv[2] || "/Users/bunny/Downloads";
const selections = JSON.parse(await fs.readFile("content/americas-image-selections.json", "utf8"));
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

function assign(item, images) {
  if (!item) throw new Error("Missing destination or expedition");
  item.image = images[0];
  item.gallery = images.slice(1);
}

for (const [slug, images] of Object.entries(assets)) {
  assign(content.destinations.find((item) => item.slug === slug), images);
}
assign(content.destinations.find((item) => item.slug === "brazil"), [
  assets.pantanal[4], assets.pantanal[0], assets["atlantic-rainforest"][0],
  assets.pantanal[2], assets.pantanal[3], assets.pantanal[5], assets.pantanal[6]
]);
assign(content.destinations.find((item) => item.slug === "chile"), [
  assets.patagonia[1], assets.patagonia[0], ...assets.patagonia.slice(2)
]);
assign(content.expeditions.find((item) => item.slug === "the-pantanal-wetlands"), assets.pantanal);

await fs.writeFile("content/site-content.json", `${JSON.stringify(content, null, 2)}\n`);
console.log(`Imported ${Object.values(assets).flat().length} images across seven destinations and the Pantanal expedition.`);
