import { ItineraryBento } from "@/components/ItineraryBento";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { MediaGallery } from "@/components/MediaGallery";
import { JsonLd } from "@/components/JsonLd";
import { CountryPlannerTrigger } from "@/components/CountryPlannerTrigger";
import { getDestination, type ImageAsset } from "@/lib/data";
import { getDestinationHeroImage } from "@/lib/media";
import { breadcrumbSchema, faqSchema } from "@/lib/structured-data";
import { tanzaniaDescription, tanzaniaPlaces, tanzaniaCombinations, tanzaniaFaqs } from "@/content/tanzania-editorial";
import "./KenyaCountryPage.css";
import "./TanzaniaCountryPage.css";
const serengeti = getDestination("serengeti")!;
const hero = serengeti.image;
const gallery = serengeti.gallery;
function placeImage(slug:string):ImageAsset {
  if(slug === "ndutu") return gallery[0];
  if(slug === "serengeti") return hero;
  return getDestinationHeroImage(getDestination(slug)!);
}
export function TanzaniaCountryPage() {
  return <div className="kenya-page tanzania-page">
    <JsonLd data={breadcrumbSchema([{name:"Home",path:"/"},{name:"Destinations",path:"/destinations"},{name:"Africa",path:"/destinations/africa"},{name:"Tanzania",path:"/destinations/tanzania"}])}/>
    <JsonLd data={faqSchema(tanzaniaFaqs)}/>
    <PageHero title="Tanzania" copy={tanzaniaDescription} image={hero} focalPoint="58% 90%" meta="Africa / East Africa" variant="destination" breadcrumbs={[{label:"Home",href:"/"},{label:"Destinations",href:"/destinations"},{label:"Africa",href:"/destinations/africa"},{label:"Tanzania"}]}/>
    <section className="kenya-facts" aria-label="Tanzania at a glance"><div className="container kenya-facts-grid">
      <div><h2>Come for</h2><p>Predators, elephants & seasonal herds</p><small>Plains, crater country, baobabs and Rift Valley birdlife.</small></div>
      <div><h2>Best time to visit</h2><p>January–March</p><small>A year-round destination; choose the season around your region and wildlife priorities.</small></div>
      <div><h2>Ideal duration</h2><p>8–12 nights</p><small>Stay longer for a slower Serengeti journey or a fuller northern circuit.</small></div>
      <div><h2>Getting there</h2><p>Kilimanjaro / Arusha</p><small>Light aircraft and road transfers connect the principal safari regions.</small></div>
    </div></section>
    <section className="kenya-opening-band"><div className="container kenya-opening kenya-space"><div><p className="eyebrow">East Africa on an epic scale</p><h2>See wildlife in lakes, craters and endless lands.</h2></div><div className="kenya-prose"><p className="kenya-lead">Tanzania’s greatest asset is scale.</p><p>Exploring it well means choosing the right pace. Connect a few contrasting landscapes, allow time to settle into each and let the season guide your route.</p></div></div></section>
    <section className="container kenya-places" aria-labelledby="tanzania-places"><header className="kenya-section-heading"><p className="eyebrow">Five places, chosen with purpose</p><h2 id="tanzania-places">Into the great soul of East Africa.</h2></header>
      {tanzaniaPlaces.map(place=>{const asset=placeImage(place.slug);return <article className="kenya-place" key={place.slug}><h3 className="kenya-place-title">{place.title}</h3><div className="kenya-place-body"><figure className="tanzania-place-figure"><div className="kenya-place-image"><Image src={asset.src} alt={asset.alt} fill sizes="(max-width:760px) 100vw, 55vw"/></div>{place.slug === "ndutu" ? <figcaption>From the wider Serengeti ecosystem · Safari Crafters archive</figcaption> : null}</figure><div className="kenya-place-copy"><span className="kenya-number">{place.subtitle}</span><p>{place.copy}</p><CountryPlannerTrigger interest={`${place.title}, Tanzania`}/></div></div></article>})}
    </section>
    <section className="kenya-gallery kenya-space"><div className="container"><div className="kenya-gallery-heading"><h2>A few moments in the wild.</h2><p>From our Serengeti archive.</p></div><MediaGallery images={gallery} label="Serengeti field photographs"/></div></section>
    <section className="container kenya-combinations kenya-space"><header className="kenya-section-heading kenya-bento-heading"><p className="eyebrow">Suggested Tanzania itineraries</p><h2>Four ways to explore Tanzania.</h2></header><ItineraryBento items={tanzaniaCombinations.map((combo,index)=>({title:combo.title,label:combo.duration,copy:combo.copy,image:placeImage(["serengeti","tarangire","ndutu","lake-manyara"][index]),action:<CountryPlannerTrigger interest={`${combo.title} — ${combo.duration}`} className="itinerary-cta"/>}))}/></section>
    <section className="kenya-faq"><div className="container kenya-faq-grid"><header><p className="eyebrow">Before you go</p><h2>Question,<br/>meet answer.</h2></header><div>{tanzaniaFaqs.map(faq=><details key={faq.question}><summary>{faq.question}<Plus size={18}/></summary><p>{faq.answer}</p></details>)}</div></div></section>
    <section className="kenya-plan-band"><div className="container kenya-plan kenya-space"><div><p className="eyebrow">Your Tanzania, thoughtfully composed</p><h2>Take to Tanzania.</h2></div><div><p>Tell us what brings you here, when you’d like to travel and how you like to explore. We’ll shape a journey around you.</p><CountryPlannerTrigger interest="Tanzania" className="button button-solid"/></div></div></section>
    <section className="kenya-related"><div className="container"><p className="eyebrow">Related countries</p><h2>Keep exploring.</h2><div className="kenya-related-grid"><Link href="/destinations/kenya"><div><h3>Kenya</h3><p>Big cats, elephant country and the quiet conservancies of Laikipia.</p><span>Explore Kenya</span></div><ArrowUpRight/></Link><Link href="/destinations/uganda"><div><h3>Uganda & Rwanda</h3><p>Forest trails, mountain gorillas and a different rhythm of wildlife encounters.</p><span>Explore Uganda & Rwanda</span></div><ArrowUpRight/></Link></div></div></section>
  </div>;
}
