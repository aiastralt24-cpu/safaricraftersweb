import { Metadata } from "next";
import { ExpeditionCard } from "@/components/Cards";
import { PageHero } from "@/components/PageHero";
import { expeditionCategories, expeditions } from "@/lib/data";
import "../listing.css";

export const metadata: Metadata = {
  title: "Photo Expeditions",
  description: "Photography-led tiger, big cat, birding, wetland and mentorship safaris."
};

export default function PhotoExpeditionsPage() {
  return (
    <>
      <PageHero
        title="Field craft, framed."
        copy="Small groups, private mentorship and patient light."
        image={expeditions[0].image}
        meta="Photo Expeditions"
      />
      <section className="section">
        <div className="container category-rail">
          {expeditionCategories.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <div className="container grid-3 listing-grid">
          {expeditions.map((expedition) => (
            <ExpeditionCard key={expedition.slug} expedition={expedition} />
          ))}
        </div>
      </section>
    </>
  );
}
