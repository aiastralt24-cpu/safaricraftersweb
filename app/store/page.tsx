import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getFeaturedStoreProduct } from "@/lib/store";
import FieldCategories from "./FieldCategories";
import InternationalOrder from "./InternationalOrder";
import StoreMotion from "./StoreMotion";
import ShopifyBuyButton from "./ShopifyBuyButton";
import "./store.css";

export const metadata: Metadata = {
  title: "Store | Safari Crafters",
  description:
    "Books, fine-art prints and objects created through time in the field by Safari Crafters.",
  alternates: { canonical: "/store" },
  openGraph: {
    title: "Safari Crafters Store",
    description:
      "Books, fine-art prints and objects created through time in the field.",
    images: ["/assets/store/ghosts-of-the-granite-hills-book.jpg"]
  }
};

const showWiderCollection = false;

const collectionDirections = [
  { name: "Photographic books", note: "Field stories in print" },
  { name: "Fine-art prints", note: "Selected archival works" },
  { name: "Field objects", note: "Made for camp and home" },
  { name: "Limited editions", note: "Small, considered releases" }
];

export default function StoreCollectionPage() {
  const featured = getFeaturedStoreProduct();

  return (
    <div className="store-collection store-home">
      <StoreMotion />

      <section className="store-home-hero" aria-labelledby="store-home-title">
        <div className="container store-home-hero-grid">
          <div className="store-home-hero-copy">
            <p className="store-kicker">The Safari Crafters Collection</p>
            <h1 id="store-home-title">
              <span>Stories from the wild,</span>
              <span>made to keep.</span>
            </h1>
            <p>
              A growing collection of photographic books, fine-art prints and objects inspired by
              the landscapes we explore.
            </p>

            {featured ? (
              <div className="store-home-release" id="current-edition">
                <p className="store-home-release-label">Now available · Photographic book</p>
                <h2>{featured.product.title}</h2>
                <p className="store-home-release-meta">
                  {featured.product.format} <span aria-hidden="true">·</span> {featured.product.price}
                </p>
                <div className="store-home-actions">
                  <div className="store-home-purchase-actions">
                    <ShopifyBuyButton label="Order the book" showQuantity />
                    <InternationalOrder />
                  </div>
                  <Link
                    className="store-home-text-link store-home-text-link-light"
                    href={`/store/${featured.category.slug}/${featured.product.slug}`}
                  >
                    Explore the book
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ) : null}
          </div>

          {featured ? (
            <figure className="store-home-hero-media" data-reveal="image">
              <Image
                src={(featured.product.featureImage ?? featured.product.image).src}
                alt={(featured.product.featureImage ?? featured.product.image).alt}
                fill
                priority
                sizes="(max-width: 820px) 100vw, 52vw"
              />
            </figure>
          ) : null}
        </div>
      </section>

      <FieldCategories />

      {showWiderCollection ? <section className="store-home-collection" aria-labelledby="store-collection-title">
        <div className="container store-home-collection-grid" data-reveal="rise">
          <div>
            <p className="store-kicker">The wider collection</p>
            <h2 id="store-collection-title">Created through time in the wild.</h2>
            <p>
              The collection will span books, prints and objects—each carrying a story from the
              landscapes, wildlife and people we spend time with.
            </p>
          </div>
          <ul aria-label="Safari Crafters collection directions">
            {collectionDirections.map((direction) => (
              <li key={direction.name}>
                <span>{direction.name}</span>
                <small>{direction.note}</small>
              </li>
            ))}
          </ul>
        </div>
      </section> : null}
    </div>
  );
}
