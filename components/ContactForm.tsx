"use client";

import { FormEvent, useState } from "react";
import { Check } from "lucide-react";

export function ContactForm() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    const values = new FormData(event.currentTarget);
    const travelWindow = String(values.get("travelWindow") || "Flexible");
    const interest = String(values.get("interest") || "Private safari planning");
    const payload = {
      source: "planner",
      sourceType: "contact",
      sourceLabel: "Contact page",
      region: "Surprise me",
      types: [interest.toLowerCase().includes("photo") ? "Photo-led" : "Private"],
      experiences: ["Cultural immersion"],
      months: [travelWindow],
      year: "Flexible",
      nights: "To discuss",
      travellers: "To discuss",
      occasion: "Private escape",
      flexibility: travelWindow,
      accommodation: "A considered mix",
      investment: "Prefer to discuss",
      contactPreference: values.get("phone") ? "Phone" : "Email",
      name: String(values.get("name") || ""),
      email: String(values.get("email") || ""),
      phone: String(values.get("phone") || ""),
      city: "",
      notes: `${interest}\n\n${String(values.get("message") || "")}`,
      consent: values.get("consent") === "on"
    };
    try {
      const response = await fetch("/api/enquiry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We could not send your brief. Please try again.");
      setReference(result.enquiryId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not send your brief. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (reference) return (
    <section className="contact-form contact-form-success" aria-live="polite">
      <Check aria-hidden="true" size={30} />
      <h2>Your brief has been received.</h2>
      <p>A Safari Crafters specialist will review it and respond with considered next steps.</p>
      <p className="enquiry-reference">Private brief reference: {reference}</p>
    </section>
  );

  return (
    <form className="contact-form" onSubmit={submit}>
      <label>Name<input name="name" autoComplete="name" required /></label>
      <label>Email<input name="email" type="email" inputMode="email" autoComplete="email" required /></label>
      <label>Phone<input name="phone" type="tel" inputMode="tel" autoComplete="tel" /></label>
      <label>Travel window<input name="travelWindow" placeholder="Month, season or flexible" /></label>
      <label>Interest<input name="interest" placeholder="Journey, destination, photo expedition or aviation" /></label>
      <label>Message<textarea name="message" placeholder="Where you want to go, who is travelling and what kind of safari you have in mind." required /></label>
      <label className="contact-consent"><input name="consent" type="checkbox" required /><span>I consent to Safari Crafters using these details to respond to my private travel brief.</span></label>
      {error ? <p className="planner-error" role="alert">{error}</p> : null}
      <button className="button button-solid" type="submit" disabled={submitting}>{submitting ? "Sending…" : "Send Brief"}</button>
    </form>
  );
}
