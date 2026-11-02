import {cache} from 'react';
import {notFound} from 'next/navigation';
import {CmsExpeditionPage} from '@/components/CmsExpeditionPage';
import {loadExpeditionRoute} from '@/lib/cms/expedition-page-runtime';
import {usesCmsExpedition} from '@/lib/cms/expedition-route';
import {expeditionPageMetadata} from '@/lib/cms/expedition-page';
import { Metadata } from "next";
import { PhotoExpeditionFilm } from "@/components/PhotoExpeditionFilm";
import { JsonLd } from "@/components/JsonLd";
import { expeditions } from "@/lib/data";
import { breadcrumbSchema } from "@/lib/structured-data";
import "../journeys/journeys-atlas.css";
import "./photo-expeditions-atlas.css";

const legacyMetadata: Metadata = {
  title: "Photography Tours",
  description: "Photography-led tiger, big cat, birding, wetland and mentorship safaris."
};

const loadCmsPage=cache(()=>loadExpeditionRoute());
export async function generateMetadata():Promise<Metadata>{
  if(!usesCmsExpedition())return legacyMetadata;
  const content=await loadCmsPage();if(!content)notFound();
  return expeditionPageMetadata(content.page,content.seoDefaults,process.env.CMS_PUBLIC_SITE_ORIGIN||'https://safaricrafters.com');
}

export default async function PhotoExpeditionsPage() {
  if(usesCmsExpedition()){
    const content=await loadCmsPage();if(!content)notFound();
    return <CmsExpeditionPage page={content.page} expeditions={content.expeditions} today={content.today}/>;
  }
  return <>
    <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Photography Tours", path: "/photo-expeditions" }])} />
    <PhotoExpeditionFilm expeditions={expeditions} />
  </>;
}

// Time-based departure filtering must not be frozen at build time.
export const dynamic = "force-dynamic";
