import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ContactForm } from "@/components/ContactForm";
import "../forms.css";
import styles from "./contact.module.css";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Plan private journeys, bespoke safaris, photography tours and corporate travel across India and international destinations with Safari Crafters."
};

export default function ContactPage() {
  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <div className={styles.intro}>
          <p className="eyebrow">A journey starts with a conversation</p>
          <h1>Where would you<br />like to <em>go next?</em></h1>
          <p className={styles.lead}>A place you’ve always imagined. A wildlife encounter you’ve waited for. Tell us what draws you there, and we’ll help shape the journey.</p>
          <p className={styles.scope}>Private journeys, bespoke safaris and photography tours across India and beyond.</p>
          <figure className={styles.image}>
            <Image src="/assets/destinations/kanha/field-photographs/8a6eba1b2e6a.webp" alt="A safari vehicle on a sunlit forest trail in Kanha" fill sizes="(max-width: 900px) 90vw, 40vw" priority />
            <figcaption>Every journey begins with a little curiosity.</figcaption>
          </figure>
          <div className={styles.direct}><span>Prefer to write directly?</span><a href="mailto:info@safaricrafters.com">info@safaricrafters.com ↗</a></div>
          <p className={styles.corporate}>Planning for your company, partners or clients? <Link href="/mice#corporate-enquiry">Explore corporate journeys ↗</Link></p>
        </div>
        <section className={styles.panel} aria-labelledby="contact-form-heading">
          <header><p className="eyebrow">Your travel brief</p><h2 id="contact-form-heading">Let’s make a <em>beginning.</em></h2><p>Start with what you know. We’ll work out the details together.</p><span>Name, email and a short message are required.</span></header>
          <ContactForm />
          <p className={styles.privacy}>Your details help us respond to your enquiry. <Link href="/legal/privacy">Privacy policy</Link></p>
        </section>
      </div>
    </div>
  );
}
