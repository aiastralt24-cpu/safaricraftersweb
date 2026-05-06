import type { MetadataRoute } from "next";
import { destinations, expeditions, journal, journeys } from "@/lib/data";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://safaricrafters.com";
  const staticRoutes = [
    "",
    "/journeys",
    "/destinations",
    "/photo-expeditions",
    "/journal",
    "/about",
    "/specialists",
    "/contact",
    "/plan",
    "/search",
    "/legal/privacy",
    "/legal/terms",
    "/legal/cookies"
  ];

  return [
    ...staticRoutes.map((route) => ({ url: `${base}${route}`, lastModified: new Date() })),
    ...journeys.map((item) => ({ url: `${base}/journeys/${item.slug}`, lastModified: new Date() })),
    ...destinations.map((item) => ({ url: `${base}/destinations/${item.slug}`, lastModified: new Date() })),
    ...expeditions.map((item) => ({ url: `${base}/photo-expeditions/${item.slug}`, lastModified: new Date() })),
    ...journal.map((item) => ({ url: `${base}/journal/${item.slug}`, lastModified: new Date() }))
  ];
}
