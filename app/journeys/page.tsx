import { Metadata } from "next";
import { JourneyCard } from "@/components/Cards";
import { PageHero } from "@/components/PageHero";
import { journeyCategories, journeys } from "@/lib/data";
import "../listing.css";

export const metadata: Metadata = {
  title: "Journeys",
  description: "Private India safaris, Africa safaris, ultra-luxury routes, family journeys and conservation-led safari routes."
};

export default function JourneysPage() {
  return (
    <>
      <PageHero
        title="Journeys with intent."
        copy="Private routes, rare access and field-led pacing."
        image={journeys[1].image}
        meta="Journeys"
      />
      <section className="section">
        <div className="container category-rail">
          {journeyCategories.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <div className="container grid-3 listing-grid">
          {journeys.map((journey) => (
            <JourneyCard key={journey.slug} journey={journey} />
          ))}
        </div>
      </section>
    </>
  );
}
