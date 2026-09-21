import { Metadata } from "next";
import { destinations, expeditions, journal, journeys } from "@/lib/data";
import { SearchIndex, type SearchItem } from "./SearchIndex";
import "./search.css";

export const metadata: Metadata = {
  title: "Search",
  description: "Search Safari Crafters journeys, destinations, photo expeditions and journal stories.",
  alternates: { canonical: "/search" }
};

export default function SearchPage() {
  const items: SearchItem[] = [
    ...journeys.map((item) => ({ title: item.title, href: `/journeys/${item.slug}`, type: "Journey" as const, detail: item.region })),
    ...destinations.map((item) => ({ title: item.title, href: `/destinations/${item.slug}`, type: "Destination" as const, detail: item.country })),
    ...expeditions.map((item) => ({ title: item.title, href: `/photo-expeditions/${item.slug}`, type: "Photo Expedition" as const, detail: item.category })),
    ...journal.map((item) => ({ title: item.title, href: `/journal/${item.slug}`, type: "Journal" as const, detail: item.category }))
  ];

  return (
    <section className="search-page">
      <header className="container search-heading">
        <p className="eyebrow">Search</p>
        <h1>Find a place, journey or field story.</h1>
        <p>Search the Safari Crafters collection, or browse it by the kind of experience you are considering.</p>
      </header>
      <div className="container">
        <SearchIndex items={items} />
      </div>
    </section>
  );
}
