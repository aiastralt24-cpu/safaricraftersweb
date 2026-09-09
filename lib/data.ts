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
  label?: string;
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

export type DestinationCombo = {
  title: string;
  description: string;
  imageSlug: string;
  href: string;
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
  tagline?: string;
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
  editorial?: {
    openingHeadline?: string;
    landscapeHeadline?: string;
    wildlifeHeadline?: string;
  };
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

export type RegionalAtlasTheme = {
  label: string;
  title: string;
  copy: string;
  destinationSlugs: string[];
  imageSlug: string;
  imageIndex?: number;
};

export type RegionalAtlas = {
  slug: "india" | "africa" | "americas" | "arctic-beyond";
  title: string;
  shortTitle: string;
  continent: Destination["continent"];
  meta: string;
  heroTitle: string;
  heroCopy: string;
  heroDestinationSlug: string;
  introductionTitle: string;
  introductionCopy: string;
  themes: RegionalAtlasTheme[];
  featuredDestinationSlugs: string[];
  closingTitle: string;
  closingCopy: string;
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

const dedicatedDestinationCombos: Record<string, DestinationCombo[]> = {
  amboseli: [
    { title: "Masai Mara & Amboseli", description: "Big cats and elephants. The perfect introduction to Kenya.", imageSlug: "masai-mara", href: "/plan?destination=amboseli&combo=masai-mara" },
    { title: "Masai Mara, Amboseli, Lake Nakuru & Naivasha", description: "A grand tour of southern Kenya for the history books.", imageSlug: "lake-nakuru-and-naivasha", href: "/plan?destination=amboseli&combo=masai-mara-lake-nakuru-naivasha" }
  ],
  jawai: [
    { title: "Jawai & Ranthambhore", description: "Leopards and tigers. Two apex big cats in two markedly different habitats.", imageSlug: "ranthambhore", href: "/plan?destination=jawai&combo=ranthambhore" },
    { title: "Jawai, Spiti & Ranthambhore", description: "A grand tour through three breathtaking habitats in search of snow leopards, tigers and leopards.", imageSlug: "spiti-valley", href: "/plan?destination=jawai&combo=spiti-ranthambhore" }
  ],
  laikipia: [
    { title: "Laikipia & Masai Mara", description: "One a great classic and another a future legend.", imageSlug: "masai-mara", href: "/plan?destination=laikipia&combo=masai-mara" },
    { title: "Laikipia & Samburu", description: "Go all out on rare species and rarer experiences.", imageSlug: "samburu", href: "/plan?destination=laikipia&combo=samburu" }
  ],
  ranthambhore: [
    { title: "Big Cats of India", description: "A grand feline journey through three breathtaking habitats in search of India's apex cats.", imageSlug: "ladakh", href: "/journeys/big-cats-of-india" },
    { title: "Golden Triangle & Tiger Safari", description: "Add a dash of human heritage to the natural splendour with monuments and monumental cats.", imageSlug: "jawai", href: "/journeys/history-majesty-the-wildgolden-triangle-safari" },
    { title: "India’s Big Five Safari", description: "Go beyond big cats to encounter the other great mammals of the Indian subcontinent.", imageSlug: "kaziranga", href: "/journeys/whiskers-stripes-and-roarssafari-adventures-with-indias-big-cats" }
  ],
  samburu: [
    { title: "Samburu & Masai Mara", description: "Pair the Mara's abundance and predator drama with Samburu's quieter, more intimate northern landscape.", imageSlug: "masai-mara", href: "/plan?destination=samburu&combo=masai-mara" },
    { title: "Samburu & Amboseli", description: "Elephants beneath Kilimanjaro followed by Samburu's rugged country and distinctive northern species.", imageSlug: "amboseli", href: "/plan?destination=samburu&combo=amboseli" }
  ],
  "spiti-valley": [
    { title: "Spiti & Ranthambhore", description: "Snow leopards and tigers. Two apex big cats in two markedly different habitats.", imageSlug: "ranthambhore", href: "/plan?destination=spiti-valley&combo=ranthambhore" },
    { title: "Spiti, Ranthambhore & Jawai", description: "A grand journey through three breathtaking habitats for snow leopards, tigers and leopards.", imageSlug: "jawai", href: "/plan?destination=spiti-valley&combo=ranthambhore-jawai" },
    { title: "Spiti & Taj Mahal", description: "Add a considered heritage chapter to the snow leopard adventure.", imageSlug: "spiti-valley", href: "/plan?destination=spiti-valley&combo=taj-mahal" }
  ],
  svalbard: [
    { title: "Svalbard & Tromsø", description: "A natural mainland Arctic chapter before or after the remote landscape of Svalbard.", imageSlug: "svalbard", href: "/plan?destination=svalbard&combo=tromso" },
    { title: "Svalbard & Mainland Norway", description: "Contrast Norway's accessible northern landscapes with the geographical isolation of the High Arctic.", imageSlug: "svalbard", href: "/plan?destination=svalbard&combo=mainland-norway" }
  ]
};

export function getDedicatedDestinationCombos(slug: string) {
  return dedicatedDestinationCombos[slug] ?? [];
}

export function getExpedition(slug: string) {
  return expeditions.find((item) => item.slug === slug);
}

export function getArticle(slug: string) {
  return journal.find((item) => item.slug === slug);
}

export const destinationContinents = ["India", "Africa", "Americas", "Arctic"] as const;

const regionalAtlases: RegionalAtlas[] = [
  {
    slug: "india",
    title: "India Atlas",
    shortTitle: "India",
    continent: "India",
    meta: "The India Atlas",
    heroTitle: "A subcontinent, read slowly.",
    heroCopy: "Tiger forests, high mountains, desert edges and living cultures—composed as one private journey.",
    heroDestinationSlug: "ranthambhore",
    introductionTitle: "Many Indias. One considered way through.",
    introductionCopy: "India rewards sequence and restraint. We connect its most compelling habitats with the right season, patient fieldcraft and enough time for each place to reveal itself.",
    themes: [
      { label: "Tiger country", title: "Forests shaped by the tiger.", copy: "Ranthambhore and Central India's tiger forests, paced around light, habitat and unhurried sightings.", destinationSlugs: ["ranthambhore", "bandhavgarh", "kanha"], imageSlug: "kanha" },
      { label: "The high wild", title: "Above the tree line.", copy: "Cold-desert valleys and mountain wildlife across Ladakh and Spiti.", destinationSlugs: ["ladakh", "spiti-valley"], imageSlug: "spiti-valley" },
      { label: "India's farther edges", title: "Beyond the familiar circuit.", copy: "Red-panda forest, Brahmaputra floodplain and the salt-white Rann—three distinct reasons to travel farther.", destinationSlugs: ["singalila", "kaziranga", "rann-of-kutch"], imageSlug: "rann-of-kutch" }
    ],
    featuredDestinationSlugs: ["ranthambhore", "jawai", "ladakh", "kanha", "kaziranga", "sunderbans"],
    closingTitle: "Begin with what you hope to witness.",
    closingCopy: "We will shape the route, pace and season around it."
  },
  {
    slug: "africa",
    title: "Africa Atlas",
    shortTitle: "Africa",
    continent: "Africa",
    meta: "The Africa Atlas",
    heroTitle: "Africa, without the shorthand.",
    heroCopy: "A private atlas of migration country, great rivers, desert silence and forests alive with primates.",
    heroDestinationSlug: "masai-mara",
    introductionTitle: "The continent is not one safari.",
    introductionCopy: "The right African journey begins with contrast: open plains and hidden valleys, abundance and solitude, celebrated reserves and concessions where access changes everything.",
    themes: [
      { label: "Migration plains", title: "The great moving landscape.", copy: "Wildebeest country across the Mara and Serengeti, with Ngorongoro as a volcanic counterpoint.", destinationSlugs: ["masai-mara", "serengeti", "ngorongoro"], imageSlug: "masai-mara" },
      { label: "Elephant country", title: "Space changes the encounter.", copy: "Kilimanjaro views, open conservancies and dry-season waterholes shaped around elephant movement.", destinationSlugs: ["amboseli", "laikipia", "tarangire"], imageSlug: "amboseli" },
      { label: "Primate forests", title: "Beneath the canopy.", copy: "Gorilla and chimpanzee encounters in Uganda's equatorial forests, paced around patient tracking on foot.", destinationSlugs: ["bwindi-impenetrable", "kibale-national-park", "queen-elizabeth-national-park"], imageSlug: "bwindi-impenetrable" }
    ],
    featuredDestinationSlugs: ["masai-mara", "laikipia", "amboseli", "serengeti", "bwindi-impenetrable", "kibale-national-park"],
    closingTitle: "Choose the feeling before the route.",
    closingCopy: "Migration, solitude, walking country or a first family safari—we will find the right Africa."
  },
  {
    slug: "americas",
    title: "Americas Atlas",
    shortTitle: "The Americas",
    continent: "Americas",
    meta: "The Americas Atlas",
    heroTitle: "A wilder western hemisphere.",
    heroCopy: "Rainforest, high Andes, southern ice and northern wilderness—selected for encounters with real depth.",
    heroDestinationSlug: "pantanal",
    introductionTitle: "From equator to the far north.",
    introductionCopy: "The Americas hold immense ecological range. We build journeys around the seasons that concentrate wildlife, the guides who can read it and landscapes worth travelling slowly through.",
    themes: [
      { label: "Jaguar wetlands", title: "Where rivers gather the wild.", copy: "Pantanal channels and riverbanks explored around the movement of jaguar, caiman and prolific birdlife.", destinationSlugs: ["pantanal", "brazil"], imageSlug: "pantanal" },
      { label: "Southern wild", title: "Puma beneath the Andes.", copy: "Patagonia's open steppe and mountain weather, paced around patient puma observation.", destinationSlugs: ["patagonia", "chile"], imageSlug: "patagonia" },
      { label: "Atlantic forest", title: "Colour beneath the canopy.", copy: "Toucans, endemic birds and primates in the remaining forests of Brazil's Atlantic coast.", destinationSlugs: ["atlantic-rainforest", "brazil"], imageSlug: "atlantic-rainforest" }
    ],
    featuredDestinationSlugs: ["pantanal", "patagonia", "atlantic-rainforest"],
    closingTitle: "Follow a species, a season or a latitude.",
    closingCopy: "We will connect the landscapes into a journey that feels coherent, never collected."
  },
  {
    slug: "arctic-beyond",
    title: "Arctic & Beyond",
    shortTitle: "Arctic & Beyond",
    continent: "Arctic",
    meta: "The High Arctic Atlas",
    heroTitle: "At the edge of the map.",
    heroCopy: "Svalbard in the long light: expedition days shaped by ice, weather and the freedom to wait.",
    heroDestinationSlug: "svalbard",
    introductionTitle: "An expedition defined by conditions.",
    introductionCopy: "In the High Arctic, certainty is the wrong promise. Good judgement, flexible routing and time on deck create the possibility of polar bear, walrus and the sudden theatre of sea ice.",
    themes: [
      { label: "Sea ice", title: "Read the changing edge.", copy: "Daily decisions follow ice, wind and wildlife rather than a fixed sightseeing circuit.", destinationSlugs: ["svalbard"], imageSlug: "svalbard", imageIndex: 1 },
      { label: "Long light", title: "Days made for observation.", copy: "Extended daylight leaves room for patient encounters and deliberate photography.", destinationSlugs: ["svalbard"], imageSlug: "svalbard", imageIndex: 3 },
      { label: "Expedition craft", title: "Small ship, serious field time.", copy: "A capable team and flexible landing plan keep the experience intimate and responsive.", destinationSlugs: ["svalbard"], imageSlug: "svalbard", imageIndex: 5 }
    ],
    featuredDestinationSlugs: ["svalbard"],
    closingTitle: "Leave room for the unexpected.",
    closingCopy: "We will help choose the vessel, departure and photographic emphasis that suit you."
  }
];

export function getRegionalAtlases() {
  return regionalAtlases;
}

export function getRegionalAtlas(slug: string) {
  return regionalAtlases.find((atlas) => atlas.slug === slug);
}

export function getDestinationsByAtlas(slug: string) {
  const atlas = getRegionalAtlas(slug);
  return atlas ? getDestinationsByContinent(atlas.continent) : [];
}

export function getCountriesByAtlas(slug: string) {
  const atlas = getRegionalAtlas(slug);
  return atlas ? getCountriesByContinent(atlas.continent) : [];
}

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
