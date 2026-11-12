import { distinctTourFaqs, uniqueTourCopy } from '@/lib/tour-content';
import Image from 'next/image';
import Link from 'next/link';
import type { ImageAsset, Journey } from '@/lib/data';
import layouts from '@/content/journey-experience-layouts.json';
import { PageHero } from './PageHero';
import { JsonLd } from './JsonLd';
import { MediaGallery } from './MediaGallery';
import { BigCatsMotion } from './BigCatsMotion';
import { breadcrumbSchema, faqSchema, journeySchema } from '@/lib/structured-data';
import { tourPriceLabel } from '@/lib/tour-pricing';
import './BigCatsExperience.css';
import './JourneyExperience.css';

type Chapter = { place: string; photoPlace: string; destination: string; indexes: number[]; photos: ImageAsset[] };
type Layout = { chapters: Chapter[]; bookends: number[]; hero: ImageAsset; overview: { eyebrow: string; lines: { text: string; accent: string }[]; copy: string } };
const layoutMap: Record<string, Layout> = layouts;
export const hasJourneyExperience = (slug: string) => Boolean(layoutMap[slug]);
const clean = (value?: string) => (value || '').replace(/\s*—\s*/g, ', ');
const number = (i: number) => String(i + 1).padStart(2, '0');

export function JourneyExperience({ journey }: { journey: Journey }) {
  const { chapters, bookends, hero, overview } = layoutMap[journey.slug];
  const enquiry = `/plan?journey=${journey.slug}`;
  const gallery = Array.from(new Map(chapters.flatMap(c => c.photos).map(p => [p.src, p])).values());
  const overviewPhoto = gallery.find(p => p.src !== hero.src) || hero;
  const secondPhoto = gallery[Math.floor(gallery.length / 2)] || hero;
  const titleWords = journey.title.split(' ');
  const titleBreak = Math.ceil(titleWords.length / 2);
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Journeys', path: '/journeys' }, { name: journey.title, path: `/journeys/${journey.slug}` }];
  const dayLabel = (c: Chapter) => {
    if (journey.itineraryKind === 'stages') return 'Flexible route stage';
    const first = journey.days[c.indexes[0]].label;
    const last = journey.days[c.indexes[c.indexes.length - 1]].label;
    const start = first?.match(/\d+/)?.[0];
    const end = last?.match(/\d+/g)?.at(-1);
    return start && end ? start === end ? `Day ${start}` : `Days ${start}–${end}` : 'Tailored to your dates';
  };
  const intro = uniqueTourCopy(journey.intro.split(/\n\s*\n/), [journey.description, overview.copy]);
  const highlights = uniqueTourCopy(journey.highlights, [...intro, overview.copy, journey.description]);
  const faqs = distinctTourFaqs(journey.faqs || [], [journey.customizationNote || '', journey.wildlifeExpectation || '', journey.photography || '', ...intro]);
  const chapterLead = (chapter: Chapter) => journey.days[chapter.indexes[0]].copy.split(/(?<=[.!?])\s/).slice(0, 2).join(' ');
  const planningName = `${journey.slug}-planning`;
  return <article className="cats-expedition journey-experience" id="cats-expedition">
    <JsonLd data={journeySchema(journey)} /><JsonLd data={breadcrumbSchema(crumbs)} />{faqs.length > 0 && <JsonLd data={faqSchema(faqs)} />}
    <PageHero title={journey.title} accent={titleWords.slice(titleBreak).join(' ')} titleSize="compact" variant="destination" copy={clean(journey.description)} image={hero} meta={`A private journey · ${(journey.countries || ['India']).join(' & ')}`} breadcrumbs={[{label:'Home',href:'/'},{label:'Journeys',href:'/journeys'}]} />
    <nav className="ce-navigation" aria-label="Journey sections"><a href="#overview">The experience</a><a href="#itinerary">The chapters</a><a href="#planning">Planning details</a><a href="#gallery">Gallery</a><Link href={enquiry}>Plan this journey ↗</Link></nav>
    <section className="ce-overview ce-wrap" id="overview">
      <header className="ce-section-heading"><div><p className="ce-label">{overview.eyebrow}</p><h2>{overview.lines.map((line, index) => <span className="je-overview-line" key={index}>{line.text}<em className="ce-word-accent">{line.accent}</em></span>)}</h2></div><p>{overview.copy}</p></header>
      <div className="ce-mosaic"><figure className="ce-mosaic-landscape ce-reveal"><Image src={overviewPhoto.src} alt={clean(overviewPhoto.alt)} fill sizes="(max-width: 760px) 100vw, 55vw" style={{ objectPosition: overviewPhoto.focalPoint }} /><figcaption>{clean(overviewPhoto.alt)}</figcaption></figure><div className="ce-mosaic-note ce-reveal"><span className="ce-label">The shape of your journey</span><p>{clean(journey.duration)}</p><span>Private · Customisable<br />{clean(journey.bestMonths)}</span></div><figure className="ce-mosaic-animal ce-reveal"><Image src={secondPhoto.src} alt={clean(secondPhoto.alt)} fill sizes="(max-width: 760px) 50vw, 30vw" style={{ objectPosition: secondPhoto.focalPoint }} /><figcaption>{clean(secondPhoto.alt)}</figcaption></figure></div>
      <div className="ce-route" aria-label="Journey chapters"><span className="ce-label">Your passage</span><ol>{chapters.map((c, i) => <li key={i}><a href={`#chapter-${i}`}><span>{number(i)}</span>{c.place}</a><small>{dayLabel(c)}</small></li>)}{bookends.map(i => <li key={`travel-${i}`}><a href={`#travel-${i}`}>{clean(journey.days[i].title)}</a><small>{journey.itineraryKind === 'stages' ? 'Flexible route stage' : journey.days[i].label}</small></li>)}</ol><span className="ce-route-line" aria-hidden="true" /></div>
    </section>
    <section className="ce-story" id="itinerary"><div className="ce-story-heading ce-wrap"><p className="ce-label">The journey unfolds</p><h2>A new landscape.<br /><em className="ce-word-accent">Another perspective.</em></h2><BigCatsMotion /></div>
      <div className="ce-story-layout"><div className="ce-stage" aria-hidden="true">{chapters.map((c, i) => <div className={`ce-frame ${i === 0 ? 'is-current' : ''}`} key={i} data-frame={i}>{c.photos[0] ? <Image src={c.photos[0].src} alt="" fill sizes="60vw" style={{ objectPosition: c.photos[0].focalPoint }} /> : <div className="je-route-panel"><span className="ce-label">The onward journey</span><strong>{c.place}</strong><span>{dayLabel(c)}</span><ol>{chapters.map((stop, n) => <li key={n} className={n === i ? 'active' : ''}>{stop.place}</li>)}</ol></div>}<div className="ce-frame-caption"><span>{number(i)} / {String(chapters.length).padStart(2, '0')}</span><strong>{c.photos[0] ? c.photoPlace : c.place}</strong></div></div>)}<div className="ce-stage-progress"><span /></div></div>
        <div className="ce-chapters">{chapters.map((c, i) => <section className={`ce-chapter ${c.photos.length ? '' : 'je-text-chapter'}`} id={`chapter-${i}`} key={i} data-chapter={i}>
          {c.photos[0] && <figure className="ce-mobile-photo"><Image src={c.photos[0].src} alt={clean(c.photos[0].alt)} width={1200} height={900} sizes="100vw" style={{ objectPosition: c.photos[0].focalPoint }} /></figure>}
          <div className="ce-chapter-copy"><div className="ce-chapter-top"><span className="ce-chapter-number">{number(i)}</span><div><p className="ce-label">{c.place}</p><span>{dayLabel(c)}</span></div></div><h3>{c.place}</h3><p className="ce-chapter-text">{clean(c.indexes.length === 1 ? journey.days[c.indexes[0]].copy : chapterLead(c))}</p>
            {c.indexes.length > 1 ? <details className="ce-day-plan"><summary>Explore the daily plan <span aria-hidden="true">+</span></summary><div>{c.indexes.map(index => <div className="ce-day" key={index}><h4>{clean([journey.days[index].label, journey.days[index].title].filter(Boolean).join(' · '))}</h4>{(index !== c.indexes[0] || journey.days[index].copy.length > chapterLead(c).length) && <p>{clean(index === c.indexes[0] ? journey.days[index].copy.slice(chapterLead(c).length).trim() : journey.days[index].copy)}</p>}{journey.days[index].stay && <p>{clean(journey.days[index].stay)}</p>}</div>)}</div></details> : journey.days[c.indexes[0]].stay ? <p className="ce-chapter-detail">{clean(journey.days[c.indexes[0]].stay)}</p> : null}
            {c.photos.length > 1 && <div className="ce-chapter-photos"><MediaGallery images={c.photos.slice(1, 3)} label={`${c.photoPlace} photographs`} maxImages={2} /></div>}
            {c.destination && <Link className="ce-destination-link" href={`/destinations/${c.destination}`}>Discover {c.photoPlace} ↗</Link>}
          </div></section>)}</div></div>
      {bookends.length > 0 && <div className="ce-bookends ce-wrap">{bookends.map(i => <details key={i} id={`travel-${i}`}><summary><span className="ce-label">{journey.days[i].label || 'Travel arrangements'}</span>{clean(journey.days[i].title)}<span aria-hidden="true">+</span></summary><p>{clean(journey.days[i].copy)}</p></details>)}</div>}
    </section>
    <section className="ce-planning ce-wrap" id="planning"><header className="ce-section-heading"><div><p className="ce-label">The details, considered</p><h2>Room to <em className="ce-word-accent">explore.</em><br />A <em className="ce-word-accent">plan</em> for everything else.</h2></div><div className="ce-price"><span className="ce-label">Journey guide price</span><p>{tourPriceLabel(journey.price)}</p><small>{journey.priceNote || 'Confirm currency, occupancy, travel dates and applicable taxes in your personalised quote.'}</small><Link className="ce-button" href={enquiry}>Plan this journey ↗</Link></div></header>

      {journey.planningNote && <p className="je-planning-note">{journey.planningNote}</p>}
      <div className="ce-planning-accordions ce-planning-topics">
        <details name={planningName}><summary>About this journey <span aria-hidden="true">+</span></summary><div className="ce-topic-copy">{intro.map((paragraph, i) => <p key={i}>{clean(paragraph)}</p>)}{highlights.length > 0 && <><h3>Highlights</h3><ul>{highlights.map(item => <li key={item}>{clean(item)}</li>)}</ul></>}{journey.idealGuest && <><h3>Who it suits</h3><p>{clean(journey.idealGuest)}</p></>}</div></details>
        <details name={planningName}><summary>Inclusions &amp; additional costs <span aria-hidden="true">+</span></summary><div className="ce-topic-columns"><div><h3>Included</h3><ul>{journey.inclusions?.map(x => <li key={x}>{clean(x)}</li>)}</ul></div><div><h3>Additional costs</h3><ul>{journey.exclusions?.map(x => <li key={x}>{clean(x)}</li>)}</ul></div></div></details>
        <details name={planningName}><summary>Travel &amp; suitability <span aria-hidden="true">+</span></summary><div className="ce-topic-copy"><h3>Travel style</h3><p>{clean(journey.groupSize)}</p><h3>Physical demands</h3><p>{clean(journey.difficulty)}</p><h3>Pace &amp; access</h3>{journey.pace && <p>{clean(journey.pace)}</p>}<p>{clean(journey.accessApproach)}</p>{journey.wildlifeExpectation && <p>{clean(journey.wildlifeExpectation)}</p>}{journey.photography && <><h3>Photography</h3><p>{clean(journey.photography)}</p></>}<p>Share your arrival airport, travel dates and any mobility requirements so we can plan the connections around you.</p></div></details>
        <details name={planningName}><summary>Accommodation <span aria-hidden="true">+</span></summary><div className="ce-topic-copy"><p>{clean(journey.accommodation) || 'Accommodation is selected around your itinerary and preferences.'} Named stays and room categories are confirmed with your proposal.</p></div></details>
        <details name={planningName}><summary>Customising your journey <span aria-hidden="true">+</span></summary><div className="ce-topic-copy"><p>{clean(journey.customizationNote) || 'We can tailor the route, duration and pace around your interests.'}</p></div></details>
        <details name={planningName}><summary>Booking &amp; payment <span aria-hidden="true">+</span></summary><div className="ce-topic-copy"><p>Your proposal is subject to accommodation availability, permits and travel schedules. Confirm the deposit, balance due date, cancellation conditions and any non-refundable costs before payment.</p></div></details>
      </div>
    </section>
    {faqs.length > 0 && <section className="ce-wrap ce-faq" data-tour-faq aria-labelledby="journey-faq-title"><h2 id="journey-faq-title">Journey questions</h2><div className="ce-planning-accordions">{faqs.map(f => <details key={f.question} name="journey-faq"><summary>{clean(f.question)}<span aria-hidden="true">+</span></summary><p>{clean(f.answer)}</p></details>)}</div></section>}
    <section className="ce-gallery ce-wrap" id="gallery"><header><p className="ce-label">Moments along the way</p><h2>Look a little <em className="ce-word-accent">closer.</em></h2></header><MediaGallery images={gallery} label={`${journey.title} photographs`} maxImages={20} /></section>
    <section className="ce-enquiry" id="enquire"><Image src={secondPhoto.src} alt={clean(secondPhoto.alt)} fill sizes="100vw" /><div className="ce-enquiry-shade" /><div><p className="ce-label">The next chapter is yours</p><h2>Where does your<br /><em>curiosity lead?</em></h2><p>Tell us which places call to you, when you would like to travel and who is coming along.</p><Link href={enquiry} className="ce-button">Plan this journey ↗</Link></div></section>
  </article>;
}
