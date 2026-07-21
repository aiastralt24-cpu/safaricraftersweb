import { Metadata } from "next";
import { ExpeditionCard, JourneyCard } from "@/components/Cards";
import { PageHero } from "@/components/PageHero";
import type { Journey } from "@/lib/data";
import { expeditions, journeyCategories, journeys } from "@/lib/data";
import "../listing.css";

export const metadata: Metadata = {
  title: "Private Safari Journey Blueprints",
  description: "Private safari journey blueprints for India and Africa, refined around wildlife, season, photography, comfort and unhurried pacing.",
  alternates: { canonical: "/journeys" }
};

export default function JourneysPage() {
  const signatureJourneys = journeys.slice(0, 4);
  const craftedIndiaJourneys = journeys.filter((journey) =>
    ["India", "Rajasthan", "Madhya Pradesh", "Gujarat", "Ladakh", "Uttarakhand", "Karnataka"].some((region) =>
      journey.region.includes(region)
    )
  );
  const africaJourneys = journeys.filter((journey) => journey.region.includes("Africa") || journey.region.includes("Kenya"));

  return (
    <>
      <PageHero
        title="Private journey blueprints."
        copy="Considered starting points, refined around your reason for travelling."
        image={journeys[1].image}
        meta="Journeys"
      />
      <section className="section">
        <div className="container category-rail">
          {journeyCategories.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <JourneySection title="Signature journeys" copy="The strongest starting points for private safari planning." journeys={signatureJourneys} />
        <JourneySection title="Crafted itineraries in India" copy="Tiger forests, leopard country, high Himalaya and heritage-led wilderness routes." journeys={craftedIndiaJourneys} />
        {africaJourneys.length ? (
          <JourneySection title="Africa routes" copy="Classic safari routes shaped with the same quiet private-brief discipline." journeys={africaJourneys} />
        ) : null}
        <section className="container journey-listing-section">
          <div className="journey-listing-header">
            <h2>Photo-led and specialist-led departures</h2>
            <p>Seasonal field commissions for travellers who want mentorship, patience and stronger image-making conditions.</p>
          </div>
          <div className="grid-3 listing-grid">
            {expeditions.slice(0, 6).map((expedition) => (
              <ExpeditionCard key={expedition.slug} expedition={expedition} />
            ))}
          </div>
        </section>
      </section>
    </>
  );
}

function JourneySection({
  title,
  copy,
  journeys
}: {
  title: string;
  copy: string;
  journeys: Journey[];
}) {
  return (
    <section className="container journey-listing-section">
      <div className="journey-listing-header">
        <h2>{title}</h2>
        <p>{copy}</p>
      </div>
      <div className="grid-3 listing-grid">
        {journeys.map((journey) => (
          <JourneyCard key={journey.slug} journey={journey} />
        ))}
      </div>
    </section>
  );
}
