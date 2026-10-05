import { destinations, journeys, slugifyAtlasValue, type Destination, type FAQItem, type Journey } from "@/lib/data";
import { getFieldIntelligence, getJourneyIntelligence } from "@/lib/luxury";

export function getDestinationFaqs(destination: Destination): FAQItem[] {
  if (destination.faqs?.length) return destination.faqs;
  const field = getFieldIntelligence(destination);
  return [
    {
      question: `When is the best time to visit ${destination.title}?`,
      answer: `${destination.bestMonths} is the planning window currently used for ${destination.title}. Final timing should be checked against local conditions, access and the wildlife priorities in your private brief.`
    },
    {
      question: `How long should I stay in ${destination.title}?`,
      answer: destination.idealStay || field.idealStay
    },
    {
      question: `What wildlife is ${destination.title} known for?`,
      answer: `${destination.wildlife} Safari Crafters plans each visit around habitat, season and ethical viewing rather than guaranteed sightings.`
    },
    {
      question: `How do I reach ${destination.title}?`,
      answer: destination.access || `${field.airport} is the practical starting point currently used in our planning notes. ${field.transfer}`
    }
  ];
}

export function getJourneyFaqs(journey: Journey): FAQItem[] {
  if (journey.faqs?.length) return journey.faqs;
  const intelligence = getJourneyIntelligence(journey);
  return [
    {
      question: `Is ${journey.title} a fixed itinerary?`,
      answer: journey.customizationNote || "No. This is a private journey blueprint. Dates, pacing, lodge character, transfers and field priorities are refined around the guest before confirmation."
    },
    {
      question: `Who is ${journey.title} best suited to?`,
      answer: journey.idealGuest || intelligence.idealFor
    },
    {
      question: `When is the best time for this journey?`,
      answer: `${journey.bestMonths}. The final recommendation also considers weather, access, permits and the wildlife encounters most important to you.`
    },
    {
      question: "Are wildlife sightings guaranteed?",
      answer: intelligence.wildlifeExpectation
    }
  ];
}

export function getDestinationPairings(destination: Destination) {
  if (destination.pairings?.length) return destination.pairings;
  return destinations
    .filter((item) => item.slug !== destination.slug && item.country === destination.country)
    .slice(0, 3)
    .map((item) => ({
      slug: item.slug,
      title: item.title,
      reason: `A considered pairing within ${destination.country}, subject to season and route design.`
    }));
}

export function getRelatedJourneys(destination: Destination) {
  const named = new Set(destination.journeys.map((title) => title.toLowerCase()));
  return journeys.filter(
    (journey) => named.has(journey.title.toLowerCase()) || journey.destinations.some((name) => slugifyAtlasValue(name) === destination.slug)
  );
}

export function destinationSeo(destination: Destination) {
  const title = destination.seo?.title || `Luxury ${destination.title} Safari Planning`;
  return {
    title: title.replace(/\s*\|\s*Safari Crafters\s*$/i, ""),
    description:
      destination.seo?.description ||
      `Plan a private safari to ${destination.title}, ${destination.country}, with guidance on season, wildlife, access, photography and considered places to stay.`
  };
}

export function journeySeo(journey: Journey) {
  return {
    title: journey.seo?.title || `${journey.title} Private Safari`,
    description:
      journey.seo?.description ||
      `Refine a private ${journey.title} safari with specialist guidance on route, season, wildlife, accommodation, transfers and unhurried pacing.`
  };
}
