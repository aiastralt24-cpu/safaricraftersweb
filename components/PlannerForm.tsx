"use client";

import { FormEvent, useMemo, useState } from "react";
import { Check } from "lucide-react";
import "./PlannerForm.css";

const regions = ["India", "Africa", "Surprise me"];
const journeyTypes = ["Private", "Family", "Conservation", "Ultra-Luxury", "Small Group", "Photo-led"];
const experiences = [
  "Tigers",
  "Big Cats of Africa",
  "Birdlife",
  "Photography hides",
  "Walking safaris",
  "Cultural immersion",
  "Conservation work",
  "Family-friendly camps"
];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type PlannerInitialContext = {
  sourceLabel?: string;
  region?: string;
  types?: string[];
  experiences?: string[];
  notes?: string;
  specialist?: string;
};

export function PlannerForm({ initialContext }: { initialContext?: PlannerInitialContext }) {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    region: initialContext?.region || "India",
    types: initialContext?.types || ["Private"],
    experiences: initialContext?.experiences || ["Tigers"],
    months: ["Mar"],
    year: "2026",
    nights: "7",
    travellers: "2",
    name: "",
    email: "",
    phone: "",
    city: "",
    notes: initialContext?.notes || "",
    specialist: initialContext?.specialist || "Auto-route"
  });

  const steps = useMemo(
    () => [
      "Where shall we begin?",
      "What kind of journey?",
      "What should the wild hold?",
      "When and how long?",
      "Your details",
      "Review"
    ],
    []
  );

  function toggle(key: "types" | "experiences" | "months", value: string) {
    setForm((current) => {
      const set = new Set(current[key]);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      return { ...current, [key]: Array.from(set) };
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/enquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "planner", ...form })
    });
    if (response.ok) {
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <section className="planner-success" aria-live="polite">
        <Check size={36} />
        <h1 className="h2">Your brief has been received.</h1>
        <p>A Safari Crafters specialist will respond with considered next steps.</p>
      </section>
    );
  }

  return (
    <form className="planner" onSubmit={submit}>
      <div className="planner-shell">
        <aside className="planner-note" aria-label="Planner context">
          <div>
            <p className="eyebrow">Private concierge</p>
            <h2 className="serif">Private safari concierge.</h2>
          </div>
          <div className="planner-dots" aria-label={`Step ${step + 1} of ${steps.length}`}>
            {steps.map((item, index) => (
              <button
                key={item}
                type="button"
                aria-label={item}
                className={index === step ? "active" : ""}
                onClick={() => setStep(index)}
              />
            ))}
          </div>
        </aside>

        <div className="planner-card">
          <p className="planner-count">
            {String(step + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
          </p>
          {initialContext?.sourceLabel ? (
            <p className="prefill-note">Started from {initialContext.sourceLabel}</p>
          ) : null}
          <h1 className="h2">{steps[step]}</h1>

          {step === 0 ? (
            <div className="choice-grid">
              {regions.map((region) => (
                <button
                  type="button"
                  key={region}
                  className={form.region === region ? "choice selected" : "choice"}
                  onClick={() => setForm((current) => ({ ...current, region }))}
                >
                  <span>{region}</span>
                </button>
              ))}
            </div>
          ) : null}

          {step === 1 ? (
            <ChipGroup values={journeyTypes} selected={form.types} onToggle={(value) => toggle("types", value)} />
          ) : null}

          {step === 2 ? (
            <>
              <ChipGroup
                values={experiences}
                selected={form.experiences}
                onToggle={(value) => toggle("experiences", value)}
              />
              <label className="wide quiet-notes">
                Private brief
                <textarea
                  value={form.notes}
                  placeholder="Wildlife priorities, privacy needs, lodge style, aviation, family requirements or anything we should know."
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                />
              </label>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <ChipGroup values={months} selected={form.months} onToggle={(value) => toggle("months", value)} />
              <div className="field-grid planner-compact-fields">
                <label>
                  Year
                  <select
                    value={form.year}
                    onChange={(event) => setForm((current) => ({ ...current, year: event.target.value }))}
                  >
                    <option>2026</option>
                    <option>2027</option>
                    <option>Flexible</option>
                  </select>
                </label>
                <label>
                  Nights
                  <input
                    type="range"
                    min="3"
                    max="21"
                    value={form.nights}
                    onChange={(event) => setForm((current) => ({ ...current, nights: event.target.value }))}
                  />
                  <span>{form.nights}+ nights</span>
                </label>
                <label>
                  Travellers
                  <input
                    type="range"
                    min="1"
                    max="12"
                    value={form.travellers}
                    onChange={(event) => setForm((current) => ({ ...current, travellers: event.target.value }))}
                  />
                  <span>{form.travellers} guests</span>
                </label>
              </div>
            </>
          ) : null}

          {step === 4 ? (
            <div className="field-grid">
              <label>
                Name
                <input
                  required
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
              </label>
              <label>
                Email
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                />
              </label>
              <label>
                Phone / WhatsApp
                <input
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                />
              </label>
              <label>
                City
                <input
                  value={form.city}
                  onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                />
              </label>
            </div>
          ) : null}

          {step === 5 ? (
            <div className="review">
              <p>
                <strong>{form.region}</strong> · {form.types.join(", ")}
              </p>
              <p>{form.experiences.join(", ")}</p>
              <p>
                {form.months.join(", ")} {form.year} · {form.nights}+ nights · {form.travellers} guests
              </p>
            </div>
          ) : null}

          <div className="planner-actions">
            <button className="button" type="button" disabled={step === 0} onClick={() => setStep((value) => value - 1)}>
              Back
            </button>
            {step < steps.length - 1 ? (
              <button className="button button-solid" type="button" onClick={() => setStep((value) => value + 1)}>
                Continue
              </button>
            ) : (
              <button className="button button-solid" type="submit">
                Send Brief
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}

function ChipGroup({
  values,
  selected,
  onToggle
}: {
  values: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="chip-grid">
      {values.map((value) => (
        <button
          key={value}
          type="button"
          className={selected.includes(value) ? "chip selected" : "chip"}
          onClick={() => onToggle(value)}
        >
          {value}
        </button>
      ))}
    </div>
  );
}
