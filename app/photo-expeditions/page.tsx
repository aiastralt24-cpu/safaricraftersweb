import { Metadata } from "next";
import { PhotoExpeditionFilm } from "@/components/PhotoExpeditionFilm";
import { expeditions } from "@/lib/data";
import "../journeys/journeys-atlas.css";
import "./photo-expeditions-atlas.css";

export const metadata: Metadata = {
  title: "Photo Expeditions",
  description: "Photography-led tiger, big cat, birding, wetland and mentorship safaris."
};

export default function PhotoExpeditionsPage() {
  return <PhotoExpeditionFilm expeditions={expeditions} />;
}
