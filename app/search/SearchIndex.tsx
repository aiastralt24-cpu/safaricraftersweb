"use client";

import Link from "next/link";
import { ArrowUpRight, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

export type SearchItem = {
  title: string;
  href: string;
  type: "Journey" | "Destination" | "Photo Expedition" | "Journal";
  detail?: string;
};

const categories = ["All", "Journey", "Destination", "Photo Expedition", "Journal"] as const;
type SearchCategory = (typeof categories)[number];

const categoryLabels: Record<SearchCategory, string> = {
  All: "All",
  Journey: "Journeys",
  Destination: "Destinations",
  "Photo Expedition": "Photo expeditions",
  Journal: "Journal"
};

const initialVisible = 6;

export function SearchIndex({ items }: { items: SearchItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SearchCategory>("All");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return items.filter((item) => {
      const matchesCategory = category === "All" || item.type === category;
      const matchesQuery = !term || `${item.title} ${item.detail ?? ""} ${item.type}`.toLocaleLowerCase().includes(term);
      return matchesCategory && matchesQuery;
    });
  }, [category, items, query]);

  const groups = useMemo(() => categories.slice(1).map((type) => ({
    type,
    items: filtered.filter((item) => item.type === type)
  })).filter((group) => group.items.length), [filtered]);

  const clearSearch = () => {
    setQuery("");
    setCategory("All");
    setExpanded({});
  };

  return (
    <div className="search-library">
      <label className="search-field">
        <span>What are you looking for?</span>
        <span className="search-field-control">
          <Search aria-hidden="true" size={20} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tiger, Jawai, winter, photography..."
            autoComplete="off"
          />
          {query ? <button type="button" aria-label="Clear search" onClick={() => setQuery("")}><X aria-hidden="true" size={18} /></button> : null}
        </span>
      </label>

      <div className="search-filter-block">
        <p>Browse by collection</p>
        <div className="search-filters" role="group" aria-label="Filter the Safari Crafters library">
          {categories.map((item) => (
            <button
              type="button"
              className={category === item ? "is-active" : ""}
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
              key={item}
            >
              {categoryLabels[item]}
            </button>
          ))}
        </div>
      </div>

      <div className="search-summary" aria-live="polite">
        <span>{filtered.length} {filtered.length === 1 ? "result" : "results"}</span>
        {(query || category !== "All") ? <button type="button" onClick={clearSearch}>Clear filters</button> : null}
      </div>

      {groups.length ? <div className="search-groups">
        {groups.map((group) => {
          const isExpanded = expanded[group.type] || Boolean(query);
          const visibleItems = isExpanded ? group.items : group.items.slice(0, initialVisible);
          return <section className="search-group" aria-labelledby={`search-${group.type.replaceAll(" ", "-").toLowerCase()}`} key={group.type}>
            <header>
              <h2 id={`search-${group.type.replaceAll(" ", "-").toLowerCase()}`}>{categoryLabels[group.type]}</h2>
              <span>{group.items.length}</span>
            </header>
            <div className="search-results">
              {visibleItems.map((item) => <Link href={item.href} className="search-result" key={item.href}>
                <span>
                  <small>{item.detail || item.type}</small>
                  <strong>{item.title}</strong>
                </span>
                <ArrowUpRight aria-hidden="true" size={19} />
              </Link>)}
            </div>
            {!query && group.items.length > initialVisible ? <button
              className="search-show-more"
              type="button"
              aria-expanded={Boolean(expanded[group.type])}
              onClick={() => setExpanded((current) => ({ ...current, [group.type]: !current[group.type] }))}
            >
              {expanded[group.type] ? "Show fewer" : `Show all ${group.items.length}`}
            </button> : null}
          </section>;
        })}
      </div> : <div className="search-empty">
        <p className="eyebrow">No exact match</p>
        <h2>The right journey may not have a name yet.</h2>
        <p>Try a broader place or wildlife term, or speak with us about what you hope to encounter.</p>
        <Link href="/plan">Begin planning <ArrowUpRight aria-hidden="true" size={17} /></Link>
      </div>}
    </div>
  );
}
