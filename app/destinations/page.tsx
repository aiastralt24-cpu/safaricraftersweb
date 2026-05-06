import { Metadata } from "next";
import { DestinationCard } from "@/components/Cards";
import { PageHero } from "@/components/PageHero";
import { destinations } from "@/lib/data";
import "../listing.css";

export const metadata: Metadata = {
  title: "Destinations",
  description: "Luxury safari destination guides for India, Africa and beyond."
};

export default function DestinationsPage() {
  return (
    <>
      <PageHero
        title="Wild places, precisely read."
        copy="Forests, plains, wetlands and stone country."
        image={destinations[0].image}
        meta="Destinations"
      />
      <section className="section">
        <div className="container grid-3 listing-grid">
          {destinations.map((destination) => (
            <DestinationCard key={destination.slug} destination={destination} />
          ))}
        </div>
      </section>
    </>
  );
}
