import { heroImage, type Destination, type ImageAsset, type Journey } from "@/lib/data";

export type HeroMedia = {
  type: "video" | "image";
  videoMp4?: string;
  videoWebm?: string;
  posterImage: ImageAsset;
  mobilePosterImage: ImageAsset;
  alt: string;
  credit: string;
};

export type FieldIntelligence = {
  airport: string;
  transfer: string;
  idealStay: string;
  safariRhythm: string;
  accessNote: string;
};

export type JourneyIntelligence = {
  idealFor: string;
  transfers: string;
  comfort: string;
  wildlifeExpectation: string;
  photography: string;
};

const defaultFieldIntelligence: FieldIntelligence = {
  airport: "Planned by the Safari Crafters team",
  transfer: "Private road transfers or air routing arranged to suit the final route.",
  idealStay: "3-4 nights for a focused wilderness stay.",
  safariRhythm: "Morning and afternoon drives, with downtime protected between safaris.",
  accessNote: "Gate, guide and lodge decisions are made around season, sightings and crowd patterns."
};

export const heroMedia: HeroMedia = {
  type: "video",
  videoMp4: process.env.NEXT_PUBLIC_HERO_VIDEO_MP4 || undefined,
  videoWebm: process.env.NEXT_PUBLIC_HERO_VIDEO_WEBM || undefined,
  posterImage: heroImage,
  mobilePosterImage: heroImage,
  alt: "Private wildlife safari in tiger country",
  credit: "Safari Crafters archive"
};

export const luxuryProof = [
  {
    value: "Founded 2018",
    label: "Built by wildlife people, not package sellers."
  },
  {
    value: "Private by design",
    label: "Routes, naturalists, lodges and transfers shaped around each guest."
  },
  {
    value: "Field-led",
    label: "Planning informed by park seasons, permits, sightings and forest rhythm."
  },
  {
    value: "Discreet planning",
    label: "Suitable for founders, families, photographers and assistants planning quietly."
  }
];

export const atelierPillars = [
  {
    title: "Private planning",
    copy: "Every enquiry becomes a considered brief: pace, privacy, lodge style, sighting priorities and traveller preferences."
  },
  {
    title: "Field intelligence",
    copy: "Specialists account for zones, gates, permits, transfer timing, naturalist quality and seasonal animal movement."
  },
  {
    title: "Seamless comfort",
    copy: "Lodges, vehicles, rest time, meals and arrival logistics are planned so the wilderness feels immersive, not chaotic."
  },
  {
    title: "Purposeful access",
    copy: "Journeys are shaped around ethical viewing, low-crowd windows, specialist guides and conservation-aware operators."
  }
];

export const hospitalitySignals = [
  "Lodge and camp choices based on privacy, guiding quality, access and comfort.",
  "Private vehicles, specialist naturalists and photography-aware routing where appropriate.",
  "Downtime protected between drives for dining, pool time, wellness or family rest.",
  "Airport assistance, private transfers and optional air routing planned before confirmation.",
  "Honest expectation-setting: no guaranteed sightings, no rushed itineraries, no crowded checklist travel."
];

export const privacySignals = [
  "A short enquiry can be completed by the traveller, assistant or family office.",
  "WhatsApp and email remain available without aggressive popups or pressure tactics.",
  "Names, dates and personal preferences are handled as private planning inputs.",
  "The first response is from a human specialist, not an automated package quote."
];

const fieldBySlug: Record<string, FieldIntelligence> = {
  ranthambhore: {
    airport: "Jaipur or Delhi",
    transfer: "Private transfer from Jaipur, or Delhi routing when paired with Agra or onward Rajasthan.",
    idealStay: "3-4 nights for multiple zones and varied light.",
    safariRhythm: "Two drives daily, with zone strategy adjusted by season, tigress movement and guest pace.",
    accessNote: "Zone requests, guide pairing and lodge location matter more than simply adding extra drives."
  },
  bandhavgarh: {
    airport: "Jabalpur",
    transfer: "Private road transfer into tiger country; works well with Kanha or Panna.",
    idealStay: "3-4 nights for tiger-focused travel.",
    safariRhythm: "Early starts, heat-aware afternoon drives and naturalist-led debriefs.",
    accessNote: "Best planned around gate availability and current movement rather than generic tiger density claims."
  },
  kanha: {
    airport: "Jabalpur, Raipur or Nagpur",
    transfer: "Private transfer selected by lodge gate and wider Central India circuit.",
    idealStay: "3-4 nights for forest depth and relaxed pacing.",
    safariRhythm: "Dawn drives through sal forest, quiet afternoons and patient tracking.",
    accessNote: "Excellent for travellers who want forest atmosphere, barasingha, birds and tigers without rushing."
  },
  jawai: {
    airport: "Udaipur or Jodhpur",
    transfer: "Private road transfer through Rajasthan; pairs beautifully with Udaipur, Jodhpur or Ranthambhore.",
    idealStay: "2-3 nights for leopard country and granite landscapes.",
    safariRhythm: "Early and late drives around boulders, villages, temples and water systems.",
    accessNote: "A specialist guide is essential for ethical leopard viewing in a shared human-wildlife landscape."
  },
  gir: {
    airport: "Rajkot, Diu or Ahmedabad",
    transfer: "Private transfer depending on route; pairs with Little Rann of Kutch or Gujarat extensions.",
    idealStay: "2-3 nights for Asiatic lion and dry-forest wildlife.",
    safariRhythm: "Permit-led drives with heat-aware timing and patient tracking.",
    accessNote: "Planning focuses on comfort, permit timing and honest expectation-setting in lion country."
  },
  kaziranga: {
    airport: "Jorhat or Guwahati",
    transfer: "Private transfer into Assam’s floodplains; season and park range determine the best base.",
    idealStay: "3 nights for rhino, elephant grass, birds and riverine landscapes.",
    safariRhythm: "Jeep safaris across ranges, with wetlands and birding folded into the rhythm.",
    accessNote: "Best after monsoon recedes, when grassland access and visibility improve."
  },
  kenya: {
    airport: "Nairobi",
    transfer: "Light aircraft and private road transfers into conservancies or reserves.",
    idealStay: "5-7 nights across conservancy and migration country.",
    safariRhythm: "Private guiding, early starts, golden-hour drives and optional specialist photographic days.",
    accessNote: "Private conservancies and guide selection create the difference between busy safari and rare access."
  },
  "spiti-valley": {
    airport: "Chandigarh or Delhi",
    transfer: "High-altitude road routing with buffer days for weather and acclimatisation.",
    idealStay: "7-10 nights for snow leopard tracking.",
    safariRhythm: "Slow scans, patient tracking, warm returns and careful altitude management.",
    accessNote: "This is an earned expedition; readiness, layers, guides and patience define the experience."
  },
  svalbard: {
    airport: "Longyearbyen",
    transfer: "Expedition routing by vessel and Arctic conditions.",
    idealStay: "8-10 nights for ice, light and wildlife possibility.",
    safariRhythm: "Weather-led expedition days with photography, observation and safety-led flexibility.",
    accessNote: "The Arctic rewards flexibility; itinerary certainty is less important than expedition judgment."
  },
  brazil: {
    airport: "Cuiaba for Pantanal routing",
    transfer: "Private transfer or light-air routing depending on lodge and season.",
    idealStay: "5-7 nights for jaguar, wetlands and birdlife.",
    safariRhythm: "Boat-based tracking, low-angle photography and heat-aware rest windows.",
    accessNote: "Water level, boat access and lodge position shape the quality of a Pantanal journey."
  },
  chile: {
    airport: "Punta Arenas or Puerto Natales",
    transfer: "Private road transfers into Patagonia with weather-aware timing.",
    idealStay: "5-7 nights for puma tracking and landscapes.",
    safariRhythm: "Long field days, wind-aware pacing, landscape work and specialist tracking.",
    accessNote: "Success depends on expert trackers, patience and a flexible relationship with weather."
  },
  uganda: {
    airport: "Entebbe",
    transfer: "Private road or air routing depending on gorilla permit timing and lodge choice.",
    idealStay: "5-8 nights for primates and forest depth.",
    safariRhythm: "Permit-led trekking, forest walks and rest time between intensive field days.",
    accessNote: "Permit planning and physical readiness are central to a seamless primate journey."
  },
  panna: {
    airport: "Khajuraho",
    transfer: "Private transfer from Khajuraho or Central India circuit routing.",
    idealStay: "2-3 nights paired with culture or tiger landscapes.",
    safariRhythm: "River, forest and open-country safaris with strong birding potential.",
    accessNote: "A refined choice for travellers who want quieter Central India texture beyond the obvious names."
  }
};

export function getFieldIntelligence(destination: Destination) {
  return fieldBySlug[destination.slug] ?? defaultFieldIntelligence;
}

export function getJourneyIntelligence(journey: Journey): JourneyIntelligence {
  const route = journey.route || journey.destinations.join(" · ");
  return {
    idealFor: journey.category.toLowerCase().includes("photo")
      ? "Photographers and returning safari travellers who value patience, light and specialist field craft."
      : "Private travellers, families or assistants seeking a route shaped around wildlife depth and comfort.",
    transfers: route
      ? `Private transfers and air routing are planned around ${route}, with buffers where terrain or permits demand it.`
      : "Transfers are planned privately, with air routing considered when it protects time and comfort.",
    comfort:
      "Lodges are selected for access, privacy, naturalist quality, food, rest time and the ability to keep the day unhurried.",
    wildlifeExpectation:
      "Sightings are never guaranteed. The route is designed to increase meaningful time in the right habitat, with honest guidance before departure.",
    photography:
      "Vehicle position, guide pairing, light, lens needs and patient field behaviour are considered before the itinerary is confirmed."
  };
}
