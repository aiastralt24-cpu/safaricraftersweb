import { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { ContactForm } from "@/components/ContactForm";
import { destinations } from "@/lib/data";
import "../forms.css";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "A direct line to Safari Crafters for private safari planning, photo expeditions and specialist-led travel conversations."
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        title="Begin the conversation."
        copy="A discreet point of contact for private safari planning, photographic departures and rare route conversations."
        image={destinations[4].image}
        meta="Contact Us"
      />
      <section className="section">
        <div className="container form-grid">
          <div className="contact-copy">
            <p className="eyebrow">Direct contact</p>
            <h2 className="h2">Tell us what is taking shape.</h2>
            <p>
              Share the broad outline for now: destination, season, travellers, photography
              priorities or whether you would rather begin with a blank page.
            </p>
            <p>
              We prefer a short, clear brief over a crowded form. A specialist will take it
              forward with care.
            </p>
            <div className="contact-links">
              <Link className="whatsapp-link" href="mailto:hello@safaricrafters.com">
                hello@safaricrafters.com
              </Link>
            </div>
            <div className="contact-notes" aria-label="Contact page notes">
              <div>
                <span className="eyebrow">Enquiries</span>
                <p>Private journeys, family travel, photo expeditions and specialist planning.</p>
              </div>
              <div>
                <span className="eyebrow">Response</span>
                <p>Quiet, considered and personal rather than automated.</p>
              </div>
            </div>
          </div>
          <ContactForm />
        </div>
      </section>
    </>
  );
}
