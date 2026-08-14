"use client";

import { FormEvent, useState } from "react";
import { Check } from "lucide-react";
import "./ExpeditionEnquiry.css";

type Props = {
  title: string;
  slug: string;
  departure?: string;
  mentor: string;
  region: string;
};

export function ExpeditionEnquiry({ title, slug, departure, mentor, region }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const values = new FormData(event.currentTarget);
    const payload = {
      source: "planner",
      sourceLabel: `${title}${departure ? ` · ${departure}` : ""}`,
      sourceType: "fixed-expedition",
      expeditionSlug: slug,
      departure,
      region,
      types: ["Photo-led", "Small Group"],
      experiences: ["Photography hides"],
      months: departure ? [departure] : ["Flexible"],
      year: departure?.match(/20\d{2}/)?.[0] || "Flexible",
      nights: "To confirm",
      travellers: String(values.get("travellers") || "1"),
      occasion: "Photography",
      flexibility: "Selected departure",
      accommodation: "A considered mix",
      investment: "Prefer to discuss",
      contactPreference: "Email",
      specialist: mentor.split(" ")[0],
      name: String(values.get("name") || ""),
      email: String(values.get("email") || ""),
      phone: "",
      city: "",
      notes: String(values.get("notes") || ""),
      consent: values.get("consent") === "on"
    };
    try {
      const response = await fetch("/api/enquiry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We could not send your enquiry. Please try again.");
      setReference(result.enquiryId);
      setSubmitted(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not send your enquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) return (
    <section className="expedition-enquiry expedition-enquiry-success" aria-live="polite">
      <Check aria-hidden="true" size={28} />
      <div><h2>Expedition enquiry received.</h2><p>{mentor} or the reservations team will respond with availability and next steps.</p>{reference ? <p className="enquiry-reference">Reference: {reference}</p> : null}</div>
    </section>
  );

  return (
    <section className="expedition-enquiry" id="expedition-enquiry">
      <div className="expedition-enquiry-intro">
        <p className="eyebrow">Selected departure</p>
        <h2 className="h2">Ask about this expedition.</h2>
        <p>{departure ? `${departure} · ` : ""}Led by {mentor}. We only need the essentials to begin.</p>
      </div>
      <form onSubmit={submit}>
        <label>Name<input name="name" autoComplete="name" required /></label>
        <label>Email<input name="email" type="email" inputMode="email" autoComplete="email" required /></label>
        <label>Travellers<select name="travellers" defaultValue="1">{[1,2,3,4,5,6,7,8].map((count) => <option key={count}>{count}</option>)}</select></label>
        <label className="wide">Question or note <span>(optional)</span><textarea name="notes" rows={3} /></label>
        <label className="wide expedition-consent"><input name="consent" type="checkbox" required /><span>I consent to Safari Crafters using these details to respond to this expedition enquiry.</span></label>
        {error ? <p className="wide planner-error" role="alert">{error}</p> : null}
        <button className="button button-solid" type="submit" disabled={submitting}>{submitting ? "Sending…" : "Ask about this departure"}</button>
      </form>
    </section>
  );
}
