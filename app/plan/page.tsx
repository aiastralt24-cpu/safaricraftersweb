import { Metadata } from "next";
import { PlannerForm } from "@/components/PlannerForm";
import { getDestination, getExpedition, getJourney } from "@/lib/data";
import "../forms.css";

export const metadata: Metadata = {
  title: "Plan a Private Safari",
  description: "Share a discreet private safari brief with Safari Crafters and receive a considered response from a wildlife travel specialist.",
  alternates: { canonical: "/plan" }
};

type PlanPageProps = {
  searchParams: Promise<{
    journey?: string;
    destination?: string;
    expedition?: string;
    region?: string;
    specialist?: string;
    guided?: string;
  }>;
};

export default async function PlanPage({ searchParams }: PlanPageProps) {
  const params = await searchParams;
  const initialContext = getInitialContext(params);

  return (
    <section className="plan-page">
      <div className="container plan-intro">
        <p className="eyebrow">Private safari brief</p>
        <h1 className="display">Begin quietly.</h1>
        <p>Private, precise, specialist-led.</p>
      </div>
      <PlannerForm initialContext={initialContext} />
    </section>
  );
}

function plannerRegion(value?: string) {
  const normalized = value?.toLowerCase() || "";
  if (normalized.includes("india")) return "India";
  if (normalized.includes("africa")) return "Africa";
  if (normalized.includes("america")) return "The Americas";
  if (normalized.includes("arctic") || normalized.includes("norway")) return "Arctic & Beyond";
  if (normalized.includes("surprise")) return "Surprise me";
  return undefined;
}

function destinationExperiences(destination: NonNullable<ReturnType<typeof getDestination>>) {
  const wildlife = destination.wildlife.toLowerCase();
  if (wildlife.includes("tiger")) return ["Tigers", "Photography hides"];
  if (wildlife.includes("jaguar")) return ["Jaguars", "Photography hides"];
  if (wildlife.includes("gorilla") || wildlife.includes("chimpanzee")) return ["Great apes"];
  if (wildlife.includes("polar") || wildlife.includes("bear")) return ["Polar wildlife", "Photography hides"];
  if (wildlife.includes("bird")) return ["Birdlife"];
  return destination.continent === "Africa" ? ["Big Cats of Africa"] : ["Cultural immersion"];
}

function contextualExperiences(value: string, region: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("tiger")) return ["Tigers", "Photography hides"];
  if (normalized.includes("leopard")) return ["Leopards", "Photography hides"];
  if (normalized.includes("jaguar") || normalized.includes("pantanal")) return ["Jaguars", "Photography hides"];
  if (normalized.includes("gorilla") || normalized.includes("chimpanzee") || normalized.includes("ape")) return ["Great apes"];
  if (normalized.includes("polar") || normalized.includes("bear") || normalized.includes("svalbard")) return ["Polar wildlife", "Photography hides"];
  if (normalized.includes("bird")) return ["Birdlife", "Photography hides"];
  if (region === "Africa") return ["Big Cats of Africa"];
  if (region === "Arctic & Beyond") return ["Polar wildlife"];
  return ["Cultural immersion"];
}

function getInitialContext(params: { journey?: string; destination?: string; expedition?: string; region?: string; specialist?: string; guided?: string }) {
  const requestedRegion = plannerRegion(params.region);
  if (params.guided === "true") {
    return {
      sourceLabel: "Guided Bespoke Safari",
      region: requestedRegion || "Surprise me",
      types: ["Private"],
      experiences: requestedRegion ? contextualExperiences("wildlife photography", requestedRegion) : [],
      notes: "I would like to add a dedicated Safari Crafters guide to my private journey.",
      specialist: params.specialist || "Auto-route"
    };
  }
  if (params.journey) {
    const journey = getJourney(params.journey);
    if (journey) {
      const region = plannerRegion(journey.region) || requestedRegion || "Surprise me";
      return {
        sourceLabel: journey.title,
        region,
        types: [journey.category.includes("Ultra") ? "Ultra-Luxury" : "Private"],
        experiences: contextualExperiences(`${journey.title} ${journey.wildlifeFocus}`, region),
        notes: `I am interested in ${journey.title}.`,
        specialist: params.specialist || journey.specialist.split(" ")[0]
      };
    }
  }

  if (params.destination) {
    const destination = getDestination(params.destination);
    if (destination) {
      return {
        sourceLabel: destination.title,
        region: plannerRegion(destination.continent) || requestedRegion || "Surprise me",
        types: ["Private"],
        experiences: destinationExperiences(destination),
        notes: destination.status === "concierge"
          ? `I am interested in a private brief for ${destination.title}.`
          : `I am interested in travelling to ${destination.title}.`,
        specialist: params.specialist || "Kairav"
      };
    }
  }

  if (params.expedition) {
    const expedition = getExpedition(params.expedition);
    if (expedition) {
      const region = plannerRegion(expedition.category) || plannerRegion(expedition.title) || requestedRegion || "Surprise me";
      return {
        sourceLabel: expedition.title,
        region,
        types: ["Photo-led"],
        experiences: contextualExperiences(`${expedition.title} ${expedition.species}`, region),
        notes: `I am interested in ${expedition.title}.`,
        specialist: params.specialist || expedition.mentor.split(" ")[0]
      };
    }
  }

  if (requestedRegion || params.specialist) {
    return {
      region: requestedRegion,
      specialist: params.specialist
    };
  }

  return undefined;
}
