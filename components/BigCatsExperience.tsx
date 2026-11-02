import Image from 'next/image';
import Link from 'next/link';
import { getDestination, type Journey } from '@/lib/data';
import { PageHero } from './PageHero';
import { JsonLd } from './JsonLd';
import { MediaGallery } from './MediaGallery';
import { breadcrumbSchema, faqSchema, journeySchema } from '@/lib/structured-data';
import { tourPriceLabel } from '@/lib/tour-pricing';
import { BigCatsMotion } from './BigCatsMotion';
import './BigCatsExperience.css';

const photo = (place: string, id: string) => `/assets/destinations/${place}/field-photographs/${id}.webp`;
const chapters = [
  { place:'Ladakh', slug:'ladakh', animal:'Snow leopard', title:'First, learn to look.', subtitle:'In the high silence', days:'Days 2–9', nights:'8 nights', image:photo('ladakh','0f71412edf77'), alt:'A snow leopard climbing a rocky cliff in Ladakh', position:'42% 50%', landscape:photo('ladakh','c7b6d8d2d92d'), landscapeAlt:'A winding river through the mountain valleys of Ladakh', text:'A shadow on a distant ridge. A movement almost lost in the rock. In Ladakh, expert spotters help you read the landscape before the snow leopard reveals itself.', detail:'Two days in Leh to acclimatise, followed by the journey into mountain country and five full days of tracking.', labels:['Day 2','Day 3','Day 4','Days 5-9'] },
  { place:'Ranthambhore', slug:'ranthambhore', animal:'Bengal tiger', title:'The forest holds its breath.', subtitle:'Where the lakes meet the forest', days:'Days 10–14', nights:'5 nights', image:photo('ranthambhore','14f02d734699'), alt:'Two tigers interacting in the water at Ranthambhore', position:'50% 50%', landscape:photo('ranthambhore','8b4d115003ed'), landscapeAlt:'A tiger beside the lake and rocky cliffs of Ranthambhore', text:'Still water, ruined walls and the sound of an alarm call. The search for tigers unfolds through a landscape shaped by centuries of wilderness and history.', detail:'Travel via Delhi, then settle into four days of morning and afternoon safaris.', labels:['Day 10','Days 11-14'] },
  { place:'Jawai', slug:'jawai', animal:'Indian leopard', title:'An unexpected neighbour.', subtitle:'Among the granite hills', days:'Days 15–17', nights:'3 nights', image:photo('jawai','4dcb8ddd665c'), alt:'Two leopards among granite boulders in Jawai', position:'50% 50%', landscape:photo('jawai','ed8cf05268ad'), landscapeAlt:'Leopards silhouetted on a granite ridge beneath the moon in Jawai', text:'Granite rises from the plains in great folds and domes. In its caves and ledges live leopards, sharing this remarkable country with pastoral communities.', detail:'An overland journey into Jawai, with two full days exploring leopard country.', labels:['Day 15','Days 16-17'] },
  { place:'Gir', slug:'gir', animal:'Asiatic lion', title:'A different kind of kingdom.', subtitle:'In the lion’s country', days:'Days 18–20', nights:'3 nights', image:photo('gir','834159d44bdd'), alt:'An Asiatic lion resting in the forest of Gir', position:'60% 35%', landscape:photo('gir','176c394bbec8'), landscapeAlt:'Two Asiatic lions on a forest track in Gir', text:'The final chapter belongs to the Asiatic lion. Dry woodland, teak forest and open scrub create a quieter setting for an extraordinary encounter.', detail:'Continue to Gir for two full days of morning and afternoon safaris before returning to Delhi on day 21.', labels:['Day 18','Days 19-20'] }
];

const additionalPhotoIds: Record<string, string[]> = {
  ladakh: ['4e42c5499d7a', '527fd5b76604', '7e10664aaacf'],
  ranthambhore: ['2e257fb21a8f', '3ad45d1f2117', '2b4793d79ff4'],
  jawai: ['eef269a96892', '757659550c1f', '6efbc6a6e0cf'],
  gir: ['73c4f122ddfb', '8ac70fb8c26d', 'cc9cd85e9d8b']
};

function supportingPhotos(slug: string) {
  const destination = getDestination(slug);
  if (!destination) return [];
  return additionalPhotoIds[slug].flatMap(id => {
    const asset = [destination.image, ...destination.gallery].find(image => image.src === photo(slug, id));
    return asset ? [{ ...asset, alt: `${asset.alt} · ${destination.title}` }] : [];
  });
}

export function BigCatsExperience({ journey }: { journey: Journey }) {
  const enquiry=`/plan?journey=${journey.slug}`;
  const crumbs=[{name:'Home',path:'/'},{name:'Journeys',path:'/journeys'},{name:journey.title,path:`/journeys/${journey.slug}`}];
  const gallery=chapters.flatMap(c=>[{src:c.landscape,alt:c.landscapeAlt,credit:'Safari Crafters archive'},{src:c.image,alt:c.alt,credit:'Safari Crafters archive',focalPoint:c.position},...supportingPhotos(c.slug)]);
  return <article className="cats-expedition" id="cats-expedition">
    <JsonLd data={journeySchema(journey)} /><JsonLd data={breadcrumbSchema(crumbs)} /><JsonLd data={faqSchema(journey.faqs || [])} />
    <PageHero title="Big Cats of India" accent="of India" titleSize="compact" variant="destination" copy="From Himalayan snow leopard country to the forests of Gir, a private safari across four remarkable landscapes." image={{src:photo('ladakh','4e42c5499d7a'),alt:'A snow leopard resting on a rocky slope in Ladakh',credit:'Ladakh · Safari Crafters archive',focalPoint:'70% 50%'}} meta="A private journey · India" breadcrumbs={[{label:'Home',href:'/'},{label:'Journeys',href:'/journeys'}]} />
    <nav className="ce-navigation" aria-label="Journey sections"><a href="#overview">The experience</a><a href="#itinerary">Four chapters</a><a href="#planning">Planning details</a><a href="#gallery">Gallery</a><Link href={enquiry}>Plan this journey ↗</Link></nav>
    <section className="ce-overview ce-wrap" id="overview">
      <header className="ce-section-heading"><div><p className="ce-label">One country. Entirely different worlds.</p><h2>Follow the <em className="ce-word-accent">cats.</em><br />Feel the <em className="ce-word-accent">change.</em></h2></div><p>Mountains give way to forest. Forest opens into granite country. In 21 days, experience four remarkable habitats at the pace of a private journey.</p></header>
      <div className="ce-mosaic">
        <figure className="ce-mosaic-landscape ce-reveal"><Image src={chapters[0].landscape} alt={chapters[0].landscapeAlt} fill sizes="(max-width: 760px) 100vw, 55vw" /><figcaption><span>01 / A sense of scale</span><strong>Ladakh, beyond the ordinary.</strong></figcaption></figure>
        <div className="ce-mosaic-note ce-reveal"><span className="ce-label">The shape of your journey</span><p><strong>21</strong> days.<br /><em>Four</em> wild worlds.</p><span>Private · Customisable<br />{journey.bestMonths}</span></div>
        <figure className="ce-mosaic-animal ce-reveal"><Image src={chapters[2].image} alt={chapters[2].alt} fill sizes="(max-width: 760px) 50vw, 30vw" /><figcaption>Jawai · Life among the rocks</figcaption></figure>
      </div>
      <div className="ce-route" aria-label="Suggested journey route"><span className="ce-label">Your passage</span><ol><li>Delhi <small>Arrival</small></li>{chapters.map((c,i)=><li key={c.slug}><a href={`#chapter-${c.slug}`}><span>0{i+1}</span>{c.place}</a><small>{c.nights}</small></li>)}<li>Delhi <small>Return</small></li></ol><span className="ce-route-line" aria-hidden="true" /></div>
    </section>
    <section id="itinerary" className="ce-story">
      <div className="ce-story-heading ce-wrap"><p className="ce-label">The journey unfolds</p><h2>Four <em className="ce-word-accent">cats.</em><br />Four ways to see <em className="ce-word-accent">India.</em></h2><BigCatsMotion /></div>
      <div className="ce-story-layout">
        <div className="ce-stage" aria-hidden="true">{chapters.map((c,i)=><div className={`ce-frame ${i===0?'is-current':''}`} key={c.slug} data-frame={i}><Image src={c.image} alt="" fill sizes="60vw" style={{objectPosition:c.position}} /><div className="ce-frame-caption"><span>0{i+1} / 04</span><strong>{c.place}</strong><span>{c.animal}</span></div></div>)}<div className="ce-stage-progress"><span /></div></div>
        <div className="ce-chapters">{chapters.map((c,i)=><section className="ce-chapter" id={`chapter-${c.slug}`} key={c.slug} data-chapter={i}>
          <figure className="ce-mobile-photo"><Image src={c.image} alt={c.alt} width={1200} height={900} sizes="100vw" style={{objectPosition:c.position}} /></figure>
          <div className="ce-chapter-copy"><div className="ce-chapter-top"><span className="ce-chapter-number">0{i+1}</span><div><p className="ce-label">{c.place} · {c.animal}</p><span>{c.days} / {c.nights}</span></div></div><p className="ce-chapter-kicker">{c.subtitle}</p><h3>{c.title}</h3><p className="ce-chapter-text">{c.text}</p><p className="ce-chapter-detail">{c.detail}</p>
          <details className="ce-day-plan"><summary>Explore the daily plan <span aria-hidden="true">+</span></summary><div>{journey.days.filter(d=>c.labels.includes(d.label || '')).map(d=><div className="ce-day" key={d.label}><h4>{d.label} · {d.title}</h4><p>{d.copy}</p></div>)}</div></details><div className="ce-chapter-photos"><MediaGallery images={supportingPhotos(c.slug).slice(0, 2)} label={`${c.place} field photographs`} maxImages={2} /></div><Link className="ce-destination-link" href={`/destinations/${c.slug}`}>Discover {c.place} ↗</Link></div>
        </section>)}</div>
      </div>
      <div className="ce-bookends ce-wrap">{[journey.days[0],journey.days[journey.days.length-1]].map(d=><details key={d.label}><summary><span className="ce-label">{d.label}</span>{d.title}<span aria-hidden="true">+</span></summary><p>{d.copy}</p></details>)}</div>
    </section>
    <section className="ce-planning ce-wrap" id="planning"><header className="ce-section-heading"><div><p className="ce-label">The details, considered</p><h2>Room for the <em className="ce-word-accent">wild.</em><br />A <em className="ce-word-accent">plan</em> for everything else.</h2></div><div className="ce-price"><span className="ce-label">Journey guide price</span><p>{tourPriceLabel(journey.price)}</p><small>Confirm currency, occupancy, travel dates and applicable taxes in your personalised quote.</small><Link href={enquiry} className="ce-button">Plan this journey ↗</Link></div></header>
      <div className="ce-planning-facts">
        <div><h3>Private journey</h3><p>21 days, tailored to you.</p></div>
        <div><h3>Ladakh</h3><p>Two days reserved for acclimatisation.</p></div>
        <div><h3>Stays</h3><p>Lodges selected for your itinerary.</p></div>
      </div>
      <div className="ce-planning-accordions ce-planning-topics">
        <details name="cats-planning"><summary>Inclusions &amp; additional costs <span aria-hidden="true">+</span></summary><div className="ce-topic-columns"><div><h3>Included</h3><ul>{journey.inclusions?.map(x=><li key={x}>{x}</li>)}</ul></div><div><h3>Additional costs</h3><ul>{journey.exclusions?.map(x=><li key={x}>{x}</li>)}</ul></div></div></details>
        <details name="cats-planning"><summary>Travel &amp; altitude <span aria-hidden="true">+</span></summary><div className="ce-topic-copy"><h3>Getting there</h3><p>The route starts and finishes in Delhi. Domestic flights and road transfers connect the four wildlife chapters. International flights are additional. Allow time for your domestic connection or an extra night before flying home. Share your departure airport and time zone when enquiring.</p><h3>Acclimatisation in Ladakh</h3><p>The first two days in Leh are set aside for acclimatisation. Discuss altitude, cold conditions and walking requirements before confirming Ladakh.</p>{journey.faqs?.filter(f=>f.question==='Are the big cats guaranteed?').map(f=><div key={f.question}><h3>{f.question}</h3><p>{f.answer}</p></div>)}</div></details>
        <details name="cats-planning"><summary>Accommodation <span aria-hidden="true">+</span></summary><div className="ce-topic-copy"><p>{journey.accommodation} Named stays and room categories are confirmed with your proposal.</p></div></details>
        <details name="cats-planning"><summary>Customising your journey <span aria-hidden="true">+</span></summary><div className="ce-topic-copy">{journey.faqs?.filter(f=>f.question!=='Are the big cats guaranteed?').map(f=><div key={f.question}><h3>{f.question}</h3><p>{f.answer}</p></div>)}</div></details>
        <details name="cats-planning"><summary>Booking &amp; payment <span aria-hidden="true">+</span></summary><div className="ce-topic-copy"><p>Your proposal is subject to lodge availability, permits and flight schedules. Request the deposit amount, balance due date, cancellation conditions and any non-refundable costs before making a payment.</p></div></details>
      </div>
    </section>
    <section className="ce-gallery ce-wrap" id="gallery"><header><p className="ce-label">A few moments from these worlds</p><h2>Look a little <em className="ce-word-accent">closer.</em></h2></header><MediaGallery images={gallery} label="Big Cats field photographs" maxImages={20} /></section>
    <section className="ce-enquiry" id="enquire"><Image src={chapters[2].landscape} alt={chapters[2].landscapeAlt} fill sizes="100vw" /><div className="ce-enquiry-shade" /><div><p className="ce-label">The next chapter is yours</p><h2>Where does your<br /><em>curiosity lead?</em></h2><p>Tell us which landscapes call to you, when you would like to travel and who is coming along. We’ll shape the journey from there.</p><Link className="ce-button" href={enquiry}>Plan this journey ↗</Link></div></section>
  </article>;
}
