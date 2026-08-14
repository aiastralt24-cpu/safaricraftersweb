import type { MetadataRoute } from "next";
import { destinations, expeditions, journal, journeys } from "@/lib/data";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://safaricrafters.com";
  const contentReviewed = new Date("2026-07-01T00:00:00.000Z");
  const staticRoutes = [
    "",
    "/journeys",
    "/destinations",
    "/photo-expeditions",
    "/journal",
    "/reviews",
    "/store",
    "/about",
    "/specialists",
    "/contact",
    "/plan",
    "/legal/privacy",
    "/legal/terms",
    "/legal/cookies"
  ];

  return [
    ...staticRoutes.map((route) => ({ url: `${base}${route}`, lastModified: contentReviewed })),
    ...journeys.map((item) => ({ url: `${base}/journeys/${item.slug}`, lastModified: new Date(item.seo?.reviewedAt || contentReviewed) })),
    ...destinations.map((item) => ({ url: `${base}/destinations/${item.slug}`, lastModified: new Date(item.seo?.reviewedAt || contentReviewed) })),
    ...expeditions.map((item) => ({ url: `${base}/photo-expeditions/${item.slug}`, lastModified: contentReviewed })),
    ...journal.map((item) => ({ url: `${base}/journal/${item.slug}`, lastModified: new Date(item.date) }))
  ];
}
