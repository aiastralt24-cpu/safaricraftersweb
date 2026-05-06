import { Metadata } from "next";
import Link from "next/link";
import { destinations, expeditions, journal, journeys } from "@/lib/data";
import "../simple.css";

export const metadata: Metadata = {
  title: "Search",
  description: "Search Safari Crafters journeys, destinations, photo expeditions and journal stories."
};

export default function SearchPage() {
  const items = [
    ...journeys.map((item) => ({ title: item.title, href: `/journeys/${item.slug}`, type: "Journey" })),
    ...destinations.map((item) => ({ title: item.title, href: `/destinations/${item.slug}`, type: "Destination" })),
    ...expeditions.map((item) => ({ title: item.title, href: `/photo-expeditions/${item.slug}`, type: "Photo Expedition" })),
    ...journal.map((item) => ({ title: item.title, href: `/journal/${item.slug}`, type: "Journal" }))
  ];

  return (
    <section className="section simple" style={{ paddingTop: 150 }}>
      <div className="container">
        <p className="eyebrow">Search</p>
        <h1 className="h1">Browse the Safari Crafters library.</h1>
        <div className="category-rail">
          {items.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.type}: {item.title}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
