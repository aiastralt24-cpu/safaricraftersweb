import type { DayPlan } from "@/lib/data";

export function Itinerary({ days, title = "Day by day" }: { days: DayPlan[]; title?: string }) {
  return (
    <div className="container timeline">
      <h2 className="h2">{title}</h2>
      {days.map((day, index) => (
        <details className="timeline-item" key={`${day.title}-${index}`} open={index === 0}>
          <summary><span className="timeline-day-label">{day.label ?? `Day ${index + 1}`}</span><span className="h3">{day.title}</span><span className="timeline-toggle" aria-hidden="true" /></summary>
          <div className="timeline-copy"><p>{day.copy}</p>{day.stay ? <p className="muted">Stay: {day.stay}</p> : null}</div>
        </details>
      ))}
    </div>
  );
}
