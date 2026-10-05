import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import sharp from "sharp";

// Re-run with a Downloads directory containing the named source folders.
const sourceRoot = process.argv[2] || path.join(os.homedir(), "Downloads");
const readJson = async (file) => JSON.parse(await fs.readFile(file, "utf8"));
const selections = await readJson("content/supplied-country-image-selections.json");
const content = await readJson("content/site-content.json");
const heroes = await readJson("content/destination-hero-images.json");
const atlasImages = await readJson("content/africa-atlas-images.json");
const assets = {};
const destination = (slug) => {
  const item = content.destinations.find((entry) => entry.slug === slug);
  if (!item) throw new Error(`Missing destination: ${slug}`);
  return item;
};

// Validate every source before replacing any content references.
for (const [slug, selection] of Object.entries(selections)) {
  destination(slug);
  for (const image of selection.images) await fs.access(path.join(sourceRoot, image.file));
}

for (const [slug, selection] of Object.entries(selections)) {
  const directory = `public/assets/destinations/${slug}/field-photographs`;
  await fs.mkdir(directory, { recursive: true });
  assets[slug] = [];
  for (const image of selection.images) {
    const input = await fs.readFile(path.join(sourceRoot, image.file));
    const hash = createHash("sha256").update(input).digest("hex").slice(0, 12);
    const filename = `${hash}.webp`;
    await sharp(input).rotate()
      .resize({ width: 2400, height: 1800, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(path.join(directory, filename));
    assets[slug].push({
      src: `/assets/destinations/${slug}/field-photographs/${filename}`,
      alt: image.alt,
      credit: "Safari Crafters archive",
      ...(image.focalPoint ? { focalPoint: image.focalPoint } : {})
    });
  }
}

function assign(slug, images) {
  const item = destination(slug);
  item.image = images[0];
  item.gallery = [...new Map(images.slice(1).map((image) => [image.src, image])).values()];
  heroes[slug] = item.image;
  if (atlasImages[slug]) atlasImages[slug] = item.image;
  if (atlasImages[`featured-${slug}`]) atlasImages[`featured-${slug}`] = images[1] || item.image;
  if (heroes[`featured-${slug}`]) heroes[`featured-${slug}`] = images[1] || item.image;
}

for (const [slug, images] of Object.entries(assets)) assign(slug, images);
assign("brazil", [assets.pantanal[0], assets.pantanal[1], assets["atlantic-rainforest"][0], assets.pantanal[2], assets["atlantic-rainforest"][1], assets.pantanal[4], assets.pantanal[8], assets["atlantic-rainforest"][2], assets.pantanal[9], assets.pantanal[6]]);
assign("chile", assets.patagonia);
assign("russia", assets.kamchatka);
assign("tanzania", [assets.serengeti[0], assets.ngorongoro[0], assets.serengeti[4], assets.ngorongoro[1], assets.serengeti[1], assets.serengeti[6], assets.ngorongoro[2], assets.serengeti[2], assets.serengeti[7], assets.serengeti[5]]);
assign("uganda", [assets["bwindi-impenetrable"][0], assets["bwindi-impenetrable"][1], assets["kibale-national-park"][0], assets["queen-elizabeth-national-park"][0], assets["bwindi-impenetrable"][4], assets["queen-elizabeth-national-park"][1], assets["kibale-national-park"][1], assets["queen-elizabeth-national-park"][3], assets["bwindi-impenetrable"][3], assets["queen-elizabeth-national-park"][4]]);

// Country and regional hero overrides otherwise mask the destination image.
heroes.norway = assets.svalbard[0];
heroes["chile-and-argentina"] = assets.patagonia[0];
heroes["atlas-arctic-beyond"] = assets.svalbard[0];
heroes["atlas-americas"] = assets.patagonia[0];
for (const [slug, images] of [["svalbard-expedition", assets.svalbard], ["the-pantanal-wetlands", assets.pantanal], ["ranthambhore-photography-expedition", assets.ranthambhore], ["panna-photography-expedition", assets.panna], ["kanha-wildlife-photography-expedition", assets.kanha], ["bharatpur-photography-expedition", assets["bharatpur-keoladeo"]]]) {
  const expedition = content.expeditions.find((entry) => entry.slug === slug);
  if (!expedition) throw new Error(`Missing expedition: ${slug}`);
  expedition.image = images[0];
  expedition.gallery = images.slice(1);
}

for (const [file, value] of [
  ["content/site-content.json", content],
  ["content/destination-hero-images.json", heroes],
  ["content/africa-atlas-images.json", atlasImages],
  ["content/kamchatka-image-library.json", assets.kamchatka]
]) await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
console.log(`Imported ${Object.values(assets).flat().length} selected photographs into ${Object.keys(assets).length} destination libraries, country pages, atlases and matching expeditions.`);
