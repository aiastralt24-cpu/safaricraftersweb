import { tanzaniaPageCopy as copy } from "@/content/tanzania-page-copy";
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
const gallery = getDestination("tanzania")!.gallery;
function placeImage(slug:string):ImageAsset {
  if(slug === "ndutu") return hero;
  if(slug === "serengeti") return hero;
  return getDestinationHeroImage(getDestination(slug)!);
}
export function TanzaniaCountryPage() {
  return <div className="kenya-page tanzania-page">
    <JsonLd data={breadcrumbSchema([{name:"Home",path:"/"},{name:"Destinations",path:"/destinations"},{name:"Africa",path:"/destinations/africa"},{name:"Tanzania",path:"/destinations/tanzania"}])}/>
    <JsonLd data={faqSchema(tanzaniaFaqs)}/>
    <PageHero accent="Tanzania" title="Tanzania" copy={tanzaniaDescription} image={hero} focalPoint="58% 90%" meta="Africa / East Africa" variant="destination" breadcrumbs={[{label:"Home",href:"/"},{label:"Destinations",href:"/destinations"},{label:"Africa",href:"/destinations/africa"},{label:"Tanzania"}]}/>
    <section className="kenya-facts" aria-label={copy.factsLabel}><div className="container kenya-facts-grid">
      {copy.facts.map(fact=><div key={fact.id}><h2>{fact.label}</h2><p>{fact.value}</p><small>{fact.note}</small></div>)}
    </div></section>
    <section className="kenya-opening-band"><div className="container kenya-opening kenya-space"><div><p className="eyebrow">{copy.introduction.eyebrow}</p><h2>{copy.introduction.heading}</h2></div><div className="kenya-prose"><p className="kenya-lead">{copy.introduction.lead}</p><p>{copy.introduction.copy}</p></div></div></section>
    <section className="container kenya-places" aria-labelledby="tanzania-places"><header className="kenya-section-heading"><p className="eyebrow">{copy.places.eyebrow}</p><h2 id="tanzania-places">{copy.places.heading}</h2></header>
      {tanzaniaPlaces.map(place=>{const asset=placeImage(place.slug);return <article className="kenya-place" key={place.slug}><h3 className="kenya-place-title">{place.title}</h3><div className="kenya-place-body"><figure className="tanzania-place-figure"><div className="kenya-place-image"><Image src={asset.src} alt={asset.alt} fill sizes="(max-width:760px) 100vw, 55vw"/></div>{place.slug === "ndutu" ? <figcaption>{copy.places.ndutuCaption}</figcaption> : null}</figure><div className="kenya-place-copy"><span className="kenya-number">{place.subtitle}</span><p>{place.copy}</p><CountryPlannerTrigger interest={`${place.title}, Tanzania`}/></div></div></article>})}
    </section>
    <section className="kenya-gallery kenya-space"><div className="container"><div className="kenya-gallery-heading"><h2>{copy.gallery.heading}</h2><p>{copy.gallery.copy}</p></div><MediaGallery images={gallery} label={copy.gallery.label}/></div></section>
    <section className="container kenya-combinations kenya-space"><header className="kenya-section-heading kenya-bento-heading"><p className="eyebrow">{copy.itineraries.eyebrow}</p><h2>{copy.itineraries.heading}</h2></header><ItineraryBento items={tanzaniaCombinations.map((combo,index)=>({title:combo.title,label:combo.duration,copy:combo.copy,image:placeImage(["serengeti","tarangire","ndutu","lake-manyara"][index]),action:<CountryPlannerTrigger interest={`${combo.title} — ${combo.duration}`} className="itinerary-cta"/>}))}/></section>
    <section className="kenya-faq"><div className="container kenya-faq-grid"><header><p className="eyebrow">{copy.faq.eyebrow}</p><h2>{copy.faq.lines[0]}<br/>{copy.faq.lines[1]}</h2></header><div>{tanzaniaFaqs.map(faq=><details key={faq.question}><summary>{faq.question}<Plus size={18}/></summary><p>{faq.answer}</p></details>)}</div></div></section>
    <section className="kenya-plan-band"><div className="container kenya-plan kenya-space"><div><p className="eyebrow">{copy.planner.eyebrow}</p><h2>{copy.planner.heading}</h2></div><div><p>{copy.planner.copy}</p><CountryPlannerTrigger interest="Tanzania" className="button button-solid"/></div></div></section>
    <section className="kenya-related"><div className="container"><p className="eyebrow">{copy.related.eyebrow}</p><h2>{copy.related.heading}</h2><div className="kenya-related-grid">{copy.related.items.map(item=><Link key={item.id} href={item.href}><div><h3>{item.title}</h3><p>{item.copy}</p><span>{item.label}</span></div><ArrowUpRight/></Link>)}</div></div></section>
  </div>;
}
