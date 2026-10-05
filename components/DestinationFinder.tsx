"use client";

import Link from "next/link";
import { ArrowUpRight, ChevronDown, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { Destination } from "@/lib/data";
import "./DestinationFinder.css";

function destinationPreview(text: string, wordLimit = 22) {
  const words = text.trim().split(/\s+/);
  return words.length > wordLimit ? `${words.slice(0, wordLimit).join(" ")}…` : text;
}

export function DestinationFinder({ destinations }: { destinations: Destination[] }) {
  const [query, setQuery] = useState("");
  const [continent, setContinent] = useState("All regions");
  const [month, setMonth] = useState("Any season");
  const regions = [
    { value: "India", label: "India" },
    { value: "Africa", label: "Africa" },
    { value: "Americas", label: "The Americas" },
    { value: "Arctic", label: "Arctic & Beyond" }
  ];
  const filtered = useMemo(() => destinations.filter((destination) => {
    const text = `${destination.title} ${destination.country} ${destination.wildlife} ${destination.bestFor.join(" ")}`.toLowerCase();
    const matchesQuery = !query.trim() || text.includes(query.trim().toLowerCase());
    const matchesContinent = continent === "All regions" || destination.continent === continent;
    const matchesMonth = month === "Any season" || destination.bestMonths.toLowerCase().includes(month.toLowerCase());
    return matchesQuery && matchesContinent && matchesMonth;
  }), [continent, destinations, month, query]);
  const active = Boolean(query || continent !== "All regions" || month !== "Any season");

  return (
    <section className="destination-finder" aria-labelledby="destination-finder-title">
      <div className="destination-finder-regions" aria-label="Filter destinations by region">
        {regions.map((region) => (
          <button
            type="button"
            key={region.value}
            className={continent === region.value ? "is-active" : ""}
            aria-pressed={continent === region.value}
            onClick={() => setContinent((current) => current === region.value ? "All regions" : region.value)}
          >
            {region.label}
          </button>
        ))}
      </div>
      <div className="destination-finder-heading">
        <div><p className="eyebrow">Find the right landscape</p><h2 id="destination-finder-title">What would you like to encounter?</h2></div>
        <Link href="/plan?source=destination-finder" className="destination-finder-guidance">
          Let us guide you <ArrowUpRight size={15} strokeWidth={1.5} />
        </Link>
      </div>
      <div className="destination-finder-controls">
        <label className="destination-finder-search"><span>Search by animal, landscape or place</span><span className="finder-input"><Search size={18} aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tiger, rainforest, Svalbard..." /></span></label>
        <label className="destination-finder-mobile-region"><span>Where would you like to travel?</span><span className="finder-select"><select value={continent} onChange={(event) => setContinent(event.target.value)}><option>All regions</option>{regions.map((region) => <option value={region.value} key={region.value}>{region.label}</option>)}</select><ChevronDown size={18} aria-hidden="true" /></span></label>
        <label className="destination-finder-season"><span>When would you like to travel?</span><span className="finder-select"><select value={month} onChange={(event) => setMonth(event.target.value)}><option value="Any season">Any time</option>{["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((value) => <option key={value}>{value}</option>)}</select><ChevronDown size={18} aria-hidden="true" /></span></label>
        {active ? <button type="button" onClick={() => { setQuery(""); setContinent("All regions"); setMonth("Any season"); }}><X size={16} aria-hidden="true" />Clear</button> : null}
      </div>
      {active ? (
        <div className="destination-finder-results" aria-live="polite">
          {filtered.length ? filtered.map((destination) => (
            <Link href={`/destinations/${destination.slug}`} key={destination.slug}>
              <span><strong>{destination.title}</strong><small>{destination.country} · {destination.bestMonths}</small></span>
              <span>{destinationPreview(destination.wildlife)}</span>
            </Link>
          )) : <p>No exact match. Try another region, season or species, or ask us to recommend one.</p>}
        </div>
      ) : null}
    </section>
  );
}
