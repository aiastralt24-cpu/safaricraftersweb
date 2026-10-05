import type { Metadata } from "next";
import { getStoreCategory } from "@/lib/store";
import StoreCategoryCollection from "../StoreCategoryCollection";
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
  return <StoreCategoryCollection category={books} />;
}
