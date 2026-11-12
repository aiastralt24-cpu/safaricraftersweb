import { distinctListingImages, listingHeroImage } from "@/lib/listing-content";
import {CmsJournalListing} from '@/components/CmsJournalListing';
import {usesCmsJournal} from '@/lib/cms/journal-route';
import {journalListReader,readPublishedJournalList} from '@/lib/cms/published-journal-list';
import '../article.css';
import { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { JsonLd } from "@/components/JsonLd";
import { journal, journalCategories } from "@/lib/data";
import { breadcrumbSchema } from "@/lib/structured-data";
import { JournalIndex } from "./JournalIndex";
import "../listing.css";

export const dynamic='force-dynamic';
export const metadata: Metadata = {
  title: "The Journal",
  description: "Field notes, photography, conservation, safari intelligence and people from Safari Crafters."
};

export default async function JournalPage() {
  if(usesCmsJournal()){const articles=await readPublishedJournalList(journalListReader());return <><JsonLd data={breadcrumbSchema([{name:"Home",path:"/"},{name:"The Journal",path:"/journal"}])}/><CmsJournalListing articles={articles}/></>;}
  const articles = distinctListingImages(journal);
  const heroImage = listingHeroImage(journal[0].image, journal[0].gallery, articles.map(article => article.image));
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "The Journal", path: "/journal" }])} />
      <PageHero
        title="The Journal"
        copy="Field notes, photographic essays, conservation thinking and practical safari intelligence, written with the care of a magazine rather than a blog."
        image={heroImage}
        meta="Field Notes · Photography · Conservation"
        variant="destination"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "The Journal" }]}
      />
      <section className="section surface-white">
        <JournalIndex articles={articles} categories={journalCategories} />
      </section>
    </>
  );
}
