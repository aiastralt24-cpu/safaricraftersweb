import fs from "node:fs/promises";
import sharp from "sharp";

const prompts = JSON.parse(await fs.readFile("content/africa-image-prompts.json", "utf8"));
const sources = JSON.parse(await fs.readFile("content/africa-image-generated-sources.json", "utf8"));
const directory = "public/assets/africa-atlas-generated";
await fs.mkdir(directory, { recursive: true });
const images = {};
for (const { id, prompt } of prompts) {
  if (!sources[id]) continue;
  const file = `${directory}/${id}.webp`;
  await sharp(sources[id]).rotate().resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 86 }).toFile(file);
  images[id] = {
    src: `/assets/africa-atlas-generated/${id}.webp`,
    alt: `AI-generated illustration: ${prompt.split("Scene: ")[1].split(" Natural photographic realism")[0]}`,
    credit: "AI-generated destination illustration"
  };
}
await fs.writeFile("content/africa-atlas-images.json", `${JSON.stringify(images, null, 2)}\n`);
console.log(`Prepared ${Object.keys(images).length} of ${prompts.length} Africa atlas images.`);
