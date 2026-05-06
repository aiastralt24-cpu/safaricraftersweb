import { createClient } from "@sanity/client";
import content from "../content/site-content.json" with { type: "json" };

const projectId = process.env.SANITY_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.SANITY_DATASET || process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const token = process.env.SANITY_WRITE_TOKEN;

if (!projectId || !token) {
  console.error("Set SANITY_PROJECT_ID/NEXT_PUBLIC_SANITY_PROJECT_ID and SANITY_WRITE_TOKEN before seeding.");
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  token,
  apiVersion: "2026-05-02",
  useCdn: false
});

const docs = [
  {
    _id: "homepage",
    _type: "homepage",
    title: "Where the wild still breathes freely.",
    copy: "Bespoke wildlife journeys, private safaris and photography-led expeditions across India, Africa, the Arctic and South America.",
    heroMedia: {
      type: "video",
      posterImage: content.heroImage,
      mobilePosterImage: content.heroImage,
      alt: content.heroImage.alt,
      credit: content.heroImage.credit
    }
  },
  ...content.destinations.map((item) => ({
    _id: `destination-${item.slug}`,
    _type: "destination",
    ...item,
    slug: { _type: "slug", current: item.slug }
  })),
  ...content.journeys.map((item) => ({
    _id: `journey-${item.slug}`,
    _type: "journey",
    ...item,
    slug: { _type: "slug", current: item.slug }
  })),
  ...content.expeditions.map((item) => ({
    _id: `photoExpedition-${item.slug}`,
    _type: "photoExpedition",
    ...item,
    slug: { _type: "slug", current: item.slug }
  })),
  ...content.journal.map((item) => ({
    _id: `journalArticle-${item.slug}`,
    _type: "journalArticle",
    ...item,
    slug: { _type: "slug", current: item.slug }
  })),
  ...content.specialists.map((item) => ({
    _id: `specialist-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    _type: "specialist",
    ...item
  })),
  ...content.testimonials.map((item, index) => ({
    _id: `testimonial-${index + 1}`,
    _type: "testimonial",
    ...item
  }))
];

const transaction = client.transaction();
for (const doc of docs) transaction.createOrReplace(doc);

await transaction.commit();
console.log(`Seeded ${docs.length} Sanity documents into ${projectId}/${dataset}.`);
