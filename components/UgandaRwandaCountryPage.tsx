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
import { ugandaDescription, ugandaPlaces, ugandaCombinations, ugandaFaqs } from "@/content/uganda-rwanda-editorial";
import "./KenyaCountryPage.css";
import "./TanzaniaCountryPage.css";
const forest = getDestination("bwindi-impenetrable")!;
const hero = forest.image;
const gallery = [forest.image, getDestination("kibale-national-park")!.image, getDestination("queen-elizabeth-national-park")!.image];
function placeImage(slug:string):ImageAsset {
 const destination = getDestination(slug)!;
 return ["bwindi-impenetrable", "kibale-national-park", "queen-elizabeth-national-park"].includes(slug) ? destination.image : getDestinationHeroImage(destination);
}
export function UgandaRwandaCountryPage() {
  return <div className="kenya-page tanzania-page">
    <JsonLd data={breadcrumbSchema([{name:"Home",path:"/"},{name:"Destinations",path:"/destinations"},{name:"Africa",path:"/destinations/africa"},{name:"Uganda & Rwanda",path:"/destinations/uganda"}])}/>
    <JsonLd data={faqSchema(ugandaFaqs)}/>
    <PageHero title="Uganda & Rwanda" copy={ugandaDescription} image={hero} focalPoint="50% 45%" meta="Africa / East Africa" variant="destination" breadcrumbs={[{label:"Home",href:"/"},{label:"Destinations",href:"/destinations"},{label:"Africa",href:"/destinations/africa"},{label:"Uganda & Rwanda"}]}/>
    <section className="kenya-facts" aria-label="Uganda and Rwanda at a glance"><div className="container kenya-facts-grid">
      <div><h2>Come for</h2><p>Gorillas, chimpanzees & safari</p><small>Forest treks, big mammals, birdlife and boat safaris.</small></div>
      <div><h2>Best time to visit</h2><p>June–September · December–February</p><small>Drier months favour trekking; green seasons bring lush forests and fewer visitors.</small></div>
      <div><h2>Ideal duration</h2><p>9–13 nights</p><small>Allow longer to combine primates with multiple safari landscapes.</small></div>
      <div><h2>Getting there</h2><p>Kigali / Entebbe</p><small>Cross-border road journeys and domestic flights connect the principal wildernesses.</small></div>
    </div></section>
    <section className="kenya-opening-band"><div className="container kenya-opening kenya-space"><div><p className="eyebrow">Forests, rivers and wild encounters</p><h2>East Africa beyond the savannah.</h2></div><div className="kenya-prose"><p className="kenya-lead">Rainforest, volcanic mountains and gorilla families.</p><p>Then come elephants, buffalo, lions and hippos. Uganda and Rwanda connect primates, predators, rainforest and classic safari in a journey shaped around time in each landscape.</p></div></div></section>
    <section className="container kenya-places" aria-labelledby="uganda-places"><header className="kenya-section-heading"><p className="eyebrow">Four places, chosen with purpose</p><h2 id="uganda-places">Two countries. Countless experiences.</h2></header>
      {ugandaPlaces.map(place=>{const asset=placeImage(place.slug);return <article className="kenya-place" key={place.slug}><h3 className="kenya-place-title">{place.title}</h3><div className="kenya-place-body"><figure className="tanzania-place-figure"><div className="kenya-place-image"><Image src={asset.src} alt={asset.alt} fill sizes="(max-width:760px) 100vw, 55vw"/></div></figure><div className="kenya-place-copy"><span className="kenya-number">{place.subtitle}</span><p>{place.copy}</p><CountryPlannerTrigger interest={`${place.title}, Uganda & Rwanda`}/></div></div></article>})}
    </section>
    <section className="kenya-gallery kenya-space"><div className="container"><div className="kenya-gallery-heading"><h2>A few moments in the wild.</h2><p>From Uganda’s forests and savannah.</p></div><MediaGallery images={gallery} label="Uganda field photographs"/></div></section>
    <section className="container kenya-combinations kenya-space"><header className="kenya-section-heading kenya-bento-heading"><p className="eyebrow">Suggested Uganda & Rwanda itineraries</p><h2>Four ways into the wild.</h2></header><ItineraryBento items={ugandaCombinations.map((combo)=>({title:combo.title,label:combo.duration,copy:combo.copy,image:placeImage(combo.slug),action:<CountryPlannerTrigger interest={`${combo.title} — ${combo.duration}`} className="itinerary-cta"/>}))}/></section>
    <section className="kenya-faq"><div className="container kenya-faq-grid"><header><p className="eyebrow">Before you go</p><h2>Question,<br/>meet answer.</h2></header><div>{ugandaFaqs.map(faq=><details key={faq.question}><summary>{faq.question}<Plus size={18}/></summary><p>{faq.answer}</p></details>)}</div></div></section>
    <section className="kenya-plan-band"><div className="container kenya-plan kenya-space"><div><p className="eyebrow">Your Uganda & Rwanda, thoughtfully composed</p><h2>Add Uganda & Rwanda to your memories.</h2></div><div><p>Tell us what brings you here, when you’d like to travel and how you like to explore. We’ll shape a journey around you.</p><CountryPlannerTrigger interest="Uganda & Rwanda" className="button button-solid"/></div></div></section>
    <section className="kenya-related"><div className="container"><p className="eyebrow">Related countries</p><h2>Keep exploring.</h2><div className="kenya-related-grid"><Link href="/destinations/kenya"><div><h3>Kenya</h3><p>Big cats, elephant country and the quiet conservancies of Laikipia.</p><span>Explore Kenya</span></div><ArrowUpRight/></Link><Link href="/destinations/tanzania"><div><h3>Tanzania</h3><p>Serengeti plains, seasonal herds and the enclosed world of the Ngorongoro crater.</p><span>Explore Tanzania</span></div><ArrowUpRight/></Link></div></div></section>
  </div>;
}
