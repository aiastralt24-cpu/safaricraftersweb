import { Metadata } from "next";
import { JourneyFilm } from "@/components/JourneyFilm";
import { JsonLd } from "@/components/JsonLd";
import { journeys } from "@/lib/data";
import { breadcrumbSchema } from "@/lib/structured-data";
import "../listing.css";
import "./journeys-atlas.css";

export const metadata: Metadata = {
  title: "Private Safari Journey Blueprints",
  description: "Private safari journey blueprints for India and Africa, refined around wildlife, season, photography, comfort and unhurried pacing.",
  alternates: { canonical: "/journeys" }
};

export default function JourneysPage() {
  const featuredSlugs = [
    "big-cats-of-india",
    "heart-of-the-wildcentral-indias-six-park-safari",
    "whiskers-stripes-and-roarssafari-adventures-with-indias-big-cats",
    "palaces-and-tigers",
    "southern-splendourwhere-forests-hills-wildlife-converge",
    "trail-of-the-himalayan-firefox-a-red-panda-rhino-expedition"
  ];
  const featuredJourneys = featuredSlugs
    .map((slug) => journeys.find((journey) => journey.slug === slug))
    .filter((journey): journey is (typeof journeys)[number] => Boolean(journey));

  return <>
    <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Private Journeys", path: "/journeys" }])} />
    <JourneyFilm journeys={featuredJourneys} />
  </>;
}
