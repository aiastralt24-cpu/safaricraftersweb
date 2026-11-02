import { defineArrayMember, defineField, defineType } from "sanity";

const imageAsset = defineType({
  name: "imageAsset",
  title: "Image asset",
  type: "object",
  fields: [
    defineField({ name: "upload", title: "Upload image", type: "image", options: { hotspot: true }, description: "Upload takes priority over the legacy URL. Add alt text below." }),
    defineField({ name: "src", title: "Existing image URL", type: "string", description: "Use /assets/… or a https://cdn.sanity.io/images/… URL when not uploading." }),
    defineField({ name: "focalPoint", title: "Focal point", type: "string", description: "Optional CSS position, for example 50% 35%. Uploaded hotspot is used when this is empty." }),
    defineField({ name: "alt", title: "Alt text", type: "string", description: "Describe what is visible; avoid promotional keywords.", validation: r => r.required() }),
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
    defineField({ name: "label", title: "Day label", type: "string", description: "For example Day 1 or Days 2–3." }),
    defineField({ name: "title", title: "Title", type: "string", validation: r => r.required() }),
    defineField({ name: "copy", title: "Copy", type: "text", validation: r => r.required() }),
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
    defineField({ name: "question", title: "Question", type: "string", validation: r => r.required() }),
    defineField({ name: "answer", title: "Direct answer", type: "text", rows: 3, validation: r => r.required() })
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
    defineField({ name: "title", title: "Search title", type: "string", validation: (rule) => rule.max(65).warning("Aim for a concise search title.") }),
    defineField({ name: "description", title: "Search description", type: "text", rows: 3, validation: (rule) => rule.max(165).warning("Aim for a concise search description.") }),
    defineField({ name: "socialImage", title: "Social sharing image", type: "imageAsset", description: "Optional. Falls back to the page hero image." }),
    defineField({ name: "reviewedAt", title: "Fact review date", type: "date", description: "Set only after checking the information against reliable sources." })
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
    defineField({ name: "proof", title: "Proof points", description: "Legacy field; the current homepage uses code-managed proof sections.", readOnly: true, type: "array", of: [defineArrayMember({ type: "string" })] }),
    defineField({ name: "atelier", title: "Atelier pillars", description: "Legacy field; the current homepage uses code-managed pillars.", readOnly: true, type: "array", of: [defineArrayMember({ type: "text" })] })
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
    ,defineField({ name: "faqs", title: "Traveller questions", type: "array", of: [defineArrayMember({ type: "faqItem" })], validation: (rule) => rule.max(12).warning("Keep answers focused; group longer guidance into the destination story.") })
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
    ,defineField({ name: "faqs", title: "Journey questions", type: "array", of: [defineArrayMember({ type: "faqItem" })], validation: (rule) => rule.max(12).warning("Keep answers focused; group longer guidance into the destination story.") })
    ,defineField({ name: "seo", title: "SEO / AEO / GEO", type: "seoFields" })
  ]
});

const expedition = defineType({
  name: "photoExpedition",
  title: "Photography Tours",
  type: "document",
  fields: [
    defineField({ name: "cancellationPolicy", title: "Tour cancellation policy", type: "text" }),
    defineField({ name: "faqs", title: "Tour questions", type: "array", of: [defineArrayMember({ type: "faqItem" }), defineArrayMember({ type: "object", title: "Legacy question", fields: [defineField({ name: "question", type: "string" }), defineField({ name: "answer", type: "text" })] })] }),
    defineField({name:"publicationStatus",title:"Publication status",type:"string",options:{list:["preview","published"]},initialValue:"preview"}),
    defineField({name:"availabilityReviewedAt",title:"Availability last verified",type:"date"}),
    defineField({name:"departures",title:"Departure dates and availability",type:"array",of:[defineArrayMember({type:"object",name:"departure",fields:[
      defineField({name:"date",type:"date",validation:r=>r.required()}),
      defineField({name:"endDate",type:"date"}),
      defineField({name:"status",type:"string",options:{list:["New","Available","Filling fast","Full"]},validation:r=>r.required()}),
      defineField({name:"availability",title:"Verified availability text",type:"string"})
    ]})]}),

    defineField({ name: "geography", title: "Geography", type: "string", options: { list: ["India", "International"], layout: "radio" }, validation: rule => rule.required() }),
    ...['category','skill','groupSize','duration','equipment','bestMonths','price','route'].map(name=>defineField({name,type:'string'})),
    ...['highlights','inclusions','exclusions'].map(name=>defineField({name,type:'array',of:[defineArrayMember({type:'string'})]})),
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

const strings = (names: string[]) => names.map(name => defineField({ name, title: name.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase()), type: "string" }));
const list = (name: string, title: string) => defineField({ name, title, type: "array", of: [defineArrayMember({ type: "string" })], initialValue: [] });
const seo = defineField({ name: "seo", title: "Search and sharing", type: "seoFields" });
const sources = defineField({ name: "sources", title: "Fact-check sources", type: "array", of: [defineArrayMember({ type: "researchSource" })] });
const gallery = defineField({ name: "gallery", title: "Gallery", type: "array", of: [defineArrayMember({ type: "imageAsset" })], initialValue: [] });
const body = defineField({ name: "body", title: "Additional paragraphs", type: "array", of: [defineArrayMember({ type: "text" })], initialValue: [] });

const additions: Record<string, ReturnType<typeof defineField>[]> = {
  homepage: [seo, defineField({name: "heroLines", title: "Rotating hero headlines", type: "array", validation: r => r.min(1).max(6), of: [defineArrayMember({type: "object", name: "heroLine", fields: strings(["lead", "rest", "accent"]), preview: {select: {title: "lead", subtitle: "accent"}}})]})],
  destination: [
    ...strings(["category", "country", "parentRegion", "homepageCaption", "homepageMeta"]),
    defineField({name: "continent", type: "string", options: {list: ["India", "Africa", "Americas", "Arctic"]}, validation: r => r.required()}),
    defineField({name: "status", title: "Guide depth", type: "string", options: {list: ["rich", "concierge"]}, initialValue: "concierge"}),
    defineField({name: "planningNote", type: "text"}),
    list("bestFor", "Best suited to"), list("highlights", "Highlights"), list("journeys", "Related journey titles"), list("expeditions", "Related photography tour titles"),
    defineField({name: "heroImage", title: "Page hero override", type: "imageAsset", description: "Overrides the curated website hero. The main image remains the collection card."}),
    defineField({name: "editorial", title: "Destination story", type: "object", fields: [
      ...strings(["openingHeadline", "landscapeHeadline", "wildlifeHeadline", "factsLabel", "relatedLabel", "relatedHeadline", "plannerHeadline", "plannerCta"]),
      ...["landscapeCopy", "wildlifeCopy", "relatedIntro", "plannerCopy"].map(name => defineField({name, type: "text"})),
      defineField({name: "scoop", title: "In-depth field notes", type: "array", of: [defineArrayMember({type: "object", name: "fieldNote", fields: [ ...strings(["title"]), defineField({name:"blurb",type:"text"}), defineField({name:"body",type:"text"})]})]})
    ]})
  ],
  journey: [...strings(["tagline", "groupSize", "difficulty", "price"]), ...["destinations", "locations", "statesOrRegions", "inclusions", "exclusions"].map(n => list(n, n)), body, sources],
  photoExpedition: [body, seo, sources, ...strings(["heroTitle"]), defineField({name:"heroCopy",title:"Hero introduction",type:"text"})],
  journalArticle: [...strings(["readTime"]), defineField({name:"quote",title:"Pull quote",type:"text"}), gallery, seo, sources],
  specialist: [],
  testimonial: [defineField({name:"image",title:"Journey image",type:"imageAsset"}), defineField({name:"anonymous",title:"Withhold guest name",type:"boolean",initialValue:false,description:"Consent is still required for the quote itself."})]
};
const mediaFields = new Set(["image", "heroImage", "gallery", "video", "heroMedia"]);
const planningFields = new Set(["days", "duration", "groupSize", "difficulty", "price", "route", "bestMonths", "fieldIntelligence", "inclusions", "exclusions", "departures", "publicationStatus", "availabilityReviewedAt", "cancellationPolicy", "equipment", "skill", "pace", "accommodation", "accessApproach", "customizationNote", "idealGuest", "idealStay", "gateway", "access", "safariRhythm", "planningNote"]);
const requiredByType: Record<string, string[]> = {
  homepage: ["title", "copy"], destination: ["title", "slug", "country", "region", "description", "intro", "bestMonths", "wildlife", "photography", "image"],
  journey: ["title", "slug", "region", "category", "description", "intro", "duration", "bestMonths", "groupSize", "difficulty", "price", "specialist", "image"],
  photoExpedition: ["title", "slug", "category", "description", "intro", "mentor", "image"],
  journalArticle: ["title", "slug", "category", "description", "author", "date", "readTime", "image", "body"], specialist: ["name", "role", "bio", "image"], testimonial: ["name", "trip", "quote"]
};
function editorialDocument(doc: import("sanity").DocumentDefinition) {
  const fields = [...doc.fields, ...(additions[doc.name] || []), defineField({name: "orderRank", title: "Display order", type: "number", description: "Lower numbers appear first. Leave empty to preserve existing website order.", validation: r => r.integer().min(0)})];
  return defineType({
    ...doc,
    groups: [{name:"story",title:"Story",default:true},{name:"planning",title:"Trip planning"},{name:"media",title:"Images and film"},{name:"search",title:"Search and fact checks"}],
    fields: fields.map(field => ({...field,
      group: mediaFields.has(field.name) ? "media" : ["seo","sources"].includes(field.name) ? "search" : planningFields.has(field.name) ? "planning" : "story",
      ...(requiredByType[doc.name]?.includes(field.name) && !field.validation ? {validation: (r: import("sanity").Rule) => r.required()} : {}),
      ...(field.type === "array" ? {initialValue: []} : {}),
      ...(field.name === "slug" ? {description: "Public URL. Keep existing slugs stable; changing one needs a redirect."} : {}),
      ...(field.name === "verified" ? {description: "Confirm this is the guest’s actual wording. Only verified, consented CMS notes appear on the site."} : {})
    })),
    preview: {select: {title: doc.name === "specialist" || doc.name === "testimonial" ? "name" : "title", subtitle: doc.name === "testimonial" ? "trip" : doc.name === "specialist" ? "role" : "description", media: "image.upload"}},
    orderings: [{title:"Website order",name:"websiteOrder",by:[{field:"orderRank",direction:"asc"}]}]
  });
}

export const schemaTypes = [
  imageAsset, heroMedia, editorialVideo, dayPlan, fieldIntelligence, faqItem,
  destinationPairing, seoFields, researchSource,
  ...[homepage, destination, journey, expedition, journalArticle, specialist, testimonial].map(editorialDocument)
];
