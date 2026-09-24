import Image from "next/image";
import { Plus } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { MediaGallery } from "@/components/MediaGallery";
import { JsonLd } from "@/components/JsonLd";
import { CountryPlannerTrigger } from "@/components/CountryPlannerTrigger";
import { getDestination, type ImageAsset } from "@/lib/data";
import { getDestinationHeroImage } from "@/lib/media";
import { breadcrumbSchema, faqSchema } from "@/lib/structured-data";
import { brazilDescription, brazilPlaces, brazilFaqs } from "@/content/brazil-editorial";
import "./KenyaCountryPage.css";
import "./TanzaniaCountryPage.css";
const brazil = getDestination("brazil")!;
const hero = brazil.image;
const gallery = [getDestination("pantanal")!.gallery[0], brazil.gallery[2], brazil.gallery[4]];
function placeImage(slug:string):ImageAsset {
 const destination = getDestination(slug)!;
 return ["pantanal", "atlantic-rainforest"].includes(slug) ? destination.image : getDestinationHeroImage(destination);
}
export function BrazilCountryPage() {
  return <div className="kenya-page tanzania-page">
    <JsonLd data={breadcrumbSchema([{name:"Home",path:"/"},{name:"Destinations",path:"/destinations"},{name:"Americas",path:"/destinations/americas"},{name:"Brazil",path:"/destinations/brazil"}])}/>
    <JsonLd data={faqSchema(brazilFaqs)}/>
    <PageHero title="Brazil" copy={brazilDescription} image={hero} focalPoint="50% 45%" meta="Americas / Big Cats" variant="destination" breadcrumbs={[{label:"Home",href:"/"},{label:"Destinations",href:"/destinations"},{label:"Americas",href:"/destinations/americas"},{label:"Brazil"}]}/>
    <section className="kenya-facts" aria-label="Brazil at a glance"><div className="container kenya-facts-grid">
      <div><h2>Come for</h2><p>Jaguars, birdlife & river safaris</p><small>Wetlands, rainforests and remarkable wildlife encounters.</small></div>
      <div><h2>Best time to visit</h2><p>June–October</p><small>Rewarding for wildlife, especially in the Pantanal; timing varies by region.</small></div>
      <div><h2>Ideal duration</h2><p>10–14 nights</p><small>Allow longer to combine the Pantanal with Amazonia or the Atlantic Rainforest.</small></div>
      <div><h2>Getting there</h2><p>São Paulo / Rio de Janeiro</p><small>Domestic flights connect Brazil’s major wildlife regions.</small></div>
    </div></section>
    <section className="kenya-opening-band"><div className="container kenya-opening kenya-space"><div><p className="eyebrow">A country of extraordinary contrasts</p><h2>A full house of wildlife.</h2></div><div className="kenya-prose"><p className="kenya-lead">Brazil is not one wilderness.</p><p>Begin among the Pantanal’s rivers and wetlands, enter the deep green of Amazonia, discover the Atlantic Rainforest, then stand before Iguazu Falls. The contrast is what makes Brazil so rewarding.</p></div></div></section>
    <section className="container kenya-places" aria-labelledby="brazil-places"><header className="kenya-section-heading"><p className="eyebrow">Four places, chosen with purpose</p><h2 id="brazil-places">Choose your Brazil.</h2></header>
      {brazilPlaces.map(place=>{const asset=placeImage(place.slug);return <article className="kenya-place" key={place.slug}><h3 className="kenya-place-title">{place.title}</h3><div className="kenya-place-body"><figure className="tanzania-place-figure"><div className="kenya-place-image"><Image src={asset.src} alt={asset.alt} fill sizes="(max-width:760px) 100vw, 55vw"/></div></figure><div className="kenya-place-copy"><span className="kenya-number">{place.subtitle}</span><p>{place.copy}</p><CountryPlannerTrigger region="The Americas" interest={`${place.title}, Brazil`}/></div></div></article>})}
    </section>
    <section className="kenya-gallery kenya-space"><div className="container"><div className="kenya-gallery-heading"><h2>A few moments in the wild.</h2><p>From Brazil’s rivers, forests and open country.</p></div><MediaGallery images={gallery} label="Brazil field photographs"/></div></section>
    <section className="kenya-luxury" aria-labelledby="brazil-story"><div className="container kenya-luxury-grid"><figure><div className="kenya-luxury-image"><Image src={getDestination("atlantic-rainforest")!.image.src} alt={getDestination("atlantic-rainforest")!.image.alt} fill sizes="(max-width:760px) 100vw, 45vw"/></div></figure><div className="kenya-prose"><p className="eyebrow">Beyond the familiar</p><h2 id="brazil-story">Fulfilling for the curious.</h2><p>The Brazil we want you to discover stretches far beyond Rio. A jaguar slipping through Pantanal reeds. A howler monkey calling in Amazonia. An endemic bird moving through the Atlantic Forest. The sudden roar of Iguazu.</p><p>These are pieces of one of the most biodiverse countries on Earth, connected through a journey that gives each place time.</p></div></div></section>
    <section className="kenya-faq"><div className="container kenya-faq-grid"><header><p className="eyebrow">Before you go</p><h2>Question,<br/>meet answer.</h2></header><div>{brazilFaqs.map(faq=><details key={faq.question}><summary>{faq.question}<Plus size={18}/></summary><p>{faq.answer}</p></details>)}</div></div></section>
    <section className="kenya-plan-band"><div className="container kenya-plan kenya-space"><div><p className="eyebrow">Your Brazil, thoughtfully composed</p><h2>Bring yourself to Brazil.</h2></div><div><p>Tell us what matters. We’ll shape your journey around it.</p><CountryPlannerTrigger region="The Americas" interest="Brazil" className="button button-solid"/></div></div></section>
  </div>;
}
