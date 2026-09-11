import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { getStoreCategory, getStoreProduct, storeCategories } from "@/lib/store";
import StoreMotion from "../../StoreMotion";
import "../../store.css";

type ProductPageProps = {
  params: Promise<{ category: string; product: string }>;
};

export function generateStaticParams() {
  return storeCategories.flatMap((category) =>
    category.products
      .filter((product) => !(category.slug === "books" && product.slug === "ghosts-of-the-granite-hills"))
      .map((product) => ({ category: category.slug, product: product.slug }))
  );
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { category: categorySlug, product: productSlug } = await params;
  const product = getStoreProduct(categorySlug, productSlug);

  if (!product) return {};

  return {
    title: `${product.title} | Store`,
    description: product.description,
    alternates: { canonical: `/store/${categorySlug}/${product.slug}` },
    openGraph: {
      title: product.title,
      description: product.description,
      images: [product.image.src]
    }
  };
}

export default async function StoreProductPage({ params }: ProductPageProps) {
  const { category: categorySlug, product: productSlug } = await params;
  const category = getStoreCategory(categorySlug);
  const product = getStoreProduct(categorySlug, productSlug);

  if (!category || !product) notFound();

  return (
    <div className="store-category-page">
      <StoreMotion />
      <section className="store-generic-product" aria-labelledby="store-generic-product-title">
        <div className="container">
          <nav className="store-breadcrumb" aria-label="Breadcrumb">
            <Link href="/store">Store</Link>
            <span aria-hidden="true">/</span>
            <Link href={`/store/${category.slug}`}>{category.title}</Link>
          </nav>
          <div className="store-generic-product-grid">
            <figure className="store-generic-product-media">
              <Image src={product.image.src} alt={product.image.alt} fill priority sizes="(max-width: 820px) 100vw, 44vw" />
            </figure>
            <div className="store-generic-product-copy">
              <p className="store-kicker">{product.subtitle}</p>
              <h1 id="store-generic-product-title">{product.title}</h1>
              <p>{product.description}</p>
              <dl>
                <div><dt>Format</dt><dd>{product.format}</dd></div>
                <div><dt>Price</dt><dd>{product.price}</dd></div>
              </dl>
              <Link className="store-collection-link store-collection-link-light" href={product.purchaseHref ?? "/contact"}>
                <span>{product.purchaseHref ? "Purchase" : "Enquire"}</span>
                <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
