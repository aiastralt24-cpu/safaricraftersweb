import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import "./store.css";

const bookImage = {
  src: "/assets/store/ghosts-of-the-granite-hills-book.jpg",
  alt: "Ghosts of the Granite Hills red clothbound collector's photobook on granite stone"
};

const storeProductHref =
  "https://www.store.safaricrafters.com/products/the-ghosts-of-the-granite-hills";

const editionDetails = [
  ["Edition", "2,000 signed and numbered copies"],
  ["Extent", "396-page clothbound hardcover"],
  ["Price", "₹3,300"],
  ["Subject", "Jawai, leopards and the culture of coexistence"]
];

const objectDetails = [
  "Deep red clothbound collector's edition",
  "Photographic study of Jawai's granite hills and leopards",
  "Foreword by Jonathan and Angela Scott",
  "Suited to private libraries, galleries and institutions"
];

const makers = [
  ["Kairav Engineer", "Author and photographer"],
  ["Safari Crafters", "Exclusive seller and publisher"],
  ["Jonathan and Angela Scott", "Foreword"]
];

export const metadata: Metadata = {
  title: "Store",
  description:
    "Ghosts of the Granite Hills, a signed collector's photobook by Kairav Engineer, published by Safari Crafters."
};

export default function StorePage() {
  return (
    <>
      <section className="store-hero" aria-label="Ghosts of the Granite Hills collector's edition">
        <div className="container store-hero-grid">
          <div className="store-hero-copy">
            <p className="eyebrow">Safari Crafters Store</p>
            <h1>Ghosts of the Granite Hills</h1>
            <p className="store-hero-intro">
              A signed collector's photobook by Kairav Engineer, published by Safari Crafters,
              studying Jawai's granite hills, its leopards and the rare culture of coexistence
              that holds them together.
            </p>
            <div className="store-actions">
              <Link className="button button-solid" href={storeProductHref}>
                Buy From Official Store
              </Link>
              <span>Available only through the official Safari Crafters Store.</span>
            </div>
          </div>
          <figure className="store-hero-media">
            <Image
              src={bookImage.src}
              alt={bookImage.alt}
              width={1600}
              height={1193}
              priority
              sizes="(max-width: 920px) 100vw, 52vw"
            />
            <figcaption>Edition of 2,000 · Signed and numbered · ₹3,300</figcaption>
          </figure>
        </div>
      </section>

      <section className="section store-edition">
        <div className="container store-split">
          <div>
            <p className="eyebrow">Collector's Edition</p>
            <h2 className="h2">A finite work for people who collect with patience.</h2>
          </div>
          <div className="store-detail-panel">
            {editionDetails.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section store-book">
        <div className="container store-book-grid">
          <div className="store-book-copy">
            <p className="eyebrow">The Book</p>
            <h2 className="h2">Jawai is not explained by spectacle. It is revealed by restraint.</h2>
            <p>
              The book follows the granite country of Jawai with the same patience required in the
              field: slow observation, respect for local rhythm and attention to the quiet relationship
              between leopards, stone and pastoral life.
            </p>
            <p>
              It is intended less as a travel souvenir and more as a permanent object: a photographic
              record for homes, archives, private libraries and institutions that understand wilderness
              as culture, not scenery.
            </p>
          </div>
          <div className="store-object-list" aria-label="Object details">
            {objectDetails.map((item, index) => (
              <article key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{item}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section store-makers">
        <div className="container store-makers-grid">
          <div>
            <p className="eyebrow">Provenance</p>
            <h2 className="h2">Authored in the field. Published with quiet intent.</h2>
          </div>
          <div className="store-makers-list">
            {makers.map(([name, role], index) => (
              <article key={name}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{name}</h3>
                  <p>{role}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section store-request" aria-label="Purchase through Safari Crafters">
        <div className="container store-request-card">
          <p className="eyebrow">Exclusive Store Release</p>
          <h2>Available directly through Safari Crafters.</h2>
          <p>
            Ghosts of the Granite Hills is sold exclusively through the official Safari Crafters
            Store, where guests and collectors can view the product listing and complete their
            purchase securely.
          </p>
          <Link className="button button-solid" href={storeProductHref}>
            Buy From Official Store <ArrowUpRight size={15} />
          </Link>
        </div>
      </section>
    </>
  );
}
