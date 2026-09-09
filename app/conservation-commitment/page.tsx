import type { Metadata } from "next";
import Image from "next/image";
import { ConservationMotion } from "./ConservationMotion";
import "./conservation-commitment.css";

const records = [
  { place: "Ranthambhore · Water infrastructure", title: "Water where the forest needs it.", copy: "At Aamaghati, a hub-and-spoke pipeline system uses solar power to feed a freshwater point inside a non-tourism area of Ranthambhore Tiger Reserve—supporting wildlife beyond the familiar safari circuit.", image: "/assets/conservation/solar-water-infrastructure.jpg", alt: "Astral Foundation field team beside a solar-powered water point in Ranthambhore" },
  { place: "National Chambal Sanctuary · Research", title: "Knowledge built in the field.", copy: "Astral Foundation supported the Gharial Ecology Project, helping researchers monitor more than 45 radio-tagged gharials across over 400 kilometres of protected river habitat in Rajasthan, Madhya Pradesh and Uttar Pradesh.", image: "/assets/conservation/gharial-field-research.jpg", alt: "A field researcher monitoring gharial activity beside the Chambal River" },
  { place: "Ranthambhore · Dry-season water", title: "Following water uphill.", copy: "In Ranthambhore’s elevated Rann area, solar pumps and HDPE pipelines move water from Khemchakund to terrain more than 450 metres higher. The system helps retain prey and predators within the landscape through the driest months.", image: "/assets/conservation/wildlife-water-restoration.jpg", alt: "Astral Foundation workers installing a wildlife water pipeline beside a forest water point" },
  { place: "Ranthambhore · Forest protection", title: "Mobility for the front line.", copy: "Four patrol vehicles were provided to the Forest Department at Ranthambhore Tiger Reserve, strengthening everyday monitoring, wildlife protection and the response to human–wildlife conflict across the reserve.", image: "/assets/conservation/forest-patrol-vehicles.jpg", alt: "Forest Department patrol vehicles provided for Ranthambhore Tiger Reserve" }
];

const impact = [
  ["10+", "years supporting forest conservation and climate resilience"],
  ["20+", "protected parks and key wildlife landscapes across India"],
  ["30,000+", "hectares improved through renewable energy and infrastructure"],
  ["500+ kW", "of green power installed through Project GreenWater"],
  ["250+ km", "of solar-powered water distribution inside tiger reserves"],
  ["800+", "solar-powered water bodies restored across forest habitats"],
  ["100M+ L", "of rainwater harvested annually through sustainable systems"],
  ["4,000+", "forest guards supported across more than 700 camps"]
];

export const metadata: Metadata = {
  title: "Conservation Commitment",
  description: "Safari Crafters and Astral Foundation support practical field infrastructure, habitat care, wildlife research and communities around India's wild landscapes.",
  alternates: { canonical: "/conservation-commitment" },
  openGraph: { title: "Conservation, carried quietly", description: "Practical support for wild landscapes through Astral Foundation.", images: ["/assets/destinations/ranthambhore/ranthambhore-02.jpg"] }
};

export default function ConservationCommitmentPage() {
  return <div className="conservation-page">
    <ConservationMotion />
    <section className="conservation-hero" aria-labelledby="conservation-title">
      <Image src="/assets/destinations/ranthambhore/ranthambhore-02.jpg" alt="Bengal tiger beside a lake in Ranthambhore" fill priority sizes="100vw" />
      <div className="conservation-hero-shade" />
      <div className="container conservation-hero-copy">
        <p className="conservation-eyebrow">Safari Crafters × Astral Foundation</p>
        <h1 id="conservation-title">Conservation,<br /><em>carried quietly.</em></h1>
        <p>Practical support for the landscapes we travel through and the people who protect them.</p>
      </div>
      <p className="conservation-credit">Safari Crafters archive · Ranthambhore</p>
    </section>

    <section className="conservation-intro conservation-section">
      <div className="container conservation-intro-grid" data-conservation-reveal>
        <p className="conservation-index">Our position</p>
        <div>
          <h2>A responsibility that<br />continues beyond the journey.</h2>
          <div className="conservation-intro-copy">
            <p>Safari Crafters supports conservation through Astral Foundation as an ongoing commitment, funded independently and never presented as an obligation to our guests.</p>
            <p>The focus is practical and long-term: strengthening field capacity, caring for habitat, supporting research and investing in the communities that share these wildlife landscapes.</p>
          </div>
        </div>
      </div>
    </section>

    <section className="conservation-impact" aria-labelledby="impact-title">
      <div className="container conservation-impact-heading" data-conservation-reveal>
        <p className="conservation-eyebrow">A decade in the field</p>
        <h2 id="impact-title">The measure of<br />long-term work.</h2>
        <p>Figures published by Astral Foundation across its forest conservation and climate-resilience programmes in India.</p>
      </div>
      <dl className="container conservation-impact-grid">
        {impact.map(([value, label]) => <div key={value} data-conservation-reveal><dt>{value}</dt><dd>{label}</dd></div>)}
      </dl>
    </section>

    <section className="conservation-records conservation-section" aria-labelledby="field-record-title">
      <div className="container conservation-record-heading" data-conservation-reveal>
        <div><p className="conservation-eyebrow">The field record</p><h2 id="field-record-title">Where support<br />becomes useful.</h2></div>
        <p>The work is often quiet by nature: infrastructure, training, monitoring and habitat care. Its value lies in what it enables over time.</p>
      </div>
      <div className="container conservation-record-list">
        {records.map((record) => <article className="conservation-record" key={record.title} data-conservation-reveal>
          <figure data-conservation-expand><Image src={record.image} alt={record.alt} fill sizes="(max-width: 860px) 100vw, 46vw" /></figure>
          <div className="conservation-record-copy">
            <div className="conservation-record-meta"><span>{record.place}</span></div>
            <h3>{record.title}</h3><p>{record.copy}</p>
          </div>
        </article>)}
      </div>
      <div className="container conservation-footprint" data-conservation-reveal>
        <p className="conservation-eyebrow">A national footprint</p>
        <h2>From tiger reserves<br />to migration corridors.</h2>
        <div className="conservation-footprint-grid">
          <p><strong>North & west</strong><span>Ranthambhore · Sariska · Jhalana · Kutch · Gir · Kashmir markhor landscape</span></p>
          <p><strong>Central India</strong><span>Panna · Kanha · Pench · Bandhavgarh · Satpura · Gandhisagar</span></p>
          <p><strong>South & east</strong><span>Nagarhole · Bandipur · BRT · Sathyamangalam · Meghamalai · Brahmaputra landscape</span></p>
        </div>
        <p className="conservation-species"><strong>Species supported through these programmes</strong><span>Asian elephant, tiger, lion, caracal, one-horned rhinoceros, markhor, otter, leopard, fishing cat, sloth bear, gharial, vulture, wolf, golden jackal, deer and great hornbill.</span></p>
      </div>
    </section>

  </div>;
}
