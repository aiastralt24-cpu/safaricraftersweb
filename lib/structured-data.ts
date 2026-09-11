import type { Destination, Expedition, FAQItem, JournalArticle, Journey, Specialist } from "@/lib/data";
import { isApprovedEditorialImage } from "@/lib/media";

export const siteUrl = "https://safaricrafters.com";

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "Safari Crafters",
        url: siteUrl,
        description: "Private, photography-led safari journeys across India, Africa and other wild places."
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "Safari Crafters",
        publisher: { "@id": `${siteUrl}/#organization` },
        inLanguage: "en"
      }
    ]
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${siteUrl}${item.path}`
    }))
  };
}

export function faqSchema(faqs: FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer }
    }))
  };
}

export function destinationSchema(destination: Destination) {
  return {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name: destination.title,
    description: destination.description,
    url: `${siteUrl}/destinations/${destination.slug}`,
    image: isApprovedEditorialImage(destination.image) ? `${siteUrl}${destination.image.src}` : undefined,
    containedInPlace: { "@type": "Country", name: destination.country },
    touristType: destination.bestFor
  };
}

export function journeySchema(journey: Journey) {
  return {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: journey.title,
    description: journey.description,
    url: `${siteUrl}/journeys/${journey.slug}`,
    image: `${siteUrl}${journey.image.src}`,
    itinerary: journey.route || journey.destinations.join(" - "),
    provider: { "@id": `${siteUrl}/#organization` },
    touristType: journey.idealGuest || journey.category
  };
}

export function expeditionSchema(expedition: Expedition) {
  return {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: expedition.title,
    description: expedition.description,
    url: `${siteUrl}/photo-expeditions/${expedition.slug}`,
    image: `${siteUrl}${expedition.image.src}`,
    itinerary: expedition.route,
    provider: { "@id": `${siteUrl}/#organization` },
    touristType: expedition.skill,
    offers: expedition.price ? { "@type": "Offer", priceSpecification: { "@type": "PriceSpecification", description: expedition.price } } : undefined
  };
}

export function personSchema(specialist: Specialist) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: specialist.name,
    jobTitle: specialist.role,
    description: specialist.bio,
    image: `${siteUrl}${specialist.image.src}`,
    worksFor: { "@id": `${siteUrl}/#organization` },
    knowsAbout: specialist.expertise
  };
}

export function articleSchema(article: JournalArticle) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    url: `${siteUrl}/journal/${article.slug}`,
    image: `${siteUrl}${article.image.src}`,
    datePublished: new Date(article.date).toISOString(),
    dateModified: new Date(article.date).toISOString(),
    author: { "@type": "Organization", name: article.author, url: siteUrl },
    publisher: { "@id": `${siteUrl}/#organization` },
    articleSection: article.category,
    inLanguage: "en"
  };
}

export function productSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Ghosts of the Granite Hills",
    url: `${siteUrl}/store/books/ghosts-of-the-granite-hills`,
    description: "A decade in the making, Kairav Engineer's 396-page photographic natural history traces the leopards, habitat and inhabitants of Jawai.",
    image: `${siteUrl}/assets/store/ghosts-book-cover.webp`,
    brand: { "@type": "Brand", name: "Safari Crafters" },
    author: { "@type": "Person", name: "Kairav Engineer" },
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: "3300",
      url: "https://www.store.safaricrafters.com/products/the-ghosts-of-the-granite-hills"
    }
  };
}
