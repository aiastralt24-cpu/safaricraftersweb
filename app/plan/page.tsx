import { Metadata } from "next";
import { PlannerForm } from "@/components/PlannerForm";
import { getDestination, getExpedition, getJourney } from "@/lib/data";
import "../forms.css";

export const metadata: Metadata = {
  title: "Plan a Private Safari",
  description: "Share a discreet private safari brief with Safari Crafters and receive a specialist response."
};

type PlanPageProps = {
  searchParams: Promise<{
    journey?: string;
    destination?: string;
    expedition?: string;
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

function getInitialContext(params: { journey?: string; destination?: string; expedition?: string }) {
  if (params.journey) {
    const journey = getJourney(params.journey);
    if (journey) {
      return {
        sourceLabel: journey.title,
        region: journey.region.includes("Africa") ? "Africa" : "India",
        types: [journey.category.includes("Ultra") ? "Ultra-Luxury" : "Private"],
        experiences: journey.title.toLowerCase().includes("tiger") ? ["Tigers", "Photography hides"] : ["Big Cats of Africa"],
        notes: `I am interested in ${journey.title}.`,
        specialist: journey.specialist.split(" ")[0]
      };
    }
  }

  if (params.destination) {
    const destination = getDestination(params.destination);
    if (destination) {
      return {
        sourceLabel: destination.title,
        region: destination.region.includes("Kenya") || destination.region.includes("Brazil") ? "Africa" : "India",
        types: ["Private"],
        experiences: destination.wildlife.toLowerCase().includes("tiger")
          ? ["Tigers", "Photography hides"]
          : ["Big Cats of Africa"],
        notes: `I am interested in travelling to ${destination.title}.`,
        specialist: "Kairav"
      };
    }
  }

  if (params.expedition) {
    const expedition = getExpedition(params.expedition);
    if (expedition) {
      return {
        sourceLabel: expedition.title,
        region: expedition.category.includes("Africa") ? "Africa" : "India",
        types: ["Photo-led"],
        experiences: expedition.species.toLowerCase().includes("bird")
          ? ["Birdlife", "Photography hides"]
          : ["Tigers", "Photography hides"],
        notes: `I am interested in ${expedition.title}.`,
        specialist: expedition.mentor.split(" ")[0]
      };
    }
  }

  return undefined;
}
