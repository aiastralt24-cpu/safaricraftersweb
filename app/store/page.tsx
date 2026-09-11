import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { getFeaturedStoreProduct, storeCategories } from "@/lib/store";
import StoreMotion from "./StoreMotion";
import "./store.css";

export const metadata: Metadata = {
  title: "Store | Safari Crafters",
  description:
    "Browse Safari Crafters books and field-led editions, organised by product category.",
  alternates: { canonical: "/store" },
  openGraph: {
    title: "Safari Crafters Store",
    description: "Books and field-led editions shaped by wildlife, place and long observation.",
    images: ["/assets/store/ghosts-of-the-granite-hills-book.jpg"]
  }
};

export default function StoreCollectionPage() {
  const featured = getFeaturedStoreProduct();

  return (
    <div className="store-collection">
      <StoreMotion />

      <section className="store-collection-hero" aria-labelledby="store-collection-title">
        <div className="container store-collection-hero-grid">
          <div className="store-collection-hero-copy">
            <p className="store-kicker">Safari Crafters Store</p>
            <h1 id="store-collection-title">Objects from<br /><span>the field.</span></h1>
            <p>
              A growing catalogue of books and field-led editions, organised by category and
              shaped by the landscapes, encounters and observations behind our work.
            </p>
            <Link className="store-collection-link store-collection-link-light" href="#store-categories">
              <span>Browse categories</span>
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
          {featured ? (
            <figure className="store-collection-hero-media" data-reveal="image">
              <Image
                src={(featured.product.featureImage ?? featured.product.image).src}
                alt={(featured.product.featureImage ?? featured.product.image).alt}
                fill
                priority
                sizes="(max-width: 820px) 100vw, 50vw"
              />
              <figcaption>Featured release · {featured.category.title}</figcaption>
            </figure>
          ) : null}
        </div>
      </section>

      <section className="store-categories" id="store-categories" aria-labelledby="store-categories-title">
        <div className="container">
          <header className="store-collection-heading" data-reveal="rise">
            <p className="store-section-label">Store catalogue</p>
            <div>
              <p className="store-kicker">Shop by category</p>
              <h2 id="store-categories-title">Browse the catalogue.</h2>
            </div>
          </header>

          <div className={`store-category-list${storeCategories.length === 1 ? " is-single" : ""}`}>
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
                    <span>{category.products.length} {category.products.length === 1 ? "product" : "products"}</span>
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

      {featured ? (
        <section className="store-current-release" aria-labelledby="store-release-title">
          <div className="container store-current-release-grid">
            <div data-reveal="rise">
              <p className="store-kicker">Featured product · {featured.category.title}</p>
              <h2 id="store-release-title">{featured.product.title}</h2>
            </div>
            <div data-reveal="rise">
              <p>{featured.product.description}</p>
              <Link className="store-collection-link store-collection-link-light" href={`/store/${featured.category.slug}/${featured.product.slug}`}>
                <span>View product</span>
                <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
