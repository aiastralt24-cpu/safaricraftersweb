import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getStoreCategory } from "@/lib/store";
import StoreMotion from "../StoreMotion";
import "../store.css";

const books = getStoreCategory("books")!;

export const metadata: Metadata = {
  title: "Books | Store",
  description: books.description,
  alternates: { canonical: "/store/books" },
  openGraph: {
    title: "Books | Safari Crafters Store",
    description: books.description,
    images: [books.image.src]
  }
};

export default function BooksCategoryPage() {
  return (
    <div className="store-category-page">
      <StoreMotion />

      <section className="store-category-hero" aria-labelledby="books-title">
        <div className="container store-category-hero-grid">
          <div>
            <nav className="store-breadcrumb store-breadcrumb-light" aria-label="Breadcrumb">
              <Link href="/store">Store</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">Books</span>
            </nav>
            <p className="store-kicker">{books.eyebrow}</p>
            <h1 id="books-title">Books</h1>
          </div>
          <p>{books.description}</p>
        </div>
      </section>

      <section className="store-product-index" aria-labelledby="book-collection-title">
        <div className="container">
          <header className="store-product-index-heading" data-reveal="rise">
            <p className="store-section-label">Available titles</p>
            <h2 id="book-collection-title">The book collection.</h2>
          </header>

          <div className="store-product-grid">
            {books.products.map((product) => (
              <article className="store-product-card" key={product.slug} data-reveal="rise">
                <Link className="store-product-card-media" href={`/store/books/${product.slug}`} aria-label={`View ${product.title}`}>
                  <Image
                    src={product.image.src}
                    alt={product.image.alt}
                    fill
                    loading="lazy"
                    sizes="(max-width: 720px) 100vw, 42vw"
                  />
                </Link>
                <div className="store-product-card-copy">
                  <p className="store-kicker">{product.subtitle}</p>
                  <h3><Link href={`/store/books/${product.slug}`}>{product.title}</Link></h3>
                  <p>{product.description}</p>
                  <dl>
                    <div><dt>Format</dt><dd>{product.format}</dd></div>
                    <div><dt>Price</dt><dd>{product.price}</dd></div>
                  </dl>
                  <Link className="store-collection-link" href={`/store/books/${product.slug}`}>
                    <span>View product</span>
                    <ArrowUpRight size={17} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
