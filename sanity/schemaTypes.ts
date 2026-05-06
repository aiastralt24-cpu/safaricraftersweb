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
    defineField({ name: "fieldIntelligence", title: "Field intelligence", type: "fieldIntelligence" })
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
    defineField({ name: "highlights", title: "Highlights", type: "array", of: [defineArrayMember({ type: "string" })] }),
    defineField({ name: "days", title: "Day by day", type: "array", of: [defineArrayMember({ type: "dayPlan" })] })
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
  ]
});

export const schemaTypes = [
  imageAsset,
  heroMedia,
  dayPlan,
  fieldIntelligence,
  homepage,
  destination,
  journey,
  expedition,
  journalArticle,
  specialist,
  testimonial
];
