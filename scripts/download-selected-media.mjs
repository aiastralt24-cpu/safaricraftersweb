import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";

const manifestPath = process.argv[2] ?? "output/firecrawl/export/selected-media.json";
const outDir = process.argv[3] ?? "public/assets/safari-crafters";
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

fs.mkdirSync(outDir, { recursive: true });

function download({ url, filename }) {
  const target = path.join(outDir, filename);
  if (fs.existsSync(target) && fs.statSync(target).size > 0) return Promise.resolve("cached");

  return new Promise((resolve) => {
    const client = url.startsWith("https:") ? https : http;
    const request = client.get(url, { headers: { "user-agent": "SafariCraftersContentRebuild/1.0" } }, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode ?? 0) && response.headers.location) {
        response.resume();
        download({ url: new URL(response.headers.location, url).toString(), filename }).then(resolve);
        return;
      }
      if ((response.statusCode ?? 500) >= 400) {
        response.resume();
        resolve(`failed:${response.statusCode}`);
        return;
      }
      const file = fs.createWriteStream(target);
      response.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve("downloaded");
      });
    });
    request.setTimeout(30000, () => {
      request.destroy();
      resolve("timeout");
    });
    request.on("error", () => resolve("error"));
  });
}

const summary = { downloaded: 0, cached: 0, failed: 0 };
const concurrency = 8;
let cursor = 0;

async function worker() {
  while (cursor < manifest.length) {
    const item = manifest[cursor++];
    const result = await download(item);
    if (result === "downloaded") summary.downloaded += 1;
    else if (result === "cached") summary.cached += 1;
    else summary.failed += 1;
  }
}

await Promise.all(Array.from({ length: concurrency }, worker));

console.log(`Media manifest: ${manifest.length}`);
console.log(`Downloaded: ${summary.downloaded}`);
console.log(`Cached: ${summary.cached}`);
console.log(`Failed: ${summary.failed}`);
