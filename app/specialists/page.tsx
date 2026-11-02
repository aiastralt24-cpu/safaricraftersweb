import { EditorialFilm } from "@/components/EditorialFilm";
import {cache} from 'react';
import {notFound} from 'next/navigation';
import {CmsSpecialistPage} from '@/components/CmsSpecialistPage';
import {loadSpecialistRoute,usesCmsSpecialists} from '@/lib/cms/specialist-page-runtime';
import {specialistPageMetadata} from '@/lib/cms/specialist-page';
import { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { JsonLd } from "@/components/JsonLd";
import { expeditions, journeys, specialists } from "@/lib/data";
import { personSchema,siteUrl } from "@/lib/structured-data";
import "../simple.css";

export const dynamic='force-dynamic';
const loadCmsPage=cache(()=>loadSpecialistRoute());
const legacyMetadata: Metadata = {
  title: "Specialists",
  description: "Named Safari Crafters specialists for India safaris, Africa safaris and photography-led expeditions."
};

export async function generateMetadata():Promise<Metadata>{
 if(!usesCmsSpecialists())return legacyMetadata;
 const content=await loadCmsPage();if(!content)notFound();
 return specialistPageMetadata(content.page,content.seoDefaults,siteUrl);
}

export default async function SpecialistsPage() {
  if(usesCmsSpecialists()){
    const content=await loadCmsPage();if(!content)notFound();
    return <CmsSpecialistPage page={content.page} profiles={content.profiles} origin={siteUrl}/>;
  }
  const visibleSpecialists = specialists.filter((specialist) => specialist.name !== "Kairav Engineer");

  return (
    <>
      {visibleSpecialists.filter((specialist) => specialist.name !== "Safari Crafters Field Team").map((specialist) => <JsonLd key={specialist.name} data={personSchema(specialist)} />)}
      <PageHero
        title="Named specialists, not anonymous enquiry desks."
        copy="Each journey is shaped by a person who understands the landscape, the season and the guest's reason for travelling."
        image={(specialists[1] || specialists[0]).image}
        meta="Specialists"
      />
      <section className="section surface-white">
        <div className="container specialist-list">
          {visibleSpecialists.map((specialist) => (
            <article key={specialist.name}>
              <div className="image-frame">
                <img src={specialist.image.src} alt={specialist.image.alt} loading="lazy" />
              </div>
              <div>
                <p className="eyebrow">{specialist.role}</p>
                <h2 className="h2">{specialist.name}</h2>
                <p className="intro">{specialist.expertise}</p>
                <p>{specialist.bio}</p>
                <EditorialFilm video={specialist.video} />
                {specialist.moment ? <blockquote>{specialist.moment}</blockquote> : null}
                {(() => {
                  const ledExpeditions = expeditions.filter((expedition) => expedition.mentor === specialist.name || expedition.guide === specialist.name);
                  const shapedJourneys = journeys.filter((journey) => journey.specialist === specialist.name);
                  if (!ledExpeditions.length && !shapedJourneys.length) return null;
                  return (
                    <div className="specialist-work">
                      <p className="eyebrow">Journeys shaped in the field</p>
                      {[...ledExpeditions.map((item) => ({ ...item, href: `/photo-expeditions/${item.slug}` })), ...shapedJourneys.map((item) => ({ ...item, href: `/journeys/${item.slug}` }))].slice(0, 4).map((item) => (
                        <Link key={item.href} href={item.href}>{item.title}</Link>
                      ))}
                    </div>
                  );
                })()}
                <Link className="button" href={`/plan?specialist=${encodeURIComponent(specialist.name.split(" ")[0])}`}>
                  Plan with {specialist.name.split(" ")[0]}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
