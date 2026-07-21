import type { Destination, FAQItem, Journey } from "@/lib/data";

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
    image: `${siteUrl}${destination.image.src}`,
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
