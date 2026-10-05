import type { DayPlan } from "@/lib/data";
import stageDefinitions from "@/content/journey-itinerary-stages.json";

type Stage = { label: string; title: string; summary?: string; labels: string[] };
const definitions: Record<string, Stage[]> = stageDefinitions;

export function JourneyItinerary({ days, slug, duration }: { days: DayPlan[]; slug: string; duration: string }) {
  const configured = definitions[slug];
  const expectedLabels = configured?.flatMap((stage) => stage.labels);
  const canGroup = expectedLabels?.length === days.length && days.every((day, index) => day.label === expectedLabels[index]);
  // If the itinerary changes, show every supplied entry rather than drop any days.
  const stages = canGroup && configured
    ? configured.map((stage) => ({ ...stage, days: days.filter((day) => stage.labels.includes(day.label || "")) }))
    : days.map((day, index) => ({ label: day.label || `Stage ${index + 1}`, title: day.title, summary: undefined, days: [day] }));
  if (!stages.length) return null;

  return (
    <div className="container timeline journey-stages">
      <div className="journey-stages-heading">
        <p className="eyebrow">{duration} · {stages.length} stages</p>
        <h2 className="h2">{days.some((day) => day.label) ? "Day by day" : "Journey stages"}</h2>
        <p>See the journey at a glance. Open a stage for the full details.</p>
      </div>
      <div className="journey-stages-list">
        {stages.map((stage, index) => (
          <details className="journey-stage" name={`journey-stages-${slug}`} key={`${stage.title}-${index}`}>
            <summary>
              <span className="timeline-day-label">{stage.label}</span>
              <span className="journey-stage-overview"><span className="journey-stage-title">{stage.title}</span>{stage.summary && <span className="journey-stage-description">{stage.summary}</span>}</span>
              <span className="timeline-toggle" aria-hidden="true" />
            </summary>
            <div className="journey-stage-days">
              {stage.days.map((day, dayIndex) => (
                <div className="journey-stage-day" key={dayIndex}>
                  {stage.days.length > 1 && <h3>{day.label} · {day.title}</h3>}
                  {day.copy.split(/\n\s*\n/).map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}
                  {day.stay && <p className="muted">Stay: {day.stay}</p>}
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
