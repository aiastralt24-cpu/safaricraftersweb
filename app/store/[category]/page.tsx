import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStoreCategory, storeCategories } from "@/lib/store";
import StoreCategoryCollection from "../StoreCategoryCollection";
import "../store.css";

type CategoryPageProps = {
  params: Promise<{ category: string }>;
};

export function generateStaticParams() {
  return storeCategories
    .filter((category) => category.slug !== "books")
    .map((category) => ({ category: category.slug }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category: categorySlug } = await params;
  const category = getStoreCategory(categorySlug);

  if (!category) return {};

  return {
    title: `${category.title} | Store`,
    description: category.description,
    alternates: { canonical: `/store/${category.slug}` },
    openGraph: {
      title: `${category.title} | Safari Crafters Store`,
      description: category.description,
      images: [category.image.src]
    }
  };
}

export default async function StoreCategoryPage({ params }: CategoryPageProps) {
  const { category: categorySlug } = await params;
  const category = getStoreCategory(categorySlug);

  if (!category) notFound();

  return <StoreCategoryCollection category={category} />;
}
