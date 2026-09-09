"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, X } from "lucide-react";

export default function InternationalOrder() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key !== "Tab") return;
      const controls = Array.from(document.querySelectorAll<HTMLElement>(".store-international-dialog button, .store-international-dialog input"));
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function close() {
    setOpen(false);
    requestAnimationFrame(() => openerRef.current?.focus());
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const values = new FormData(event.currentTarget);
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "planner",
          sourceType: "store-international",
          sourceLabel: "Store · International payments and dispatch",
          region: "International book order",
          types: ["Store purchase"],
          experiences: ["Ghosts of the Granite Hills"],
          months: ["As soon as available"],
          year: "Current",
          nights: "Not applicable",
          travellers: "Not applicable",
          occasion: "International order enquiry",
          flexibility: "Flexible dispatch",
          accommodation: "Not applicable",
          investment: "International payment and shipping quote requested",
          contactPreference: "Email",
          name: String(values.get("name") || ""),
          email: String(values.get("email") || ""),
          phone: "",
          city: "",
          notes: "Please contact this guest about international payment and dispatch for Ghosts of the Granite Hills.",
          consent: true
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We could not send your request. Please try again.");
      setReference(result.enquiryId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not send your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="store-international-entry">
        <button ref={openerRef} type="button" onClick={() => { setReference(""); setError(""); setOpen(true); }}>
          <span>International payments &amp; dispatch</span>
          <ArrowUpRight aria-hidden="true" size={15} />
        </button>
      </div>

      {open ? (
        <div className="store-international-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
          <section className="store-international-dialog" role="dialog" aria-modal="true" aria-labelledby="international-order-title">
            <button ref={closeRef} className="store-dialog-close" type="button" onClick={close} aria-label="Close international order form"><X aria-hidden="true" size={20} /></button>
            {reference ? (
              <div className="store-dialog-success" aria-live="polite">
                <Check aria-hidden="true" size={30} />
                <p className="store-kicker">Request received</p>
                <h2 id="international-order-title">We’ll be in touch by email.</h2>
                <p>Our team will contact you with international payment and dispatch details.</p>
                <p className="store-dialog-reference">Reference: {reference}</p>
                <button className="store-dialog-submit" type="button" onClick={close}>Return to the book</button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <p className="store-kicker">International orders</p>
                <h2 id="international-order-title">Payment and dispatch, arranged personally.</h2>
                <p className="store-dialog-intro">Share your details and our team will contact you by email with payment and shipping options for your country.</p>
                <label>Name<input name="name" autoComplete="name" required /></label>
                <label>Email address<input name="email" type="email" inputMode="email" autoComplete="email" required /></label>
                <p className="store-dialog-consent">By submitting, you agree that Safari Crafters may use these details to respond to this request.</p>
                {error ? <p className="store-dialog-error" role="alert">{error}</p> : null}
                <button className="store-dialog-submit" type="submit" disabled={submitting}>{submitting ? "Sending…" : "Request international assistance"}</button>
              </form>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
