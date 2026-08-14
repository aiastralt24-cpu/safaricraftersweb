import { defineArrayMember, defineField, defineType } from "sanity";

const imageAsset = defineType({
  name: "imageAsset",
  title: "Image asset",
  type: "object",
  fields: [
    defineField({ name: "src", title: "Local or CDN URL", type: "string" }),
    defineField({ name: "alt", title: "Alt text", type: "string" }),
    defineField({ name: "credit", title: "Credit", type: "string" })
  ]
});

const heroMedia = defineType({
  name: "heroMedia",
  title: "Hero media",
  type: "object",
  fields: [
    defineField({
      name: "type",
      title: "Type",
      type: "string",
      options: { list: ["video", "image"], layout: "radio" },
      initialValue: "video"
    }),
    defineField({ name: "videoMp4", title: "MP4 URL", type: "url" }),
    defineField({ name: "videoWebm", title: "WebM URL", type: "url" }),
    defineField({ name: "posterImage", title: "Poster image", type: "imageAsset" }),
    defineField({ name: "mobilePosterImage", title: "Mobile poster image", type: "imageAsset" }),
    defineField({ name: "alt", title: "Accessible description", type: "string" }),
    defineField({ name: "credit", title: "Credit", type: "string" })
  ]
});

const editorialVideo = defineType({
  name: "editorialVideo",
  title: "Editorial video",
  type: "object",
  fields: [
    defineField({ name: "mp4", title: "MP4 URL", type: "url", validation: (rule) => rule.required() }),
    defineField({ name: "webm", title: "WebM URL", type: "url" }),
    defineField({ name: "poster", title: "Poster image", type: "imageAsset", validation: (rule) => rule.required() }),
    defineField({ name: "title", title: "Accessible title", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "caption", title: "Visible caption", type: "text", rows: 2 }),
    defineField({ name: "transcript", title: "Transcript", type: "text", rows: 8 })
  ]
});

const dayPlan = defineType({
  name: "dayPlan",
  title: "Day plan",
  type: "object",
  fields: [
    defineField({ name: "title", title: "Title", type: "string" }),
    defineField({ name: "copy", title: "Copy", type: "text" }),
    defineField({ name: "stay", title: "Stay", type: "string" })
  ]
});

const fieldIntelligence = defineType({
  name: "fieldIntelligence",
  title: "Field intelligence",
  type: "object",
  fields: [
    defineField({ name: "airport", title: "Nearest airport", type: "string" }),
    defineField({ name: "transfer", title: "Transfer guidance", type: "text" }),
    defineField({ name: "idealStay", title: "Ideal stay", type: "string" }),
    defineField({ name: "safariRhythm", title: "Safari rhythm", type: "text" }),
    defineField({ name: "accessNote", title: "Access note", type: "text" })
  ]
});

const faqItem = defineType({
  name: "faqItem",
  title: "Traveller question",
  type: "object",
  fields: [
    defineField({ name: "question", title: "Question", type: "string" }),
    defineField({ name: "answer", title: "Direct answer", type: "text", rows: 3 })
  ]
});

const destinationPairing = defineType({
  name: "destinationPairing",
  title: "Destination pairing",
  type: "object",
  fields: [
    defineField({ name: "slug", title: "Destination slug", type: "string" }),
    defineField({ name: "title", title: "Destination name", type: "string" }),
    defineField({ name: "reason", title: "Why it pairs well", type: "text", rows: 2 })
  ]
});

const seoFields = defineType({
  name: "seoFields",
  title: "Search and answer-engine fields",
  type: "object",
  fields: [
    defineField({ name: "title", title: "Search title", type: "string", validation: (rule) => rule.max(65) }),
    defineField({ name: "description", title: "Search description", type: "text", rows: 3, validation: (rule) => rule.max(165) }),
    defineField({ name: "reviewedAt", title: "Fact review date", type: "date" })
  ]
});

const researchSource = defineType({
  name: "researchSource",
  title: "Research source",
  type: "object",
  fields: [
    defineField({ name: "title", title: "Source title", type: "string" }),
    defineField({ name: "publisher", title: "Publisher", type: "string" }),
    defineField({ name: "url", title: "Source URL", type: "url" }),
    defineField({ name: "accessedAt", title: "Accessed on", type: "date" })
  ]
});

const homepage = defineType({
  name: "homepage",
  title: "Homepage",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Hero title", type: "string" }),
    defineField({ name: "copy", title: "Hero copy", type: "text" }),
    defineField({ name: "heroMedia", title: "Hero media", type: "heroMedia" }),
    defineField({ name: "proof", title: "Proof points", type: "array", of: [defineArrayMember({ type: "string" })] }),
    defineField({ name: "atelier", title: "Atelier pillars", type: "array", of: [defineArrayMember({ type: "text" })] })
  ]
});

const destination = defineType({
  name: "destination",
  title: "Destination",
  type: "document",
  fields: [
    defineField({ name: "slug", title: "Slug", type: "slug", options: { source: "title" } }),
    defineField({ name: "title", title: "Title", type: "string" }),
    defineField({ name: "region", title: "Region", type: "string" }),
    defineField({ name: "bestMonths", title: "Best months", type: "string" }),
    defineField({ name: "wildlife", title: "Wildlife signature", type: "text" }),
    defineField({ name: "photography", title: "Photography notes", type: "text" }),
    defineField({ name: "description", title: "Description", type: "text" }),
    defineField({ name: "intro", title: "Intro", type: "text" }),
    defineField({ name: "image", title: "Hero image", type: "imageAsset" }),
    defineField({ name: "gallery", title: "Gallery", type: "array", of: [defineArrayMember({ type: "imageAsset" })] }),
    defineField({ name: "video", title: "Destination film", type: "editorialVideo" }),
    defineField({ name: "fieldIntelligence", title: "Field intelligence", type: "fieldIntelligence" })
    ,defineField({ name: "habitat", title: "Habitats", type: "text" })
    ,defineField({ name: "idealStay", title: "Ideal stay", type: "string" })
    ,defineField({ name: "gateway", title: "Practical gateway", type: "string" })
    ,defineField({ name: "access", title: "Access guidance", type: "text" })
    ,defineField({ name: "safariRhythm", title: "Safari rhythm", type: "text" })
    ,defineField({ name: "pairings", title: "Recommended pairings", type: "array", of: [defineArrayMember({ type: "destinationPairing" })] })
    ,defineField({ name: "faqs", title: "Traveller questions", type: "array", of: [defineArrayMember({ type: "faqItem" })], validation: (rule) => rule.max(5) })
    ,defineField({ name: "seo", title: "SEO / AEO / GEO", type: "seoFields" })
    ,defineField({ name: "sources", title: "Research sources", type: "array", of: [defineArrayMember({ type: "researchSource" })] })
  ]
});

const journey = defineType({
  name: "journey",
  title: "Journey",
  type: "document",
  fields: [
    defineField({ name: "slug", title: "Slug", type: "slug", options: { source: "title" } }),
    defineField({ name: "title", title: "Title", type: "string" }),
    defineField({ name: "category", title: "Category", type: "string" }),
    defineField({ name: "region", title: "Region", type: "string" }),
    defineField({ name: "duration", title: "Duration", type: "string" }),
    defineField({ name: "bestMonths", title: "Best months", type: "string" }),
    defineField({ name: "route", title: "Route", type: "string" }),
    defineField({ name: "specialist", title: "Specialist", type: "string" }),
    defineField({ name: "description", title: "Description", type: "text" }),
    defineField({ name: "intro", title: "Intro", type: "text" }),
    defineField({ name: "image", title: "Hero image", type: "imageAsset" }),
    defineField({ name: "gallery", title: "Gallery", type: "array", of: [defineArrayMember({ type: "imageAsset" })] }),
    defineField({ name: "video", title: "Journey film", type: "editorialVideo" }),
    defineField({ name: "highlights", title: "Highlights", type: "array", of: [defineArrayMember({ type: "string" })] }),
    defineField({ name: "days", title: "Day by day", type: "array", of: [defineArrayMember({ type: "dayPlan" })] })
    ,defineField({ name: "style", title: "Journey style", type: "string" })
    ,defineField({ name: "idealGuest", title: "Ideal guest", type: "text" })
    ,defineField({ name: "pace", title: "Pace", type: "text" })
    ,defineField({ name: "accommodation", title: "Accommodation character", type: "text" })
    ,defineField({ name: "wildlifeFocus", title: "Wildlife focus", type: "text" })
    ,defineField({ name: "accessApproach", title: "Access approach", type: "text" })
    ,defineField({ name: "customizationNote", title: "Customisation note", type: "text" })
    ,defineField({ name: "faqs", title: "Journey questions", type: "array", of: [defineArrayMember({ type: "faqItem" })], validation: (rule) => rule.max(5) })
    ,defineField({ name: "seo", title: "SEO / AEO / GEO", type: "seoFields" })
  ]
});

const expedition = defineType({
  name: "photoExpedition",
  title: "Photo expedition",
  type: "document",
  fields: [
    defineField({ name: "slug", title: "Slug", type: "slug", options: { source: "title" } }),
    defineField({ name: "title", title: "Title", type: "string" }),
    defineField({ name: "date", title: "Date", type: "string" }),
    defineField({ name: "mentor", title: "Mentor", type: "string" }),
    defineField({ name: "guide", title: "Guide", type: "string" }),
    defineField({ name: "species", title: "Species", type: "text" }),
    defineField({ name: "description", title: "Description", type: "text" }),
    defineField({ name: "intro", title: "Intro", type: "text" }),
    defineField({ name: "image", title: "Hero image", type: "imageAsset" }),
    defineField({ name: "gallery", title: "Gallery", type: "array", of: [defineArrayMember({ type: "imageAsset" })] }),
    defineField({ name: "video", title: "Expedition film", type: "editorialVideo" }),
    defineField({ name: "days", title: "Day by day", type: "array", of: [defineArrayMember({ type: "dayPlan" })] })
  ]
});

const journalArticle = defineType({
  name: "journalArticle",
  title: "Journal article",
  type: "document",
  fields: [
    defineField({ name: "slug", title: "Slug", type: "slug", options: { source: "title" } }),
    defineField({ name: "title", title: "Title", type: "string" }),
    defineField({ name: "category", title: "Category", type: "string" }),
    defineField({ name: "author", title: "Author", type: "string" }),
    defineField({ name: "date", title: "Date", type: "string" }),
    defineField({ name: "description", title: "Description", type: "text" }),
    defineField({ name: "body", title: "Body", type: "array", of: [defineArrayMember({ type: "text" })] }),
    defineField({ name: "image", title: "Hero image", type: "imageAsset" })
    ,defineField({ name: "video", title: "Article film", type: "editorialVideo" })
  ]
});

const specialist = defineType({
  name: "specialist",
  title: "Specialist",
  type: "document",
  fields: [
    defineField({ name: "name", title: "Name", type: "string" }),
    defineField({ name: "role", title: "Role", type: "string" }),
    defineField({ name: "expertise", title: "Expertise", type: "text" }),
    defineField({ name: "bio", title: "Bio", type: "text" }),
    defineField({ name: "moment", title: "Field note", type: "text" }),
    defineField({ name: "image", title: "Portrait/image", type: "imageAsset" })
    ,defineField({ name: "video", title: "Specialist film", type: "editorialVideo" })
  ]
});

const testimonial = defineType({
  name: "testimonial",
  title: "Testimonial / proof",
  type: "document",
  fields: [
    defineField({ name: "name", title: "Guest name", type: "string" }),
    defineField({ name: "city", title: "City", type: "string" }),
    defineField({ name: "trip", title: "Trip", type: "string" }),
    defineField({ name: "quote", title: "Quote", type: "text" })
    ,defineField({ name: "guestType", title: "Guest type", type: "string" })
    ,defineField({ name: "destination", title: "Destination", type: "string" })
    ,defineField({ name: "travelled", title: "Travel month / year", type: "string" })
    ,defineField({ name: "route", title: "Route", type: "string" })
    ,defineField({ name: "journeySlug", title: "Journey slug", type: "string" })
    ,defineField({ name: "destinationSlug", title: "Destination slug", type: "string" })
    ,defineField({ name: "arranged", title: "What we arranged", type: "text" })
    ,defineField({ name: "verified", title: "Verified wording", type: "boolean", initialValue: false })
    ,defineField({ name: "consented", title: "Publication consent recorded", type: "boolean", initialValue: false })
    ,defineField({ name: "video", title: "Guest film", type: "editorialVideo", hidden: ({ parent }) => !parent?.consented })
  ]
});

export const schemaTypes = [
  imageAsset,
  heroMedia,
  editorialVideo,
  dayPlan,
  fieldIntelligence,
  faqItem,
  destinationPairing,
  seoFields,
  researchSource,
  homepage,
  destination,
  journey,
  expedition,
  journalArticle,
  specialist,
  testimonial
];
