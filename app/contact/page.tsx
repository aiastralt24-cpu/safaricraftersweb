import { Metadata } from "next";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { destinations } from "@/lib/data";
import "../forms.css";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Safari Crafters for private safari planning and photo expedition enquiries."
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        title="Speak to Safari Crafters."
        copy="Tell us the species, landscape or journey rhythm calling you, and a specialist will shape the next step with care."
        image={destinations[4].image}
        meta="Contact"
      />
      <section className="section">
        <div className="container form-grid">
          <div>
            <p className="eyebrow">Direct enquiry</p>
            <h2 className="h2">Tell us where the journey begins.</h2>
            <p>
              Share a short note about where you want to travel, who is coming,
              preferred months, and the wildlife or photography moments you hope for.
              We will respond with a considered route rather than a generic package.
            </p>
            <Link className="whatsapp-link" href="https://wa.me/910000000000">
              <MessageCircle size={18} /> WhatsApp Safari Crafters
            </Link>
          </div>
          <form className="contact-form" action="/api/enquiry" method="post">
            <input type="hidden" name="source" value="contact" />
            <label>
              Name
              <input name="name" required />
            </label>
            <label>
              Email
              <input name="email" type="email" required />
            </label>
            <label>
              Phone
              <input name="phone" />
            </label>
            <label>
              Message
              <textarea name="message" required />
            </label>
            <button className="button button-solid" type="submit">
              Send Enquiry
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
