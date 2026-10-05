import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const roots = ["app", "components", "content", "lib"];
const sourceFiles = roots.flatMap(walk).filter((file) => /\.(?:tsx?|json)$/.test(file));
const assetPattern = /["'`](\/assets\/[^"'`?]+?\.(?:avif|gif|jpe?g|png|webp))["'`]/gi;
const references = new Map();

for (const file of sourceFiles) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(assetPattern)) {
    const usages = references.get(match[1]) || [];
    usages.push(`${file}:${source.slice(0, match.index).split("\n").length}`);
    references.set(match[1], usages);
  }
}

const missing = [];
const replacementRecommended = [];
const dimensions = new Map();
for (const [asset, usages] of references) {
  const file = join("public", asset);
  if (!existsSync(file)) {
    missing.push({ asset, usages });
    continue;
  }
  if (!/\.(?:jpe?g|png|webp)$/i.test(extname(file))) continue;
  const output = execFileSync("/usr/bin/sips", ["-g", "pixelWidth", "-g", "pixelHeight", file], { encoding: "utf8" });
  const width = Number(output.match(/pixelWidth: (\d+)/)?.[1] || 0);
  const height = Number(output.match(/pixelHeight: (\d+)/)?.[1] || 0);
  dimensions.set(asset, { width, height });
  if (Math.max(width, height) < 1200 || Math.min(width, height) < 600) replacementRecommended.push({ asset, width, height, usages });
}

const content = JSON.parse(readFileSync("content/site-content.json", "utf8"));
const pageGroups = [
  ...content.journeys.map((item) => ({ type: "journey", slug: item.slug, images: [item.image, ...item.gallery] })),
  ...content.destinations.map((item) => ({ type: "destination", slug: item.slug, images: [item.image, ...item.gallery] })),
  ...content.expeditions.map((item) => ({ type: "expedition", slug: item.slug, images: [item.image, ...item.gallery] })),
  ...content.journal.map((item) => ({ type: "journal", slug: item.slug, images: [item.image, ...item.gallery.filter((image) => image.src !== item.image.src)] }))
];
const repeatedWithinPage = pageGroups.flatMap((group) => {
  const counts = new Map();
  for (const image of group.images) counts.set(image.src, (counts.get(image.src) || 0) + 1);
  return [...counts].filter(([, count]) => count > 1).map(([asset, count]) => ({ ...group, images: undefined, asset, count }));
});
const genericAlts = pageGroups.flatMap((group) => group.images
  .filter((image) => /(?:gallery image|^image \d+$|^photo \d+$)/i.test(image.alt.trim()))
  .map((image) => ({ type: group.type, slug: group.slug, asset: image.src, alt: image.alt })));

const report = {
  referencedAssets: references.size,
  measuredRasterAssets: dimensions.size,
  missing,
  replacementRecommended,
  repeatedWithinPage,
  genericAlts
};
console.log(JSON.stringify(report, null, 2));

if (missing.length || repeatedWithinPage.length) process.exitCode = 1;

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [relative(".", path)];
  });
}
