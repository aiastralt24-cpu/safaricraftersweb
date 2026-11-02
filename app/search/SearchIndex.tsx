"use client";

import type {GlobalSettings} from '@/lib/cms/global-settings';
import {searchCategories} from '@/lib/cms/search-policy';
import Link from "next/link";
import { ArrowUpRight, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

export type {SiteSearchItem as SearchItem} from '@/lib/site-search';
import type {SiteSearchItem as SearchItem} from '@/lib/site-search';
import {filterSiteSearch} from '@/lib/site-search';

const categories = ["All", "Journey", "Destination", "Photography Tours", "Journal", "Page", "Project", "News", "Event", "Leadership", "Application", "Location", "Career", "Certification", "Partner", "Product category", "Product"] as const;
type SearchCategory = (typeof categories)[number];

const categoryLabels: Record<SearchCategory, string> = {
  All: "All",
  Journey: "Journeys",
  Destination: "Destinations",
  "Photography Tours": "Photography Tours",
  Journal: "Journal",
  Page: "Pages",
  Project: "Projects",
  News: "News",
  Event: "Events", Leadership: "Leadership", Application: "Applications and industries", Location: "Locations", Career: "Careers", Certification: "Certifications", Partner: "Partners", "Product category": "Product categories", Product: "Products"
};

const initialVisible = 6;

export function SearchIndex({ items,settings }: { items: SearchItem[];settings?:GlobalSettings['search'] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SearchCategory>("All");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const allowed=settings?searchCategories(settings):undefined;
  const visibleCategories=categories.filter(item=>item==='All'||((!allowed||allowed.includes(item))&&(!['Project','News','Event','Leadership','Application','Location','Career','Certification','Partner','Product category','Product'].includes(item)||items.some(row=>row.type===item))));
  const effectiveCategory=visibleCategories.includes(category)?category:'All';
  const filtered = filterSiteSearch(allowed?items.filter(item=>allowed.includes(item.type)):items,query,effectiveCategory);

  const groups = useMemo(() => categories.slice(1).map((type) => ({
    type,
    items: filtered.filter((item) => item.type === type)
  })).filter((group) => group.items.length), [filtered]);

  const clearSearch = () => {
    setQuery("");
    setCategory("All");
    setExpanded({});
  };

  if(settings&&!settings.enabled)return null;
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
            placeholder={settings?.placeholder??"Tiger, Jawai, winter, photography..."}
            autoComplete="off"
          />
          {query ? <button type="button" aria-label="Clear search" onClick={() => setQuery("")}><X aria-hidden="true" size={18} /></button> : null}
        </span>
      </label>

      <div className="search-filter-block">
        <p>Browse by collection</p>
        <div className="search-filters" role="group" aria-label="Filter the Safari Crafters library">
          {visibleCategories.map((item) => (
            <button
              type="button"
              className={effectiveCategory === item ? "is-active" : ""}
              aria-pressed={effectiveCategory === item}
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
              {visibleItems.map((item) => {const ResultLink=['Project','News','Event','Leadership','Application','Location','Career','Certification','Partner','Product category','Product'].includes(item.type)?'a':Link;return <ResultLink href={item.href} className="search-result" key={item.href}>
                <span>
                  <small>{item.detail || item.type}</small>
                  <strong>{item.title}</strong>
                </span>
                <ArrowUpRight aria-hidden="true" size={19} />
              </ResultLink>;})}
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
        <h2>{settings?.emptyMessage??"The right journey may not have a name yet."}</h2>
        <p>Try a broader place or wildlife term, or speak with us about what you hope to encounter.</p>
        <Link href="/plan">Begin planning <ArrowUpRight aria-hidden="true" size={17} /></Link>
      </div>}
    </div>
  );
}
