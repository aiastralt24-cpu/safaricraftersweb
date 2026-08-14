import content from "@/content/site-content.json";

export type ImageAsset = {
  src: string;
  alt: string;
  credit: string;
  focalPoint?: string;
};

export type EditorialVideo = {
  mp4: string;
  webm?: string;
  poster: ImageAsset;
  title: string;
  caption?: string;
  transcript?: string;
};

export type DayPlan = {
  title: string;
  copy: string;
  stay?: string;
};

export type FAQItem = {
  question: string;
  answer: string;
};

export type DestinationPairing = {
  slug: string;
  title: string;
  reason: string;
};

export type SeoFields = {
  title?: string;
  description?: string;
  reviewedAt?: string;
};

export type ResearchSource = {
  title: string;
  url: string;
  publisher: string;
  accessedAt: string;
};

export type Journey = {
  slug: string;
  title: string;
  category: string;
  region: string;
  duration: string;
  groupSize: string;
  bestMonths: string;
  difficulty: string;
  price: string;
  description: string;
  intro: string;
  image: ImageAsset;
  gallery: ImageAsset[];
  video?: EditorialVideo;
  highlights: string[];
  route?: string;
  locations?: string[];
  statesOrRegions?: string[];
  inclusions?: string[];
  exclusions?: string[];
  destinations: string[];
  days: DayPlan[];
  specialist: string;
  body?: string[];
  style?: string;
  idealGuest?: string;
  pace?: string;
  accommodation?: string;
  wildlifeFocus?: string;
  accessApproach?: string;
  customizationNote?: string;
  faqs?: FAQItem[];
  seo?: SeoFields;
  sources?: ResearchSource[];
};

export type Destination = {
  slug: string;
  title: string;
  category?: string;
  continent: "India" | "Africa" | "Americas" | "Arctic";
  country: string;
  parentRegion?: string;
  status: "rich" | "concierge";
  bestFor: string[];
  planningNote: string;
  region: string;
  bestMonths: string;
  wildlife: string;
  photography: string;
  description: string;
  homepageCaption?: string;
  homepageMeta?: string;
  intro: string;
  image: ImageAsset;
  gallery: ImageAsset[];
  video?: EditorialVideo;
  highlights: string[];
  journeys: string[];
  expeditions: string[];
  habitat?: string;
  idealStay?: string;
  gateway?: string;
  access?: string;
  safariRhythm?: string;
  pairings?: DestinationPairing[];
  faqs?: FAQItem[];
  seo?: SeoFields;
  sources?: ResearchSource[];
};

export type CountryAtlas = {
  slug: string;
  title: string;
  continent: Destination["continent"];
  country: string;
  description: string;
  image: ImageAsset;
  destinations: Destination[];
};

export type Expedition = {
  slug: string;
  title: string;
  category: string;
  skill: string;
  groupSize: string;
  duration?: string;
  bestMonths: string;
  species: string;
  equipment: string;
  description: string;
  intro: string;
  image: ImageAsset;
  gallery: ImageAsset[];
  video?: EditorialVideo;
  mentor: string;
  guide?: string;
  date?: string;
  price?: string;
  route?: string;
  highlights: string[];
  inclusions?: string[];
  exclusions?: string[];
  days: DayPlan[];
  body?: string[];
};

export type JournalArticle = {
  slug: string;
  title: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  description: string;
  body: string[];
  quote: string;
  image: ImageAsset;
  gallery: ImageAsset[];
  video?: EditorialVideo;
};

export type Specialist = {
  name: string;
  role: string;
  expertise: string;
  bio: string;
  moment: string;
  image: ImageAsset;
  video?: EditorialVideo;
};

export type Testimonial = {
  name: string;
  city: string;
  trip: string;
  guestType?: string;
  destination?: string;
  travelled?: string;
  quote: string;
  route?: string;
  journeySlug?: string;
  destinationSlug?: string;
  arranged?: string;
  verified?: boolean;
  consented?: boolean;
  video?: EditorialVideo;
};

export type EnquiryPayload = {
  source: "planner";
  sourceLabel?: string;
  region: string;
  types: string[];
  experiences: string[];
  months: string[];
  year: string;
  nights: string;
  travellers: string;
  occasion: string;
  flexibility: string;
  accommodation: string;
  investment: string;
  contactPreference: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  notes?: string;
  specialist?: string;
  consent: boolean;
};

export type SiteContent = {
  heroImage: ImageAsset;
  navItems: { href: string; label: string }[];
  journeyCategories: string[];
  expeditionCategories: string[];
  journalCategories: string[];
  specialists: Specialist[];
  journeys: Journey[];
  destinations: Destination[];
  expeditions: Expedition[];
  journal: JournalArticle[];
  testimonials: Testimonial[];
};

export const siteContent = content as SiteContent;

export const heroImage = siteContent.heroImage;
export const navItems = siteContent.navItems;
export const journeyCategories = siteContent.journeyCategories;
export const expeditionCategories = siteContent.expeditionCategories;
export const journalCategories = siteContent.journalCategories;
export const specialists = siteContent.specialists;
export const journeys = siteContent.journeys;
export const destinations = siteContent.destinations;
export const expeditions = siteContent.expeditions;
export const journal = siteContent.journal;
export const testimonials = siteContent.testimonials;

export function getJourney(slug: string) {
  return journeys.find((item) => item.slug === slug);
}

export function getDestination(slug: string) {
  return destinations.find((item) => item.slug === slug);
}

export function getExpedition(slug: string) {
  return expeditions.find((item) => item.slug === slug);
}

export function getArticle(slug: string) {
  return journal.find((item) => item.slug === slug);
}

export const destinationContinents = ["India", "Africa", "Americas", "Arctic"] as const;

export function getDestinationsByContinent(continent: Destination["continent"]) {
  return destinations.filter((destination) => destination.continent === continent);
}

export function slugifyAtlasValue(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getCountryAtlas(): CountryAtlas[] {
  const countries = new Map<string, Destination[]>();

  destinations.forEach((destination) => {
    const key = `${destination.continent}:${destination.country}`;
    countries.set(key, [...(countries.get(key) ?? []), destination]);
  });

  return Array.from(countries.entries()).map(([key, countryDestinations]) => {
    const [continent, country] = key.split(":") as [Destination["continent"], string];
    const countryOverview =
      countryDestinations.find((destination) => destination.title === country) ??
      countryDestinations.find((destination) => destination.status === "rich") ??
      countryDestinations[0];
    const destinationCount = countryDestinations.length;

    return {
      slug: slugifyAtlasValue(country),
      title: country,
      continent,
      country,
      description:
        destinationCount === 1
          ? `A private ${country} brief shaped around season, access, guiding and wildlife priorities.`
          : `${destinationCount} private ${country} destination briefs shaped around season, access, guiding and wildlife priorities.`,
      image: countryOverview.image,
      destinations: countryDestinations
    };
  });
}

export function getCountriesByContinent(continent: Destination["continent"]) {
  return getCountryAtlas().filter((country) => country.continent === continent);
}

export function getCountryBySlug(slug: string) {
  return getCountryAtlas().find((country) => country.slug === slug);
}
