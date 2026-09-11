import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { storeCategories } from "@/lib/store";
import StoreMotion from "./StoreMotion";
import "./store.css";

export const metadata: Metadata = {
  title: "Store | Field Editions",
  description:
    "Explore Safari Crafters books and field editions shaped by wildlife, place and long observation.",
  alternates: { canonical: "/store" },
  openGraph: {
    title: "Safari Crafters Store",
    description: "Books and field editions shaped by wildlife, place and long observation.",
    images: ["/assets/store/ghosts-of-the-granite-hills-book.jpg"]
  }
};

export default function StoreCollectionPage() {
  const featuredCategory = storeCategories[0];
  const featuredProduct = featuredCategory.products[0];

  return (
    <div className="store-collection">
      <StoreMotion />

      <section className="store-collection-hero" aria-labelledby="store-collection-title">
        <div className="container store-collection-hero-grid">
          <div className="store-collection-hero-copy">
            <p className="store-kicker">Safari Crafters Store</p>
            <h1 id="store-collection-title">The field,<br /><span>carried home.</span></h1>
            <p>
              A considered collection of Safari Crafters editions, created from the landscapes,
              encounters and patient observation that shape our work.
            </p>
            <Link className="store-collection-link store-collection-link-light" href="#store-categories">
              <span>Browse the collection</span>
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
          <figure className="store-collection-hero-media" data-reveal="image">
            <Image
              src="/assets/store/ghosts-of-the-granite-hills-lifestyle.jpg"
              alt="Ghosts of the Granite Hills book arranged as a Safari Crafters field edition"
              fill
              priority
              sizes="(max-width: 820px) 100vw, 50vw"
            />
            <figcaption>The collection begins with Books</figcaption>
          </figure>
        </div>
      </section>

      <section className="store-categories" id="store-categories" aria-labelledby="store-categories-title">
        <div className="container">
          <header className="store-collection-heading" data-reveal="rise">
            <p className="store-section-label">The collection</p>
            <div>
              <p className="store-kicker">Browse by category</p>
              <h2 id="store-categories-title">Editions with a life beyond the journey.</h2>
            </div>
          </header>

          <div className="store-category-list">
            {storeCategories.map((category, index) => (
              <article className="store-category-card" key={category.slug} data-reveal="rise">
                <Link className="store-category-media" href={`/store/${category.slug}`} aria-label={`Explore ${category.title}`}>
                  <Image
                    src={category.image.src}
                    alt={category.image.alt}
                    fill
                    loading="lazy"
                    sizes="(max-width: 820px) 100vw, 48vw"
                  />
                </Link>
                <div className="store-category-copy">
                  <p className="store-category-index">{String(index + 1).padStart(2, "0")} · {category.eyebrow}</p>
                  <h3><Link href={`/store/${category.slug}`}>{category.title}</Link></h3>
                  <p>{category.description}</p>
                  <div className="store-category-meta">
                    <span>{category.products.length} {category.products.length === 1 ? "title" : "titles"}</span>
                    <Link href={`/store/${category.slug}`} aria-label={`View all ${category.title}`}>
                      Explore category <ArrowUpRight size={16} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="store-current-release" aria-labelledby="store-release-title">
        <div className="container store-current-release-grid">
          <div data-reveal="rise">
            <p className="store-kicker">Current release · {featuredCategory.title}</p>
            <h2 id="store-release-title">{featuredProduct.title}</h2>
          </div>
          <div data-reveal="rise">
            <p>{featuredProduct.description}</p>
            <Link className="store-collection-link store-collection-link-light" href={`/store/${featuredCategory.slug}/${featuredProduct.slug}`}>
              <span>View the book</span>
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
