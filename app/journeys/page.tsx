import {CmsJourneyListing} from '@/components/CmsJourneyListing';
import {journeyListReader,readPublishedJourneyList} from '@/lib/cms/published-journey-list';
import './cms-journey.css';
import { Metadata } from "next";
import { JourneyFilm } from "@/components/JourneyFilm";
import { JsonLd } from "@/components/JsonLd";
import { journeys } from "@/lib/data";
import { breadcrumbSchema } from "@/lib/structured-data";
import "../listing.css";
import "./journeys-atlas.css";

export const dynamic='force-dynamic';
export const metadata: Metadata = {
  title: "Private Safari Journey Blueprints",
  description: "Private wildlife and cultural journeys across India, including an Eastern Himalayan route with a Nepal stay, tailored around your interests and season.",
  alternates: { canonical: "/journeys" }
};

export default async function JourneysPage() {
  if(process.env.CMS_JOURNEY_RENDERING_ENABLED==='true')return <CmsJourneyListing journeys={await readPublishedJourneyList(journeyListReader())}/>;
  const featuredSlugs = [
    "big-cats-of-india",
    "heart-of-the-wildcentral-indias-six-park-safari",
    "whiskers-stripes-and-roarssafari-adventures-with-indias-big-cats",
    "palaces-and-tigers",
    "southern-splendourwhere-forests-hills-wildlife-converge",
    "trail-of-the-himalayan-firefox-a-red-panda-rhino-expedition",
    "deserts-lions-dunesan-expedition-into-indias-wild-heart",
    "phantoms-of-the-wild-indias-elusive-small-cats-safari",
    "where-rivers-forests-tigers-thriveterrific-terai",
    "roar-trumpet-wingbeat-uttarakhands-wilderness-circuit",
    "where-sky-meets-earthladakh-realm-of-the-snow-leopard",
    "royal-rajasthan-safari"
  ];
  const featuredJourneys = featuredSlugs
    .map((slug) => journeys.find((journey) => journey.slug === slug))
    .filter((journey): journey is (typeof journeys)[number] => Boolean(journey));

  return <>
    <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Private Journeys", path: "/journeys" }])} />
    <JourneyFilm journeys={[...featuredJourneys, ...journeys.filter(journey => !featuredSlugs.includes(journey.slug))]} />
  </>;
}
