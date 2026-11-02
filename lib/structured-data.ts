import type { Destination, Expedition, FAQItem, JournalArticle, Journey, Specialist } from "@/lib/data";
import { isApprovedEditorialImage } from "@/lib/media";
import { bookOffer } from "@/lib/store";

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
    image: isApprovedEditorialImage(destination.image) ? new URL(destination.image.src, siteUrl).href : undefined,
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
    image: new URL(journey.image.src, siteUrl).href,
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
    image: new URL(expedition.image.src, siteUrl).href,
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
    image: new URL(specialist.image.src, siteUrl).href,
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
    image: new URL(article.image.src, siteUrl).href,
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
    author: [
      { "@type": "Person", name: "Kairav Engineer" },
      { "@type": "Person", name: "Gaurav Ramnarayanan" },
      { "@type": "Person", name: "Yashwant Singh Ranawat" },
    ],
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: String(bookOffer.amount),
      url: "https://www.store.safaricrafters.com/products/the-ghosts-of-the-granite-hills"
    }
  };
}
