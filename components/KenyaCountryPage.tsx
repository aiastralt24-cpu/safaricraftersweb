import { ItineraryBento } from "@/components/ItineraryBento";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { MediaGallery } from "@/components/MediaGallery";
import { JsonLd } from "@/components/JsonLd";
import { getDestination, type ImageAsset } from "@/lib/data";
import { breadcrumbSchema, faqSchema } from "@/lib/structured-data";
import { kenyaCombinations, kenyaDescription, kenyaFaqs, kenyaPlaces } from "@/content/kenya-editorial";
import "./KenyaCountryPage.css";

const image = (src: string, alt: string): ImageAsset => ({ src, alt, credit: "Safari Crafters archive" });
const hero = image("/assets/destinations/masai-mara/masai-mara-01.jpg", "Buffalo on the Masai Mara plains beneath a golden sunrise");
const gallery = [
  image("/assets/destinations/amboseli/amboseli-02.jpg", "An elephant herd crossing the Amboseli plains"),
  image("/assets/destinations/laikipia/supplied/03.webp", "Black leopard crossing a woodland track in Laikipia"),
  image("/assets/destinations/masai-mara/masai-mara-03.jpg", "Ostriches beneath dramatic clouds in the Masai Mara")
];
const plannerHref = "/plan?destination=kenya";

export function KenyaCountryPage() {
  return <div className="kenya-page">
    <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Destinations", path: "/destinations" }, { name: "Africa", path: "/destinations/africa" }, { name: "Kenya", path: "/destinations/kenya" }])} />
    <JsonLd data={faqSchema(kenyaFaqs)} />
    <PageHero title="Kenya" copy={kenyaDescription} image={hero} focalPoint="35% 100%" meta="Africa / East Africa" variant="destination" breadcrumbs={[{label:"Home",href:"/"},{label:"Destinations",href:"/destinations"},{label:"Africa",href:"/destinations/africa"},{label:"Kenya"}]} />

    <section className="kenya-facts" aria-label="Kenya at a glance">
      <div className="container kenya-facts-grid">
        <div><h2>Come for</h2><p>Big cats, elephants & the Great Migration</p><small>Vehicle safaris, photography, private conservancies and carefully chosen camps.</small></div>
        <div><h2>Best time to visit</h2><p>January–March · June–October</p><small>Travel is possible year-round; match the season to your wildlife priorities.</small></div>
        <div><h2>Ideal duration</h2><p>At least 7 nights</p><small>Allow 10–14 nights for a slower journey through all three regions.</small></div>
        <div><h2>Getting there</h2><p>Begin in Nairobi</p><small>Light aircraft and road transfers connect your chosen wildlife regions.</small></div>
      </div>
    </section>

    <section className="kenya-opening-band" aria-labelledby="kenya-intro"><div className="container kenya-opening kenya-space">
      <div><p className="eyebrow">A first safari. A lasting connection.</p><h2 id="kenya-intro">A country of<br/>no compromises.</h2></div>
      <div className="kenya-prose"><p className="kenya-lead">First time in Africa? You’ve come to the right place.</p><p>A Kenya safari can be rewarding without trying to see everything. Choose a few places that speak to you, settle in and leave room for the unexpected.</p></div>
    </div></section>

    <section className="container kenya-places" aria-labelledby="kenya-places-title">
      <header className="kenya-section-heading"><p className="eyebrow">Three places, chosen with purpose</p><h2 id="kenya-places-title">The many jewels<br/>in Kenya’s crown.</h2></header>
      {kenyaPlaces.map((place) => {
        const destination = getDestination(place.slug);
        if (!destination) return null;
        const asset = place.slug === "masai-mara" ? image("/assets/destinations/masai-mara/masai-mara-02.jpg", "Lion on a green hillside beneath storm clouds in the Masai Mara") : destination.image;
        return <article className="kenya-place" key={place.slug}>
          <h3 className="kenya-place-title">{place.title}</h3>
          <div className="kenya-place-body">
          <Link className="kenya-place-image" href={`/destinations/${place.slug}`} aria-label={`Explore ${place.title}`}><Image src={asset.src} alt={asset.alt} fill sizes="(max-width: 760px) 100vw, 56vw" /></Link>
          <div className="kenya-place-copy"><span className="kenya-number">{place.subtitle}</span><p>{place.copy}</p><small>{place.focus}</small><Link className="kenya-text-link" href={`/destinations/${place.slug}`}>Explore {place.title}<ArrowUpRight size={18}/></Link></div>
          </div>
        </article>;
      })}
    </section>

    <section className="kenya-gallery kenya-space" aria-labelledby="kenya-gallery-title"><div className="container"><div className="kenya-gallery-heading"><h2 id="kenya-gallery-title">A few moments in the wild.</h2><p>Different landscapes. A new way of looking.</p></div><MediaGallery images={gallery} label="Kenya field photographs" /></div></section>

    <section className="kenya-luxury" aria-labelledby="kenya-luxury-title"><div className="container kenya-luxury-grid">
      <figure><div className="kenya-luxury-image"><Image src="/assets/destinations/laikipia/supplied/05.webp" alt="Black leopard leaping between rocks in Laikipia" fill sizes="(max-width: 760px) 100vw, 45vw" /></div><figcaption>Laikipia / Time, patience and a different perspective.</figcaption></figure>
      <div className="kenya-prose"><p className="eyebrow">The details make the difference</p><h2 id="kenya-luxury-title">What true luxury<br/>means in Kenya.</h2><p>Luxury is not simply a beautiful camp, a private pool or an excellent bottle of wine. Those things are pleasant. What makes a safari exceptional is how the whole journey has been considered.</p><p>Where you stay. Which conservancy you choose. Who guides you. How much time you spend in the field, and how much freedom you have once you are there.</p><p>It is knowing when a flight makes sense, when a road transfer is worthwhile, when to stay three nights instead of two, and when a private vehicle will make the difference.</p><p className="kenya-luxury-last">Knowing someone has thought through those details before you arrive. That is our definition of luxury.</p></div>
    </div></section>

    <section className="container kenya-combinations kenya-space" aria-labelledby="kenya-combos-title">
      <header className="kenya-section-heading kenya-bento-heading"><p className="eyebrow">Suggested Kenya itineraries</p><h2 id="kenya-combos-title">Three ways to explore Kenya.</h2></header>
      <ItineraryBento items={kenyaCombinations.map(combo=>({title:combo.title,label:combo.note,copy:combo.copy,image:combo.image,href:`${plannerHref}&kenyaRoute=${combo.slug}`}))}/>
    </section>

    <section className="kenya-faq" aria-labelledby="kenya-faq-title"><div className="container kenya-faq-grid"><header><p className="eyebrow">Before you go</p><h2 id="kenya-faq-title">Question,<br/>meet answer.</h2></header><div>{kenyaFaqs.map(faq=><details key={faq.question}><summary>{faq.question}<Plus size={18} aria-hidden="true"/></summary><p>{faq.answer}</p></details>)}</div></div></section>

    <section className="kenya-plan-band" aria-labelledby="kenya-plan-title"><div className="container kenya-plan kenya-space"><div><p className="eyebrow">Your Kenya, thoughtfully composed</p><h2 id="kenya-plan-title">Make your own<br/>Kenya plan.</h2></div><div><p>Tell us your dates, who’s travelling and what you hope to experience. We’ll help you take the next step.</p><Link className="button button-solid" href={plannerHref}>Start planning<ArrowUpRight size={18}/></Link></div></div></section>

    <section className="kenya-related" aria-labelledby="kenya-related-title"><div className="container"><p className="eyebrow">Related countries</p><h2 id="kenya-related-title">Keep exploring.</h2><div className="kenya-related-grid"><Link href="/destinations/tanzania"><div><h3>Tanzania</h3><p>Serengeti plains, the wildlife of Ndutu and the enclosed world of the Ngorongoro crater.</p><span>Explore Tanzania</span></div><ArrowUpRight/></Link><Link href="/destinations/uganda"><div><h3>Uganda & Rwanda</h3><p>Forest trails, mountain gorillas and a different rhythm of wildlife encounters.</p><span>Explore Uganda & Rwanda</span></div><ArrowUpRight/></Link></div></div></section>
  </div>;
}
