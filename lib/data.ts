import content from "@/content/site-content.json";

export type ImageAsset = {
  src: string;
  alt: string;
  credit: string;
};

export type DayPlan = {
  title: string;
  copy: string;
  stay?: string;
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
};

export type Destination = {
  slug: string;
  title: string;
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
  highlights: string[];
  journeys: string[];
  expeditions: string[];
};

export type Expedition = {
  slug: string;
  title: string;
  category: string;
  skill: string;
  groupSize: string;
  bestMonths: string;
  species: string;
  equipment: string;
  description: string;
  intro: string;
  image: ImageAsset;
  gallery: ImageAsset[];
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
};

export type Specialist = {
  name: string;
  role: string;
  expertise: string;
  bio: string;
  moment: string;
  image: ImageAsset;
};

export type Testimonial = {
  name: string;
  city: string;
  trip: string;
  quote: string;
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
