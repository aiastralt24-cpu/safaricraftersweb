import fs from "node:fs";

const content = JSON.parse(fs.readFileSync("content/site-content.json", "utf8"));
const { destinations, expeditions, journal, journeys } = content;

const base = process.argv[2] ?? "http://127.0.0.1:3000";

const staticRoutes = [
  "/",
  "/journeys",
  "/destinations",
  "/photo-expeditions",
  "/journal",
  "/about",
  "/admin",
  "/contact",
  "/plan",
  "/search",
  "/specialists",
  "/legal/privacy",
  "/legal/terms",
  "/legal/cookies",
  "/sitemap.xml",
  "/robots.txt",
];

const detailRoutes = [
  ...journeys.map((item) => `/journeys/${item.slug}`),
  ...destinations.map((item) => `/destinations/${item.slug}`),
  ...expeditions.map((item) => `/photo-expeditions/${item.slug}`),
  ...journal.map((item) => `/journal/${item.slug}`),
];

const legacyRoutes = [
  ...journeys.map((item) => `/itineraries/${item.slug}`),
  ...journal.map((item) => `/blogs/${item.slug}`),
  ...expeditions.map((item) => `/tours/${item.slug}`),
];

const routes = [...staticRoutes, ...detailRoutes, ...legacyRoutes];
const failures = [];

for (const route of routes) {
  const response = await fetch(`${base}${route}`, { redirect: "manual" });
  const ok = response.status >= 200 && response.status < 400;
  const location = response.headers.get("location");
  console.log(`${ok ? "ok" : "fail"} ${response.status} ${route}${location ? ` -> ${location}` : ""}`);
  if (!ok) failures.push({ route, status: response.status, location });
}

console.log(`\nChecked ${routes.length} routes. Failures: ${failures.length}.`);

if (failures.length) {
  process.exitCode = 1;
}
