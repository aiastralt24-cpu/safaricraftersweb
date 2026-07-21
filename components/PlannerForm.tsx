"use client";

import { FormEvent, useMemo, useState } from "react";
import { Check } from "lucide-react";
import "./PlannerForm.css";

const regions = [
  { name: "India", copy: "Tiger forests, leopard country and the Himalaya" },
  { name: "Africa", copy: "Savannah, wetlands, primates and private conservancies" },
  { name: "The Americas", copy: "Rainforest, jaguar country and northern wilderness" },
  { name: "Arctic & Beyond", copy: "Expeditionary travel at the edge of the map" },
  { name: "Surprise me", copy: "Let our specialists recommend the right geography" }
];
const journeyTypes = ["Private", "Family", "Conservation", "Ultra-Luxury", "Small Group", "Photo-led"];
const experiencesByRegion: Record<string, string[]> = {
  India: ["Tigers", "Leopards", "Birdlife", "Photography hides", "Walking safaris", "Cultural immersion", "Conservation work", "Family-friendly camps"],
  Africa: ["Big Cats of Africa", "Great apes", "Birdlife", "Photography hides", "Walking safaris", "Cultural immersion", "Conservation work", "Family-friendly camps"],
  "The Americas": ["Jaguars", "Birdlife", "Photography hides", "Rainforest journeys", "Cultural immersion", "Conservation work", "Family-friendly camps"],
  "Arctic & Beyond": ["Polar wildlife", "Birdlife", "Photography hides", "Expedition cruising", "Cultural immersion", "Conservation work"],
  "Surprise me": ["Tigers", "Leopards", "Big Cats of Africa", "Jaguars", "Great apes", "Polar wildlife", "Birdlife", "Photography hides", "Walking safaris", "Expedition cruising", "Rainforest journeys", "Cultural immersion", "Conservation work", "Family-friendly camps"]
};
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const occasions = ["A private escape", "Family time", "Photography", "A celebration", "Conservation interest"];
const accommodationStyles = ["Quiet luxury", "Classic safari camps", "Design-led lodges", "A considered mix"];
const investmentRanges = ["Prefer to discuss", "US$8k-15k", "US$15k-30k", "US$30k+ per person"];

type PlannerInitialContext = {
  sourceLabel?: string;
  region?: string;
  types?: string[];
  experiences?: string[];
  notes?: string;
  specialist?: string;
};

export function PlannerForm({ initialContext }: { initialContext?: PlannerInitialContext }) {
  const initialRegion = initialContext?.region || "";
  const initialExperiences = (initialContext?.experiences || []).filter((experience) =>
    initialRegion ? experiencesByRegion[initialRegion]?.includes(experience) : false
  );
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [enquiryResult, setEnquiryResult] = useState<{ enquiryId: string; specialist: string } | null>(null);
  const [form, setForm] = useState({
    region: initialRegion,
    types: initialContext?.types || ["Private"],
    experiences: initialExperiences,
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
    ,occasion: "A private escape"
    ,flexibility: "Flexible by a few days"
    ,accommodation: "Quiet luxury"
    ,investment: "Prefer to discuss"
    ,contactPreference: "Email"
    ,consent: false
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

  function selectRegion(region: string) {
    const availableExperiences = experiencesByRegion[region] || [];
    setForm((current) => ({
      ...current,
      region,
      experiences: current.experiences.filter((experience) => availableExperiences.includes(experience))
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "planner", sourceLabel: initialContext?.sourceLabel, ...form })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We could not send your brief. Please try again.");
      setEnquiryResult({ enquiryId: result.enquiryId, specialist: result.specialist });
      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "We could not send your brief. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const stepValid = [
    Boolean(form.region),
    form.types.length > 0 && Boolean(form.occasion),
    form.experiences.length > 0,
    form.months.length > 0 && Boolean(form.year),
    Boolean(form.name.trim()) && /\S+@\S+\.\S+/.test(form.email),
    form.consent
  ][step];

  if (submitted) {
    return (
      <section className="planner-success" aria-live="polite">
        <Check size={36} />
        <h2 className="h2">Your brief has been received.</h2>
        <p>{enquiryResult?.specialist || "A Safari Crafters specialist"} will respond with considered next steps.</p>
        {enquiryResult?.enquiryId ? <p className="enquiry-reference">Private brief reference: {enquiryResult.enquiryId}</p> : null}
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
          <h2 className="h2">{steps[step]}</h2>

          {step === 0 ? (
            <div className="choice-grid region-choice-grid">
              {regions.map((region) => (
                <button
                  type="button"
                  key={region.name}
                  className={form.region === region.name ? "choice selected" : "choice"}
                  aria-pressed={form.region === region.name}
                  onClick={() => selectRegion(region.name)}
                >
                  <span>{region.name}</span>
                  <small>{region.copy}</small>
                </button>
              ))}
            </div>
          ) : null}

          {step === 1 ? (
            <>
              <ChipGroup values={journeyTypes} selected={form.types} onToggle={(value) => toggle("types", value)} />
              <label className="field-row planner-select">
                Travel occasion
                <select value={form.occasion} onChange={(event) => setForm((current) => ({ ...current, occasion: event.target.value }))}>
                  {occasions.map((occasion) => <option key={occasion}>{occasion}</option>)}
                </select>
              </label>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <ChipGroup
                values={experiencesByRegion[form.region] || []}
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
                <label>
                  Date flexibility
                  <select value={form.flexibility} onChange={(event) => setForm((current) => ({ ...current, flexibility: event.target.value }))}>
                    <option>Exact dates</option>
                    <option>Flexible by a few days</option>
                    <option>Flexible by a few weeks</option>
                  </select>
                </label>
                <label>
                  Accommodation character
                  <select value={form.accommodation} onChange={(event) => setForm((current) => ({ ...current, accommodation: event.target.value }))}>
                    {accommodationStyles.map((style) => <option key={style}>{style}</option>)}
                  </select>
                </label>
                <label>
                  Approximate investment per person (optional)
                  <select value={form.investment} onChange={(event) => setForm((current) => ({ ...current, investment: event.target.value }))}>
                    {investmentRanges.map((range) => <option key={range}>{range}</option>)}
                  </select>
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
                  name="name"
                  autoComplete="name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
              </label>
              <label>
                Email
                <input
                  required
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                />
              </label>
              <label>
                Phone / WhatsApp
                <input
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                />
              </label>
              <label>
                City
                <input
                  name="city"
                  autoComplete="address-level2"
                  value={form.city}
                  onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                />
              </label>
              <label>
                Preferred contact
                <select value={form.contactPreference} onChange={(event) => setForm((current) => ({ ...current, contactPreference: event.target.value }))}>
                  <option>Email</option>
                  <option>Phone</option>
                  <option>WhatsApp</option>
                </select>
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
              <p>{form.occasion} · {form.accommodation} · {form.flexibility}</p>
              <p>{form.investment} · Contact by {form.contactPreference}</p>
              <label className="consent-field">
                <input type="checkbox" checked={form.consent} onChange={(event) => setForm((current) => ({ ...current, consent: event.target.checked }))} />
                <span>I consent to Safari Crafters using these details to respond to this private travel brief.</span>
              </label>
            </div>
          ) : null}

          {submitError ? <p className="planner-error" role="alert">{submitError}</p> : null}

          <div className="planner-actions">
            <button className="button" type="button" disabled={step === 0} onClick={() => setStep((value) => value - 1)}>
              Back
            </button>
            {step < steps.length - 1 ? (
              <button className="button button-solid" type="button" disabled={!stepValid} onClick={() => setStep((value) => value + 1)}>
                Continue
              </button>
            ) : (
              <button className="button button-solid" type="submit" disabled={!stepValid || submitting}>
                {submitting ? "Sending..." : "Send Brief"}
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
          aria-pressed={selected.includes(value)}
          onClick={() => onToggle(value)}
        >
          {value}
        </button>
      ))}
    </div>
  );
}
