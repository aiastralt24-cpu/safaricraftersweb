import { Metadata } from "next";
import { PhotoExpeditionFilm } from "@/components/PhotoExpeditionFilm";
import { JsonLd } from "@/components/JsonLd";
import { expeditions } from "@/lib/data";
import { breadcrumbSchema } from "@/lib/structured-data";
import "../journeys/journeys-atlas.css";
import "./photo-expeditions-atlas.css";

export const metadata: Metadata = {
  title: "Photo Expeditions",
  description: "Photography-led tiger, big cat, birding, wetland and mentorship safaris."
};

export default function PhotoExpeditionsPage() {
  return <>
    <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Photo Expeditions", path: "/photo-expeditions" }])} />
    <PhotoExpeditionFilm expeditions={expeditions} />
  </>;
}

// Time-based departure filtering must not be frozen at build time.
export const dynamic = "force-dynamic";
