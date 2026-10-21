import styles from "./TourInformation.module.css";
import Link from "next/link";
export function BookingConditions({ cancellationPolicy }: { cancellationPolicy?: string } = {}) {
  return <section className={`container ${styles.section} ${styles.booking}`} aria-label="Booking and payment information">
    <header className={styles.intro}><p className="eyebrow">Before you book</p><h2>Booking &amp; payment <em className="editorial-accent">details.</em></h2></header><div className={styles.questions}>
    <p>Journey proposals are personalised and subject to availability, local park rules, lodge policies and final confirmation by a specialist.</p>
    <details><summary>Payment schedule and cancellation conditions</summary>{cancellationPolicy ? <><p>{cancellationPolicy}</p><p>Request the deposit amount, balance due date and any additional non-refundable costs before making a payment.</p></> : <p>Request the deposit amount, balance due date, cancellation charges and any non-refundable costs for your selected departure before making a payment. These details are not published for this tour.</p>}</details>
    <details><summary>What does the price cover?</summary><p>Review the tour’s inclusions and exclusions and request a written quote for your travel dates, accommodation and group. Ask the team to confirm the currency, taxes and any optional or additional costs.</p></details>
    <Link href="/contact">Request booking details ↗</Link>
  </div></section>;
}
