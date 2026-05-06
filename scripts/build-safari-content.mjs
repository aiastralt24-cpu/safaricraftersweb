import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const pagesDir = "output/firecrawl/export/pages";
const dataOut = "lib/data.ts";
const mediaOut = "output/firecrawl/export/selected-media.json";

const pageFiles = fs
  .readdirSync(pagesDir)
  .filter((file) => file.endsWith(".md"))
  .map((file) => path.join(pagesDir, file));

const usefulHeadingSkip = new Set([
  "Highlights",
  "Detailed itinerary",
  "More Information",
  "Gallery",
  "Inclusions",
  "Exclusions",
  "Overview",
  "How is it?",
  "Itinerary",
  "Inclusions / Exclusions",
]);

const destinationRegions = {
  bandhavgarh: "Madhya Pradesh, India",
  brazil: "Pantanal, Brazil",
  chile: "Patagonia and Atacama, Chile",
  gir: "Gujarat, India",
  jawai: "Rajasthan, India",
  kanha: "Madhya Pradesh, India",
  kaziranga: "Assam, India",
  kenya: "Kenya",
  panna: "Madhya Pradesh, India",
  ranthambhore: "Rajasthan, India",
  "spiti-valley": "Himachal Pradesh, India",
  svalbard: "Svalbard, Arctic Norway",
  uganda: "Uganda",
};

const destinationBestMonths = {
  bandhavgarh: "October to June",
  brazil: "June to October",
  chile: "October to April",
  gir: "December to March",
  jawai: "October to March",
  kanha: "October to June",
  kaziranga: "November to April",
  kenya: "July to October",
  panna: "October to June",
  ranthambhore: "October to June",
  "spiti-valley": "January to March",
  svalbard: "May to August",
  uganda: "June to September and December to February",
};

const destinationWildlife = {
  bandhavgarh: "Bengal tiger, leopard, gaur, deer and forest birdlife",
  brazil: "Jaguar, giant otter, caiman, giant anteater and hyacinth macaw",
  chile: "Puma, guanaco, condor, flamingo and high desert wildlife",
  gir: "Asiatic lion, leopard, chital, nilgai and dry forest birds",
  jawai: "Leopard, crocodile, flamingo, raptors and pastoral edge wildlife",
  kanha: "Bengal tiger, barasingha, wild dog, gaur and sal forest species",
  kaziranga: "One-horned rhinoceros, elephant, tiger, wild buffalo and wetland birds",
  kenya: "Lion, leopard, cheetah, elephant, giraffe and migration plains wildlife",
  panna: "Tiger, leopard, sloth bear, gharial, vulture and riverine birdlife",
  ranthambhore: "Bengal tiger, leopard, sloth bear, marsh crocodile and sambar",
  "spiti-valley": "Snow leopard, blue sheep, red fox, ibex and Himalayan raptors",
  svalbard: "Polar bear, walrus, Arctic fox, reindeer and seabirds",
  uganda: "Mountain gorilla, chimpanzee, lion, elephant and forest birdlife",
};

const routeRegions = {
  "big-cats-of-india": ["Delhi", "Ladakh", "Ranthambhore", "Jawai", "Gir"],
  "palaces-and-tigers": ["Delhi", "Jaipur", "Ranthambhore", "Agra"],
  "royal-rajasthan-safari": ["Jaipur", "Ranthambhore", "Jawai", "Udaipur"],
  "southern-splendourwhere-forests-hills-wildlife-converge": ["Bengaluru", "Kabini", "Bandipur", "Nagarhole", "Western Ghats"],
  "phantoms-of-the-wild-indias-elusive-small-cats-safari": ["Rajasthan", "Gujarat", "Central India"],
  "roar-trumpet-wingbeat-uttarakhands-wilderness-circuit": ["Uttarakhand", "Corbett", "Rajaji", "Terai"],
  "whiskers-stripes-and-roarssafari-adventures-with-indias-big-cats": ["Central India", "Ranthambhore", "Jawai", "Gir"],
  "where-sky-meets-earthladakh-realm-of-the-snow-leopard": ["Delhi", "Leh", "Ladakh", "Snow Leopard Country"],
  "deserts-lions-dunesan-expedition-into-indias-wild-heart": ["Ahmedabad", "Gir", "Velavadar", "Little Rann of Kutch"],
  "pink-city-panther-trails-jaipurs-regal-heritage-and-wild-heart": ["Jaipur", "Jhalana", "Amer", "Aravalli Hills"],
  "where-rivers-forests-tigers-thriveterrific-terai": ["Uttarakhand", "Dudhwa", "Katarniaghat", "Pilibhit"],
  "trail-of-the-himalayan-firefox-a-red-panda-rhino-expedition": ["Bagdogra", "Singalila", "Kaziranga"],
  "heart-of-the-wildcentral-indias-six-park-safari": ["Pench", "Kanha", "Bandhavgarh", "Panna", "Satpura", "Tadoba"],
  "history-majesty-the-wildgolden-triangle-safari": ["Delhi", "Agra", "Jaipur", "Ranthambhore"],
};

const stateRegions = {
  "big-cats-of-india": ["Delhi", "Ladakh", "Rajasthan", "Gujarat"],
  "palaces-and-tigers": ["Delhi", "Rajasthan", "Uttar Pradesh"],
  "royal-rajasthan-safari": ["Rajasthan"],
  "southern-splendourwhere-forests-hills-wildlife-converge": ["Karnataka", "Tamil Nadu", "Kerala"],
  "phantoms-of-the-wild-indias-elusive-small-cats-safari": ["Rajasthan", "Gujarat", "Madhya Pradesh"],
  "roar-trumpet-wingbeat-uttarakhands-wilderness-circuit": ["Uttarakhand"],
  "whiskers-stripes-and-roarssafari-adventures-with-indias-big-cats": ["Madhya Pradesh", "Rajasthan", "Gujarat"],
  "where-sky-meets-earthladakh-realm-of-the-snow-leopard": ["Ladakh"],
  "deserts-lions-dunesan-expedition-into-indias-wild-heart": ["Gujarat", "Rajasthan"],
  "pink-city-panther-trails-jaipurs-regal-heritage-and-wild-heart": ["Rajasthan"],
  "where-rivers-forests-tigers-thriveterrific-terai": ["Uttarakhand", "Uttar Pradesh"],
  "trail-of-the-himalayan-firefox-a-red-panda-rhino-expedition": ["West Bengal", "Assam"],
  "heart-of-the-wildcentral-indias-six-park-safari": ["Madhya Pradesh", "Maharashtra"],
  "history-majesty-the-wildgolden-triangle-safari": ["Delhi", "Uttar Pradesh", "Rajasthan"],
};

const specialists = ["Safari Crafters", "Gaurav Ramnarayanan", "Sachin Vats", "Kairav Mehta"];
const selectedMedia = new Map();

function readPage(file) {
  const raw = fs.readFileSync(file, "utf8");
  const meta = {};
  const frontmatter = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (frontmatter) {
    for (const line of frontmatter[1].split("\n")) {
      const [key, ...rest] = line.split(": ");
      if (key && rest.length) meta[key] = JSON.parse(rest.join(": "));
    }
  }
  return { file, raw, meta, body: raw.replace(/^---\n[\s\S]*?\n---\n/, "") };
}

function slugFromUrl(url) {
  return new URL(url).pathname.replace(/\/$/, "").split("/").pop();
}

function titleFromPage(page) {
  const headings = [...page.body.matchAll(/^#{2,6}\s+(.+)$/gm)]
    .map((match) => stripMarkdown(match[1]).trim())
    .filter((heading) => heading && !usefulHeadingSkip.has(heading) && !heading.includes("Craft Your Safari"));
  return headings[0] ?? page.meta.title?.replace(/\s+\|\s+.*$/, "") ?? "Safari Crafters";
}

function stripMarkdown(value) {
  return value
    .replace(/!\[[^\]]*]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/[*_`#>]/g, "")
    .replace(/\\\|/g, "|")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanBody(page) {
  let body = page.body;
  body = body.split("### Craft Your Safari")[0];
  body = body.split("reCAPTCHA")[0];
  return body
    .split("\n")
    .map((line) => {
      const clean = stripMarkdown(line);
      if (!clean) return "";
      if (line.includes("[Home](")) return "";
      if (clean === "×") return "";
      if (["Name", "Email", "Phone", "India +91", "+91"].includes(clean)) return "";
      if (/^\d+ results found$/.test(clean)) return "";
      return line;
    })
    .join("\n");
}

function paragraphs(page) {
  return cleanBody(page)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      if (/^#{1,6}\s+/.test(line)) return false;
      if (/^[-*]\s+/.test(line)) return false;
      if (/\]\(https?:\/\//.test(line)) return false;
      if (/^_?Route:/.test(line)) return false;
      if (/^_?\d+\s+nights?\s+\|/.test(line)) return false;
      if (line.includes("Request More Information")) return false;
      if (line.includes("Customize This Journey")) return false;
      if (/!\[[^\]]*]\([^)]+\)/.test(line)) return false;
      return true;
    })
    .map(stripMarkdown)
    .filter((text) => text.length > 60);
}

function bulletsAfter(page, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = cleanBody(page).match(new RegExp(`#{2,6}\\s+${escaped}[\\s\\S]*?(?=\\n#{2,6}\\s+|$)`, "i"));
  if (!match) return [];
  return match[0]
    .split("\n")
    .filter((line) => line.trim().startsWith("- "))
    .map((line) => stripMarkdown(line.replace(/^- /, "")))
    .filter(Boolean);
}

function sectionParagraphs(page, heading, limit = 3) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = cleanBody(page).match(new RegExp(`#{2,6}\\s+${escaped}[\\s\\S]*?(?=\\n#{2,6}\\s+|$)`, "i"));
  if (!match) return [];
  return match[0]
    .split("\n")
    .filter((line) => !/^#{1,6}\s+/.test(line) && !/^[-*]\s+/.test(line))
    .map(stripMarkdown)
    .filter((text) => text.length > 50)
    .slice(0, limit);
}

function imagesFromMarkdown(body) {
  const urls = [];
  for (const match of body.matchAll(/\[!\[[^\]]*]\(([^)]+)\)]\(([^)]+)\)|!\[([^\]]*)]\(([^)]+)\)/g)) {
    urls.push(match[2] ?? match[4]);
  }
  return [...new Set(urls.filter((url) => /^https?:/.test(url)))];
}

function localImage(url, alt, credit = "Safari Crafters archive") {
  const parsed = new URL(url);
  const ext = path.extname(parsed.pathname).split("?")[0] || ".jpg";
  const base = path.basename(parsed.pathname, ext).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  const hash = crypto.createHash("sha1").update(url).digest("hex").slice(0, 8);
  const filename = `${base || "image"}-${hash}${ext.toLowerCase()}`;
  selectedMedia.set(url, filename);
  return { src: `/assets/safari-crafters/${filename}`, alt, credit };
}

function imageSet(page, title, max = 8) {
  const urls = imagesFromMarkdown(page.body).slice(0, max);
  const fallback = "https://www.safaricrafters.com/wp-content/uploads/2026/01/Ranthambhore.jpg";
  const hero = localImage(urls[0] ?? fallback, title);
  const gallery = urls.slice(1).map((url, index) => localImage(url, `${title} gallery image ${index + 1}`));
  return { hero, gallery };
}

function sentence(text, max = 180) {
  const first = text.split(/(?<=[.!?])\s+/)[0] || text;
  return first.length <= max ? first : `${first.slice(0, max).replace(/\s+\S*$/, "")}.`;
}

function durationFromBody(page) {
  const match = page.body.match(/_(\d+\s+nights?\s+\|\s+\d+\s+days?)_/i) ?? page.body.match(/(\d+\s+nights?\s+\|\s+\d+\s+days?)/i);
  return match ? match[1].replace(/\s+\|\s+/, " / ") : "Customisable private journey";
}

function routeFromBody(page, slug) {
  const match = page.body.match(/_Route:\s*([^_]+)_/i);
  if (match) return stripMarkdown(match[1]);
  const route = routeRegions[slug];
  return route ? route.join(" - ") : "Designed around season, access and wildlife movement";
}

function daysFromPage(page) {
  const body = cleanBody(page);
  const dayMatches = [...body.matchAll(/^#{5,6}\s+(.+)$/gm)].filter((match) => {
    const heading = stripMarkdown(match[1]);
    return !["Itinerary at a Glance", "Inclusions", "Exclusions"].includes(heading) && !heading.includes("$");
  });
  if (dayMatches.length) {
    return dayMatches.slice(0, 12).map((match, index) => {
      const start = match.index + match[0].length;
      const end = dayMatches[index + 1]?.index ?? body.length;
      const copy = paragraphs({ ...page, body: body.slice(start, end) })[0] ?? "A privately guided day shaped around wildlife movement, light and comfort.";
      return { title: stripMarkdown(match[1]), copy: sentence(copy, 300) };
    });
  }
  const labels = bulletsAfter(page, "Detailed itinerary").length ? bulletsAfter(page, "Detailed itinerary") : bulletsAfter(page, "Itinerary at a Glance");
  const detailed = sectionParagraphs(page, "Detailed itinerary", labels.length || 6);
  const source = labels.length ? labels : ["Arrival and orientation", "Private safari days", "Departure or extension"];
  return source.map((item, index) => ({
    title: item.replace(/^Day[s]?\s*\d+[-–]?\d*:?\s*/i, "").replace(/^Days\s*\d+[-–]\d+\s*/i, "").trim(),
    copy: sentence(detailed[index] ?? "This stage is arranged with private logistics, expert naturalists and time in the field calibrated to the season.", 320),
  }));
}

function bodySections(page) {
  return paragraphs(page)
    .filter((paragraph) => !paragraph.startsWith("Customize This Journey"))
    .slice(0, 12);
}

function makeDestination(page) {
  const slug = slugFromUrl(page.meta.url);
  const title = titleFromPage(page);
  const text = paragraphs(page);
  const { hero, gallery } = imageSet(page, title, 10);
  return {
    slug,
    title,
    region: destinationRegions[slug] ?? "Safari Crafters destination",
    bestMonths: destinationBestMonths[slug] ?? "Seasonal, by specialist recommendation",
    wildlife: destinationWildlife[slug] ?? "Signature wildlife, birds and landscape-led encounters",
    photography: "Landscape, behaviour, light and private naturalist-led field time",
    description: sentence(text[0] ?? page.meta.title, 165),
    homepageCaption: sentence(text[1] ?? text[0] ?? page.meta.title, 120),
    homepageMeta: destinationBestMonths[slug] ?? "Private safari",
    intro: text.slice(0, 2).join(" "),
    image: hero,
    gallery,
    highlights: bulletsAfter(page, "Highlights").slice(0, 6),
    journeys: [],
    expeditions: [],
  };
}

function makeJourney(page) {
  const slug = slugFromUrl(page.meta.url);
  const title = titleFromPage(page);
  const text = paragraphs(page);
  const { hero, gallery } = imageSet(page, title, 10);
  return {
    slug,
    title,
    category: "Signature Safari Route",
    region: stateRegions[slug]?.join(", ") ?? "India",
    duration: durationFromBody(page),
    groupSize: "Private, bespoke group size",
    bestMonths: "Seasonal, by specialist recommendation",
    difficulty: title.toLowerCase().includes("snow leopard") || title.toLowerCase().includes("ladakh") ? "Moderate to demanding" : "Gentle to moderate",
    price: "On request",
    description: sentence(text[0] ?? page.meta.title, 170),
    intro: text.slice(0, 2).join(" "),
    image: hero,
    gallery,
    highlights: (bulletsAfter(page, "Highlights").length ? bulletsAfter(page, "Highlights") : sectionParagraphs(page, "Highlights", 4)).slice(0, 8),
    route: routeFromBody(page, slug),
    locations: routeRegions[slug] ?? [],
    statesOrRegions: stateRegions[slug] ?? [],
    inclusions: bulletsAfter(page, "Inclusions"),
    exclusions: bulletsAfter(page, "Exclusions"),
    destinations: routeRegions[slug] ?? [],
    days: daysFromPage(page),
    specialist: "Safari Crafters",
    body: bodySections(page),
  };
}

function makeExpedition(page) {
  const slug = slugFromUrl(page.meta.url);
  const title = titleFromPage(page);
  const text = paragraphs(page);
  const { hero, gallery } = imageSet(page, title, 12);
  const date = page.body.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s+\d{4}/i)?.[0];
  const guide = page.body.match(/Guide:\s*([^\n]+)/i)?.[1]?.trim() ?? "Safari Crafters specialist";
  const price = page.body.match(/######\s*(\$[0-9,]+)/)?.[1];
  return {
    slug,
    title,
    category: "Photo Expedition",
    skill: "Photography-led private or small-group safari",
    groupSize: page.body.match(/Spaces:\s*([^\n]+)/i)?.[1]?.trim() ?? "Small group or private departure",
    bestMonths: date ?? "Seasonal departure",
    species: "Wildlife and landscape focus shaped by destination",
    equipment: "A tailored packing and camera note is shared before departure",
    description: sentence(text[0] ?? page.meta.title, 170),
    intro: text.slice(0, 2).join(" "),
    image: hero,
    gallery,
    mentor: guide,
    guide,
    date,
    price: price ?? "On request",
    route: routeFromBody(page, slug),
    highlights: (bulletsAfter(page, "Highlights").length ? bulletsAfter(page, "Highlights") : sectionParagraphs(page, "Highlights", 4)).slice(0, 8),
    inclusions: bulletsAfter(page, "Inclusions"),
    exclusions: bulletsAfter(page, "Exclusions"),
    days: daysFromPage(page),
    body: bodySections(page),
  };
}

function makeJournal(page) {
  const slug = slugFromUrl(page.meta.url).replace(/^achieving-/, "achieving-");
  const title = titleFromPage(page);
  const text = paragraphs(page);
  const { hero, gallery } = imageSet(page, title, 6);
  const dateRead = page.body.match(/_([^_]*\d{4}\s*\/\s*[^_]+Read)_/)?.[1]?.split("/").map((part) => part.trim());
  return {
    slug,
    title,
    category: title.toLowerCase().includes("photography") || title.toLowerCase().includes("angle") || title.toLowerCase().includes("golden") ? "Photography" : "Safari Intelligence",
    author: "Safari Crafters",
    date: dateRead?.[0] ?? "2026",
    readTime: dateRead?.[1] ?? "5 min read",
    description: sentence(text[0] ?? page.meta.title, 170),
    body: text.slice(1, 12),
    quote: sentence(text.at(-1) ?? text[0] ?? "Travel well enough to let the wild remain the centre of the story.", 180),
    image: hero,
    gallery,
  };
}

const pages = pageFiles.map(readPage);
const destinations = pages.filter((page) => page.meta.url?.includes("/destinations/") && page.meta.url !== "https://www.safaricrafters.com/destinations/").map(makeDestination);
const journeys = pages.filter((page) => page.meta.url?.includes("/itineraries/") && page.meta.url !== "https://www.safaricrafters.com/itineraries/").map(makeJourney);
const expeditions = pages.filter((page) => page.meta.url?.includes("/tours/") && page.meta.url !== "https://www.safaricrafters.com/tours/").map(makeExpedition);
const journal = pages.filter((page) => page.meta.url?.includes("/blogs/") && page.meta.url !== "https://www.safaricrafters.com/blogs/").map(makeJournal);

const byTitle = (a, b) => a.title.localeCompare(b.title);
destinations.sort(byTitle);
journeys.sort(byTitle);
expeditions.sort(byTitle);
journal.sort((a, b) => a.title.localeCompare(b.title));

for (const destination of destinations) {
  destination.journeys = journeys.filter((journey) => journey.route?.toLowerCase().includes(destination.title.toLowerCase().split(" ")[0])).map((journey) => journey.title);
  destination.expeditions = expeditions.filter((expedition) => expedition.route?.toLowerCase().includes(destination.title.toLowerCase().split(" ")[0]) || expedition.title.toLowerCase().includes(destination.title.toLowerCase().split(" ")[0])).map((expedition) => expedition.title);
}

function js(value) {
  return JSON.stringify(value, null, 2).replace(/"([^"]+)":/g, "$1:");
}

const heroImage = localImage("https://www.safaricrafters.com/wp-content/uploads/2026/01/Ranthambhore.jpg", "Tiger country at Ranthambhore");

const dataTs = `export type ImageAsset = {
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

export const heroImage: ImageAsset = ${js(heroImage)};

export const navItems = [
  { href: "/journeys", label: "Journeys" },
  { href: "/destinations", label: "Destinations" },
  { href: "/photo-expeditions", label: "Photo Expeditions" },
  { href: "/journal", label: "The Journal" },
  { href: "/about", label: "About" }
];

export const journeyCategories = [
  "Signature Safari Routes",
  "Private India Safaris",
  "High Himalaya",
  "Big Cat Journeys",
  "Heritage and Wildlife",
  "International Wilderness"
];

export const expeditionCategories = [
  "Photography-led Departures",
  "Big Cat Expeditions",
  "Arctic and Wetland Expeditions",
  "Private Mentorship Safaris"
];

export const journalCategories = [
  "Photography",
  "Safari Intelligence",
  "People & Places",
  "Field Notes"
];

export const specialists: Specialist[] = ${js([
  {
    name: "Gaurav Ramnarayanan",
    role: "Photography Specialist",
    expertise: "Big cats, field craft, ethical wildlife photography and private mentorship",
    bio: "Gaurav shapes photographic journeys around patience, animal behaviour and the discipline of staying ready without disturbing the field.",
    moment: "He is at his best when a guest has stopped chasing frames and started reading the forest.",
    image: destinations.find((item) => item.slug === "ranthambhore")?.image ?? heroImage,
  },
  {
    name: "Sachin Vats",
    role: "India Safari Specialist",
    expertise: "Central India, Rajasthan, Gujarat, Himalayan tracking and family safaris",
    bio: "Sachin designs India journeys with quiet logistics, trusted naturalists and lodges chosen for access rather than noise.",
    moment: "He knows when a route needs one more night, one quieter gate, or one slower morning.",
    image: destinations.find((item) => item.slug === "jawai")?.image ?? heroImage,
  },
  {
    name: "Safari Crafters Field Team",
    role: "Naturalist Network",
    expertise: "Responsible operators, private guides, local trackers and conservation-led hosting",
    bio: "The field team connects guests with the people who know each landscape intimately, from river systems and forests to high-altitude snowline.",
    moment: "Their work is visible in the detail guests never have to worry about.",
    image: destinations.find((item) => item.slug === "kaziranga")?.image ?? heroImage,
  },
])};

export const journeys: Journey[] = ${js(journeys)};

export const destinations: Destination[] = ${js(destinations)};

export const expeditions: Expedition[] = ${js(expeditions)};

export const journal: JournalArticle[] = ${js(journal)};

export const testimonials = [
  {
    name: "Private family guest",
    city: "Mumbai",
    trip: "Ranthambhore and Jawai",
    quote: "Every day felt considered, from the lodge rhythm to the naturalist who knew when to wait."
  },
  {
    name: "Wildlife photographer",
    city: "Bengaluru",
    trip: "Snow Leopard country",
    quote: "The preparation was as valuable as the sighting. The team made the mountains feel possible."
  },
  {
    name: "Returning safari traveller",
    city: "London",
    trip: "Pantanal Wetlands",
    quote: "It was clearly built by people who understand both wildlife and the small comforts that keep you present."
  }
];

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
`;

fs.writeFileSync(dataOut, dataTs);
fs.writeFileSync(mediaOut, JSON.stringify([...selectedMedia.entries()].map(([url, filename]) => ({ url, filename })), null, 2));

console.log(`Generated ${dataOut}`);
console.log(`Selected ${selectedMedia.size} media assets`);
console.log(`Destinations: ${destinations.length}, journeys: ${journeys.length}, expeditions: ${expeditions.length}, journal: ${journal.length}`);
