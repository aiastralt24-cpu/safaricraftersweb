import { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { JsonLd } from "@/components/JsonLd";
import { journal, journalCategories } from "@/lib/data";
import { breadcrumbSchema } from "@/lib/structured-data";
import { JournalIndex } from "./JournalIndex";
import "../listing.css";

export const metadata: Metadata = {
  title: "The Journal",
  description: "Field notes, photography, conservation, safari intelligence and people from Safari Crafters."
};

export default function JournalPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "The Journal", path: "/journal" }])} />
      <PageHero
        title="The Journal"
        copy="Field notes, photographic essays, conservation thinking and practical safari intelligence, written with the care of a magazine rather than a blog."
        image={journal[0].image}
        meta="Field Notes · Photography · Conservation"
        variant="destination"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "The Journal" }]}
      />
      <section className="section surface-white">
        <JournalIndex articles={journal} categories={journalCategories} />
      </section>
    </>
  );
}
