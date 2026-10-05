"use client";

import { useMemo, useState } from "react";
import { JournalCard } from "@/components/Cards";
import type { JournalArticle } from "@/lib/data";

export function JournalIndex({ articles, categories }: { articles: JournalArticle[]; categories: string[] }) {
  const availableCategories = categories.filter((category) =>
    articles.some((article) => article.category === category)
  );
  const filters = ["All stories", ...availableCategories];
  const [activeCategory, setActiveCategory] = useState(filters[0]);
  const visibleArticles = useMemo(
    () => activeCategory === "All stories"
      ? articles
      : articles.filter((article) => article.category === activeCategory),
    [activeCategory, articles]
  );

  return (
    <>
      <nav className="container category-rail" aria-label="Filter journal stories">
        {filters.map((item) => (
          <button
            className={activeCategory === item ? "is-active" : ""}
            type="button"
            aria-pressed={activeCategory === item}
            onClick={() => setActiveCategory(item)}
            key={item}
          >
            {item}
          </button>
        ))}
      </nav>
      <p className="container journal-result-count" aria-live="polite">
        {visibleArticles.length} {visibleArticles.length === 1 ? "story" : "stories"} · {activeCategory}
      </p>
      <div className="container grid-3 listing-grid">
        {visibleArticles.map((article) => (
          <JournalCard key={article.slug} article={article} />
        ))}
      </div>
    </>
  );
}
