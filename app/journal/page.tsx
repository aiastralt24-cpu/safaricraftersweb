import { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { journal, journalCategories } from "@/lib/data";
import { JournalIndex } from "./JournalIndex";
import "../listing.css";

export const metadata: Metadata = {
  title: "The Journal",
  description: "Field notes, photography, conservation, safari intelligence and people from Safari Crafters."
};

export default function JournalPage() {
  return (
    <>
      <PageHero
        title="The Journal"
        copy="Field notes, photographic essays, conservation thinking and practical safari intelligence, written with the care of a magazine rather than a blog."
        image={journal[0].image}
        meta="Field Notes · Photography · Conservation"
      />
      <section className="section">
        <JournalIndex articles={journal} categories={journalCategories} />
      </section>
    </>
  );
}
