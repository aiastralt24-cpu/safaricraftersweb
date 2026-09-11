export type StoreProduct = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  price: string;
  format: string;
  image: {
    src: string;
    alt: string;
  };
};

export type StoreCategory = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  image: {
    src: string;
    alt: string;
  };
  products: StoreProduct[];
};

export const storeCategories: StoreCategory[] = [
  {
    slug: "books",
    title: "Books",
    eyebrow: "Field editions",
    description:
      "Photographic works shaped by long observation, patient fieldcraft and the landscapes that hold each story.",
    image: {
      src: "/assets/store/ghosts-of-the-granite-hills-book.jpg",
      alt: "Ghosts of the Granite Hills clothbound book resting on granite"
    },
    products: [
      {
        slug: "ghosts-of-the-granite-hills",
        title: "Ghosts of the Granite Hills",
        subtitle: "A photographic work by Kairav Engineer",
        description:
          "A decade of fieldwork distilled into 396 pages, tracing the leopards of Jawai, their granite habitat and the lives unfolding around them.",
        price: "₹3,300",
        format: "396-page clothbound hardcover",
        image: {
          src: "/assets/store/ghosts-book-cover.webp",
          alt: "Red clothbound Ghosts of the Granite Hills book displayed in an interior"
        }
      }
    ]
  }
];

export function getStoreCategory(slug: string) {
  return storeCategories.find((category) => category.slug === slug);
}

export function getStoreProduct(categorySlug: string, productSlug: string) {
  return getStoreCategory(categorySlug)?.products.find((product) => product.slug === productSlug);
}
