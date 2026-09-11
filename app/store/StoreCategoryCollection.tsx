import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { StoreCategory } from "@/lib/store";
import StoreMotion from "./StoreMotion";

export default function StoreCategoryCollection({ category }: { category: StoreCategory }) {
  return (
    <div className="store-category-page">
      <StoreMotion />

      <section className="store-category-hero" aria-labelledby={`${category.slug}-title`}>
        <div className="container store-category-hero-grid">
          <div>
            <nav className="store-breadcrumb store-breadcrumb-light" aria-label="Breadcrumb">
              <Link href="/store">Store</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{category.title}</span>
            </nav>
            <p className="store-kicker">{category.eyebrow}</p>
            <h1 id={`${category.slug}-title`}>{category.title}</h1>
          </div>
          <p>{category.description}</p>
        </div>
      </section>

      <section className="store-product-index" aria-labelledby={`${category.slug}-collection-title`}>
        <div className="container">
          <header className="store-product-index-heading" data-reveal="rise">
            <p className="store-section-label">{category.availableLabel}</p>
            <h2 id={`${category.slug}-collection-title`}>{category.collectionHeading}</h2>
          </header>

          <div className={`store-product-grid${category.products.length === 1 ? " is-single" : ""}`}>
            {category.products.map((product) => (
              <article className="store-product-card" key={product.slug} data-reveal="rise">
                <Link className="store-product-card-media" href={`/store/${category.slug}/${product.slug}`} aria-label={`View ${product.title}`}>
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
                  <h3><Link href={`/store/${category.slug}/${product.slug}`}>{product.title}</Link></h3>
                  <p>{product.description}</p>
                  <dl>
                    <div><dt>Format</dt><dd>{product.format}</dd></div>
                    <div><dt>Price</dt><dd>{product.price}</dd></div>
                  </dl>
                  <Link className="store-collection-link" href={`/store/${category.slug}/${product.slug}`}>
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
