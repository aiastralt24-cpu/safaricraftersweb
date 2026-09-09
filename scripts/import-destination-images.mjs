import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { execFileSync } from "node:child_process";

const downloads = "/Users/bunny/Downloads";
const outputRoot = path.resolve("public/assets/destinations");
const contentPath = path.resolve("content/site-content.json");
const imagePattern = /\.(jpe?g|png|webp)$/i;

const regionalLibraries = {
  India: ["India"], Kenya: ["Kenya"], Brazil: ["Brazil"],
  "Chile and Argentina": ["Chile"], Tanzania: ["Tanzania"], Uganda: ["Uganda"], Norway: ["Svalbard"]
};

const exactLibraries = {
  pantanal: ["Brazil/Pantanal", "Brazil/Pantanal 2"], "atlantic-rainforest": ["Brazil/Atlantic Forest"], patagonia: ["Chile/Patagonia"],
  bandhavgarh: ["India/Bandhavgarh"], bandipur: ["India/Bandipur"], "bharatpur-keoladeo": ["India/Bharatpur"], corbett: ["India/Corbett"], dudhwa: ["India/Dudhwa"], gir: ["India/Gir"], jawai: ["India/Jawai"], jhalana: ["India/Jhalana"], kabini: ["India/Kabini"], kanha: ["India/Kanha"], kaziranga: ["India/Kaziranga"], ladakh: ["India/Ladakh"], panna: ["India/Panna"], pench: ["India/Pench"], rajaji: ["India/Rajaji"], ranthambhore: ["India/Ranthambhore"], "rann-of-kutch": ["India/Rann of Kutch"], "sattal-and-pangot": ["India/Sattal and Pangot"], singalila: ["India/Singalila"], "spiti-valley": ["India/Spiti Valley"], sunderbans: ["India/Sundarbans"], tadoba: ["India/Tadoba"], velavadar: ["India/Velavadar"],
  amboseli: ["Kenya/Amboseli"], laikipia: ["Kenya/Laikipia"], "masai-mara": ["Kenya/Masai Mara"], serengeti: ["Tanzania/Serengeti"],
  "bwindi-impenetrable": ["Uganda/Bwindi"], "kibale-national-park": ["Uganda/Kibale"], "queen-elizabeth-national-park": ["Uganda/Q Eliz NP"], svalbard: ["Svalbard"]
};

// Reviewed visually from contact sheets. Values are zero-based positions in
// each ranked exact-destination library, chosen for subject relevance rather
// than simply preferring the widest file.
const heroSelections = {
  ranthambhore: 1, jawai: 2, "spiti-valley": 1, bandhavgarh: 1, kanha: 0,
  pench: 0, tadoba: 0, panna: 1, kaziranga: 1, bandipur: 2, kabini: 4,
  sunderbans: 1, dudhwa: 1, gir: 2, rajaji: 2, corbett: 0, velavadar: 1,
  "sattal-and-pangot": 3, "bharatpur-keoladeo": 2, "rann-of-kutch": 3,
  "masai-mara": 0, amboseli: 0, laikipia: 0, pantanal: 0,
  "atlantic-rainforest": 0, patagonia: 1, serengeti: 3,
  "bwindi-impenetrable": 1, "queen-elizabeth-national-park": 0,
  "kibale-national-park": 1, svalbard: 1
};

const heroAltText = {
  ranthambhore: "Bengal tiger beside a Ranthambhore lake",
  jawai: "Leopard moving across Jawai's granite hills",
  "spiti-valley": "Snow leopard crossing a high-altitude slope in Spiti",
  bandhavgarh: "Bengal tiger in Bandhavgarh's sal forest",
  kanha: "Tiger walking through Kanha at first light",
  pench: "Tiger descending through Pench's rocky forest",
  tadoba: "Tigers cooling at a Tadoba waterhole",
  panna: "Tiger in Panna's dry forest",
  kaziranga: "One-horned rhinoceros in Kaziranga grassland",
  bandipur: "Deer herd in Bandipur's open woodland",
  kabini: "Tiger beside Kabini's forest edge",
  sunderbans: "Mangrove waterways of the Sundarbans",
  dudhwa: "Tiger on a forest track in Dudhwa",
  gir: "Asiatic lion in Gir",
  rajaji: "Asian elephants moving through Rajaji",
  corbett: "Tiger in Corbett's tall grass",
  velavadar: "Blackbuck habitat at Velavadar",
  "sattal-and-pangot": "Birdlife around the lakes and forests of Sattal and Pangot",
  "bharatpur-keoladeo": "Wetland birds at Bharatpur Keoladeo",
  "rann-of-kutch": "Flamingos in the Rann of Kutch",
  "masai-mara": "Wildebeest beneath a dramatic Masai Mara sky",
  amboseli: "Elephant beneath Kilimanjaro in Amboseli",
  laikipia: "Black leopard moving through Laikipia grassland",
  pantanal: "Jaguars beside a Pantanal riverbank",
  "atlantic-rainforest": "Toucan in Brazil's Atlantic rainforest",
  patagonia: "Puma beneath the mountains of Patagonia",
  serengeti: "Lion on the open Serengeti plains",
  "bwindi-impenetrable": "Mountain gorilla in Bwindi Impenetrable Forest",
  "queen-elizabeth-national-park": "Savannah landscape in Queen Elizabeth National Park",
  "kibale-national-park": "Chimpanzee in Kibale forest",
  svalbard: "Polar bear on the coast of Svalbard"
};

const curatedOverrides = {
  singalila: {
    image: { src: "/assets/safari-crafters/red-panda-61dc9dd9.jpg", alt: "Red panda in the temperate forest of Singalila", credit: "Safari Crafters archive" },
    gallery: [{ src: "/assets/safari-crafters/a-red-panda-rhino-expedition-6e3a864f.jpg", alt: "Red panda habitat and wildlife of eastern India", credit: "Safari Crafters archive" }]
  },
  ladakh: {
    image: { src: "/assets/safari-crafters/where-sky-meets-earth-ladakh-eda4b10b.jpg", alt: "The high-altitude landscape of Ladakh", credit: "Safari Crafters archive" },
    gallery: [{ src: "/assets/safari-crafters/ladakh-5f4faad7.jpg", alt: "Ladakh's mountain wilderness", credit: "Safari Crafters archive" }]
  },
  jhalana: {
    image: { src: "/assets/safari-crafters/jawai-leopard-portrait.JPG", alt: "Leopard portrait in Rajasthan", credit: "Safari Crafters" },
    gallery: [{ src: "/assets/safari-crafters/jawai-leopards-pair.JPG", alt: "Leopards among Rajasthan's rocky terrain", credit: "Safari Crafters" }]
  }
};

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : imagePattern.test(entry.name) ? [file] : [];
  }));
  return nested.flat();
}

async function inspect(file) {
  try {
    const metadata = await sharp(file).metadata();
    const width = metadata.autoOrient?.width || metadata.width || 0;
    const height = metadata.autoOrient?.height || metadata.height || 0;
    const ratio = height ? width / height : 0;
    const landscapeBonus = ratio >= 1.3 ? 3 : ratio >= 1.05 ? 1 : 0;
    return { file, score: landscapeBonus + 2 - Math.min(2, Math.abs(1.55 - ratio)) + Math.log10(Math.max(1, width * height)) / 10 };
  } catch { return null; }
}

async function ranked(relativeDirectories) {
  const files = [];
  for (const relativeDirectory of relativeDirectories) files.push(...await walk(path.join(downloads, relativeDirectory)));
  return (await Promise.all([...new Set(files)].map(inspect))).filter(Boolean).sort((a, b) => b.score - a.score);
}

async function writeAssets(destination, selected) {
  const directory = path.join(outputRoot, destination.slug);
  await fs.mkdir(directory, { recursive: true });
  const assets = [];
  for (const [index, item] of selected.entries()) {
    const filename = `${destination.slug}-${String(index + 1).padStart(2, "0")}.jpg`;
    await sharp(item.file).rotate().resize({ width: 2400, height: 1800, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(directory, filename));
    assets.push({ src: `/assets/destinations/${destination.slug}/${filename}`, alt: `${destination.title} wildlife and landscape photograph ${index + 1}`, credit: "Safari Crafters archive" });
  }
  const heroIndex = Math.min(heroSelections[destination.slug] || 0, assets.length - 1);
  destination.image = assets[heroIndex];
  if (heroAltText[destination.slug]) destination.image.alt = heroAltText[destination.slug];
  destination.gallery = assets.filter((_, index) => index !== heroIndex);
  return assets.length;
}

const content = JSON.parse(await fs.readFile(contentPath, "utf8"));
const baseline = JSON.parse(execFileSync("git", ["show", "HEAD:content/site-content.json"], { encoding: "utf8" }));
const baselineBySlug = new Map(baseline.destinations.map((destination) => [destination.slug, destination]));
const allocations = [];
const globallyAssigned = new Set();

// Start with the previously curated photography. Only an exact supplied
// destination folder is allowed to replace it; broad regional imagery can
// easily contradict the species or landscape named in the page copy.
for (const destination of content.destinations) {
  if (exactLibraries[destination.slug]) continue;
  const previous = baselineBySlug.get(destination.slug);
  if (!previous) continue;
  destination.image = previous.image;
  destination.gallery = previous.gallery;
}

for (const [country, regionDirectories] of Object.entries(regionalLibraries)) {
  const regionDestinations = content.destinations.filter((destination) => destination.country === country && exactLibraries[destination.slug]);
  const regionCandidates = await ranked(regionDirectories);
  const assigned = new Set();
  const selections = new Map(regionDestinations.map((destination) => [destination.slug, []]));
  const countryTarget = country === "India" || country === "Norway" ? 6 : 2;

  for (const destination of regionDestinations) {
    const directories = exactLibraries[destination.slug];
    if (!directories) continue;
    const candidates = await ranked(directories);
    const limit = country === "India" || country === "Norway" ? 6 : 4;
    for (const candidate of candidates) {
      if (selections.get(destination.slug).length >= limit) break;
      if (assigned.has(candidate.file) || globallyAssigned.has(candidate.file)) continue;
      selections.get(destination.slug).push(candidate);
      assigned.add(candidate.file);
      globallyAssigned.add(candidate.file);
    }
  }

  const needsImages = regionDestinations.filter((destination) => selections.get(destination.slug).length < countryTarget);
  let cursor = 0;
  for (const candidate of regionCandidates) {
    if (assigned.has(candidate.file) || globallyAssigned.has(candidate.file) || !needsImages.length) continue;
    let attempts = 0;
    while (attempts < needsImages.length && selections.get(needsImages[cursor % needsImages.length].slug).length >= countryTarget) { cursor += 1; attempts += 1; }
    if (attempts === needsImages.length) break;
    const destination = needsImages[cursor % needsImages.length];
    selections.get(destination.slug).push(candidate);
    assigned.add(candidate.file);
    globallyAssigned.add(candidate.file);
    cursor += 1;
  }

  for (const destination of regionDestinations) {
    const selected = selections.get(destination.slug);
    if (!selected.length) continue;
    allocations.push({ slug: destination.slug, country, count: await writeAssets(destination, selected) });
  }
}

for (const [slug, media] of Object.entries(curatedOverrides)) {
  const destination = content.destinations.find((item) => item.slug === slug);
  if (destination) Object.assign(destination, media);
}

await fs.writeFile(contentPath, `${JSON.stringify(content, null, 2)}\n`);
console.log(JSON.stringify(allocations, null, 2));
