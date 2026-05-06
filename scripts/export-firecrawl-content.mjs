import fs from "node:fs";
import path from "node:path";

const input = process.argv[2] ?? "output/firecrawl/safaricrafters-crawl.json";
const outDir = process.argv[3] ?? "output/firecrawl/export";

const raw = JSON.parse(fs.readFileSync(input, "utf8"));
const pages = Array.isArray(raw) ? raw : raw.data ?? [];

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(path.join(outDir, "pages"), { recursive: true });

const slugFor = (url, index) => {
  const parsed = new URL(url);
  const pathname = parsed.pathname.replace(/^\/|\/$/g, "");
  const slug = pathname || "home";
  return `${String(index + 1).padStart(2, "0")}-${slug.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()}`;
};

const mediaPattern = /!\[([^\]]*)\]\(([^)]+)\)|https?:\/\/[^\s)"']+\.(?:jpg|jpeg|png|webp|gif|svg|mp4|mov|webm|m3u8)/gi;
const mediaRows = [["page_title", "page_url", "alt_text", "media_url", "type"]];
const indexRows = [["title", "url", "markdown_file", "status_code"]];

for (const [index, page] of pages.entries()) {
  const metadata = page.metadata ?? {};
  const url = metadata.sourceURL ?? metadata.url ?? `unknown-${index}`;
  const title = metadata.title ?? metadata.ogTitle ?? url;
  const slug = slugFor(url, index);
  const markdownFile = `pages/${slug}.md`;
  const fullMarkdownPath = path.join(outDir, markdownFile);
  const body = page.markdown ?? "";

  const frontmatter = [
    "---",
    `title: ${JSON.stringify(title)}`,
    `url: ${JSON.stringify(url)}`,
    `statusCode: ${JSON.stringify(metadata.statusCode ?? null)}`,
    `contentType: ${JSON.stringify(metadata.contentType ?? null)}`,
    "---",
    "",
  ].join("\n");

  fs.writeFileSync(fullMarkdownPath, `${frontmatter}${body}\n`);
  indexRows.push([title, url, markdownFile, metadata.statusCode ?? ""]);

  for (const match of body.matchAll(mediaPattern)) {
    const alt = match[1] ?? "";
    const mediaUrl = match[2] ?? match[0];
    const cleanUrl = mediaUrl.replace(/[),.]+$/g, "");
    const type = /\.(mp4|mov|webm|m3u8)(?:$|\?)/i.test(cleanUrl) ? "video" : "image";
    mediaRows.push([title, url, alt, cleanUrl, type]);
  }
}

const csv = (rows) =>
  rows
    .map((row) =>
      row
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");

fs.writeFileSync(path.join(outDir, "pages-index.csv"), csv(indexRows));
fs.writeFileSync(path.join(outDir, "media-manifest.csv"), csv(mediaRows));

console.log(`Exported ${pages.length} pages to ${outDir}`);
console.log(`Found ${mediaRows.length - 1} media references`);
