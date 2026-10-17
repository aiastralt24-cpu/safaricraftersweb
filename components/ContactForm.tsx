"use client";

import { trackFunnel } from "@/lib/funnel-client";
import { EnquiryHoneypot } from "@/components/EnquiryHoneypot";
import { enquiryHeaders } from "@/lib/enquiry-client";

import { FormEvent, useState } from "react";
import { Check } from "lucide-react";

export function ContactForm({ corporate = false }: { corporate?: boolean }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    trackFunnel("enquiry_started");
    setSubmitting(true);
    setError("");
    const values = new FormData(event.currentTarget);
    const travelWindow = String(values.get("travelWindow") || "Flexible");
    const interest = String(values.get("interest") || (corporate ? "Corporate travel / MICE" : "Private safari planning"));
    const payload = {
      website: String(values.get("website") || ""),
      source: "planner",
      sourceType: "contact",
      sourceLabel: corporate ? "MICE corporate enquiry" : "Contact page",
      region: corporate ? String(values.get("destination") || "Open to suggestions") : "Surprise me",
      types: [interest.toLowerCase().includes("photo") ? "Photo-led" : "Private"],
      experiences: ["Open to suggestions"],
      months: [travelWindow],
      year: "Flexible",
      nights: "To discuss",
      travellers: corporate ? String(values.get("groupSize") || "To discuss") : "To discuss",
      occasion: corporate ? "Corporate journey" : "Private escape",
      flexibility: travelWindow,
      accommodation: String(values.get("accommodation") || "Not decided yet"),
      investment: corporate ? String(values.get("budget") || "Prefer to discuss") : "Prefer to discuss",
      contactPreference: values.get("phone") ? "Phone" : "Email",
      name: String(values.get("name") || ""),
      email: String(values.get("email") || ""),
      phone: String(values.get("phone") || ""),
      city: "",
      notes: `${interest}\n${corporate ? `Company: ${String(values.get("company") || "")}\nBudget: ${String(values.get("budget") || "To discuss")}\n` : ""}\n${String(values.get("message") || "")}`,
      consent: values.get("consent") === "on"
    };
    try {
      const response = await fetch("/api/enquiry", { method: "POST", headers: await enquiryHeaders(payload), body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) trackFunnel("enquiry_failed");
      if (!response.ok) throw new Error(result.fields?.phone || result.error || "We could not send your brief. Please try again.");
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
      <p className="enquiry-reference">Enquiry reference: {reference}</p>
    </section>
  );

  return (
    <form className={`contact-form${corporate ? " corporate-contact-form" : ""}`} onSubmit={submit}><EnquiryHoneypot />
      {corporate && <p className="corporate-form-note">Start with the essentials. We’ll work out the details together.</p>}
      <label>Name<input name="name" autoComplete="name" required maxLength={120} /></label>
      <label>Email<input name="email" type="email" inputMode="email" autoComplete="email" required /></label>
      <label>WhatsApp / phone<input name="phone" type="tel" inputMode="tel" autoComplete="tel" required minLength={7} maxLength={60} /></label>
      {corporate ? <>
        <label>Company (optional)<input name="company" autoComplete="organization" maxLength={160} /></label>
        <label>Destination preference<select name="destination" defaultValue="Open to suggestions"><option>Open to suggestions</option><option>India</option><option>International</option><option>India & International</option></select></label>
        <label className="corporate-brief">Your brief (optional)<span id="corporate-brief-hint" className="corporate-field-hint">Who is travelling? Add your purpose, dates or group size, if known.</span><textarea name="message" rows={3} maxLength={4000} aria-describedby="corporate-brief-hint" placeholder="e.g. An incentive trip for 30 dealers in March" /></label>
      </> : <>
        <label>Travel dates (optional)<input name="travelWindow" placeholder="Month, season or flexible" /></label>
        <label>Travel interests (optional)<input name="interest" placeholder="e.g. Wildlife or photography" /></label>
        <label>Stay preference (optional)<select name="accommodation" defaultValue="Not decided yet"><option>Not decided yet</option><option>Quiet luxury</option><option>Classic safari camps</option><option>Design-led lodges</option><option>A considered mix</option></select></label>
        <label>Message<textarea name="message" placeholder="Where you want to go, who is travelling and what kind of safari you have in mind." required /></label>
      </>}
      <label className="contact-consent"><input name="consent" type="checkbox" required /><span>I consent to Safari Crafters using these details to respond to my travel brief.</span></label>
      {error ? <p className="planner-error" role="alert">{error}</p> : null}
      <button className="button button-solid" type="submit" disabled={submitting}>{submitting ? "Sending…" : corporate ? "Plan Our Corporate Journey" : "Plan My Journey"}</button>
    </form>
  );
}
