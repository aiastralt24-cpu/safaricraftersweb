"use client";

import { trackFunnel } from "@/lib/funnel-client";
import { EnquiryHoneypot } from "@/components/EnquiryHoneypot";
import { enquiryHeaders } from "@/lib/enquiry-client";

import { FormEvent, useState } from "react";
import { Check } from "lucide-react";
import "./ExpeditionEnquiry.css";

type Props = {
  title: string;
  slug: string;
  departure?: string;
  departureOptions?: string[];
  mentor: string;
  region: string;
};

export function ExpeditionEnquiry({ title, slug, departure, mentor, region, departureOptions = [] }: Props) {
  const [selectedDeparture,setSelectedDeparture] = useState(departure || "");
  const [submitted, setSubmitted] = useState(false);
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
    const departure = selectedDeparture || undefined;
    const payload = {
      website: String(values.get("website") || ""),
      source: "planner",
      sourceLabel: `${title}${departure ? ` · ${departure}` : ""}`,
      sourceType: "fixed-expedition",
      expeditionSlug: slug,
      departure,
      region,
      types: ["Photo-led", "Small Group"],
      experiences: ["Wildlife photography"],
      months: departure ? [departure] : ["Flexible"],
      year: departure?.match(/20\d{2}/)?.[0] || "Flexible",
      nights: "To confirm",
      travellers: String(values.get("travellers") || "1"),
      occasion: "Photography",
      flexibility: "Selected departure",
      accommodation: "As per confirmed programme",
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
      const response = await fetch("/api/enquiry", { method: "POST", headers: await enquiryHeaders(payload), body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) trackFunnel("enquiry_failed");
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
        <p className="expedition-enquiry-kicker">Expedition enquiry</p>
        <h2>Enquire about this trip.</h2>
        <p>Leave your details. Our team will help with availability and the next steps.</p>
        <dl className="expedition-selection" aria-label="Selected expedition details">
          <div><dt>Expedition</dt><dd>{title}</dd></div>
          {selectedDeparture ? <div><dt>Departure</dt><dd>{selectedDeparture}</dd></div> : null}
          <div><dt>Led by</dt><dd>{mentor}</dd></div>
        </dl>
      </div>
      <form onSubmit={submit}><EnquiryHoneypot />
        {departureOptions.length > 1 && <label className="wide">Preferred departure<select value={selectedDeparture} onChange={event=>setSelectedDeparture(event.target.value)}>{departureOptions.map(date=><option key={date}>{date}</option>)}</select></label>}
        <label>Name<input name="name" autoComplete="name" required /></label>
        <label>Email<input name="email" type="email" inputMode="email" autoComplete="email" required /></label>
        <label className="expedition-travellers">Travellers<select name="travellers" defaultValue="1">{[1,2,3,4,5,6,7,8].map((count) => <option key={count}>{count}</option>)}</select></label>
        <label className="wide"><span className="expedition-notes-label">Question or note <span>(optional)</span></span><textarea name="notes" rows={2} /></label>
        <label className="wide expedition-consent"><input name="consent" type="checkbox" required /><span>I consent to Safari Crafters using these details to respond to this expedition enquiry.</span></label>
        {error ? <p className="wide planner-error" role="alert">{error}</p> : null}
        <button className="wide expedition-submit" type="submit" disabled={submitting}><span>{submitting ? "Sending…" : "Send enquiry"}</span><span aria-hidden="true">↗</span></button>
      </form>
    </section>
  );
}
