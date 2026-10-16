import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PageHero } from "@/components/PageHero";
import { ContactForm } from "@/components/ContactForm";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/structured-data";
import "../forms.css";
import "./mice.css";

export const metadata: Metadata = { title: "Corporate Travel & MICE | India & International", description: "Corporate travel and MICE in India and internationally: employee retreats, dealer incentives, distributor meets, channel partner journeys and client hospitality.", alternates: { canonical: "/mice" } };
const formats = [
  { number: "01", title: "Incentive travel", copy: "Recognise employees, dealers, distributors and channel partners with incentive travel in India or overseas. Shape each reward journey around the achievement and the people behind it." },
  { number: "02", title: "Retreats, offsites & partner meets", copy: "Bring employees, dealers or distributors together for a company offsite, leadership retreat or partner meet. Balance business conversations with shared experiences and time to recharge." },
  { number: "03", title: "Client hospitality & group travel", copy: "Strengthen relationships through client hospitality, customer appreciation trips and corporate group travel. Plan around your guests’ interests, business objectives and preferred destinations." },
  { number: "04", title: "Wildlife & cultural experiences", copy: "Connect employees, business partners and clients through safari experiences, photography and local culture. Choose activities that suit your guests’ interests, pace and access needs." }
];
export default function MicePage() {
  return <main className="mice-page">
    <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Corporate Journeys & MICE", path: "/mice" }])} />
    <PageHero title="Together, beyond the everyday." accent="Together," copy="Corporate travel and incentive journeys for employees, dealers, distributors, channel partners and clients—across India and international destinations." image={{src:"/assets/safari-crafters/golden-triangle-ae04a20e.jpg",alt:"Heritage architecture in India",credit:"Safari Crafters archive"}} meta="India & International · MICE" variant="destination" breadcrumbs={[{label:"Home",href:"/"},{label:"Corporate Journeys & MICE"}]} />
    <section className="container mice-intro"><div><p className="eyebrow">Corporate travel with purpose</p><h2>Reward achievement.<br /><em className="editorial-accent">Strengthen relationships.</em></h2></div><div><p>From dealer incentive trips in India to international client hospitality, a meaningful corporate journey begins with a clear purpose. Reward performance, build partner relationships, thank your clients or bring employees together.</p><p>Our corporate travel and MICE planning starts with your brief. Tell us what you want to achieve, and we’ll explore destinations, accommodation and experiences around your group’s priorities. You don’t need a finished itinerary to begin.</p><Link className="button button-solid" href="#corporate-enquiry">Plan a corporate journey</Link></div></section>
    <section className="mice-formats container" aria-label="Corporate travel formats">{formats.map(item => <article key={item.number}><span>{item.number}</span><h2>{item.title}</h2><p>{item.copy}</p></article>)}</section>
    <section className="container mice-destinations" aria-labelledby="mice-destinations-title">
      <header><p className="eyebrow">India & International</p><h2 id="mice-destinations-title">Exceptional journeys.<br /><em className="editorial-accent">In India and beyond.</em></h2><p>Choose a corporate journey close to home or an international retreat. The right destination depends on your guests’ starting points, available time, budget and interests.</p></header>
      <div className="mice-destination-grid">
        <article><div className="mice-destination-image"><Image src="/assets/safari-crafters/golden-triangle-ae04a20e.jpg" alt="Historic architecture and gardens in India" fill sizes="(max-width:650px) 100vw, 50vw" /></div><div><h3>Corporate journeys in India</h3><p>Explore heritage settings, wildlife landscapes and cultural experiences for dealer incentive trips, distributor meets, leadership retreats and client experiences. Shape the programme around travel time, group interests and a balance of connection and downtime.</p><Link href="#corporate-enquiry">Plan a journey in India ↗</Link></div></article>
        <article><div className="mice-destination-image"><Image src="/assets/safari-crafters/kenya-f64a9aa8.jpg" alt="Wildlife landscape in Kenya" fill sizes="(max-width:650px) 100vw, 50vw" /></div><div><h3>International corporate travel</h3><p>Look beyond borders for an overseas incentive journey, partner retreat, client appreciation trip or curated group experience. Discuss safari and cultural destinations with us, factoring in flight connections, seasonality, entry requirements and the needs of your guests.</p><Link href="#corporate-enquiry">Plan an international journey ↗</Link></div></article>
      </div>
    </section>
    <section className="mice-process"><div className="container"><p className="eyebrow">From brief to journey</p><h2>Built around <em className="editorial-accent editorial-accent-light">your people.</em></h2><ol><li><h3>Share the purpose</h3><p>Your objectives, people, preferred dates and budget.</p></li><li><h3>Shape the programme</h3><p>Discuss destinations, accommodation, group time and experiences.</p></li><li><h3>Confirm the details</h3><p>Review the proposal, availability, inclusions and booking conditions.</p></li></ol></div></section>
    <section className="container form-grid mice-enquiry" id="corporate-enquiry"><div><p className="eyebrow">Start with your brief</p><h2>Where could your people <em className="editorial-accent">go next?</em></h2><p>India, international or still exploring? Share your name and email to start. If you already have dates, group size or a destination in mind, add them to your brief.</p></div><ContactForm corporate /></section>
  </main>;
}
