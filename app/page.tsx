import {cache} from 'react';
import {CmsHomepage} from '@/components/CmsHomepage';
import {readPublishedHomepage} from '@/lib/cms/published-homepage';
import {homepageMetadata} from '@/lib/cms/homepage-projection';
import { homepage } from "@/lib/data";
import type { Metadata } from "next";
import { ConceptExperience } from "./concept/ConceptExperience";
import "./concept/concept.css";
import "./concept/concept-harmony.css";

const loadHomepage=cache(()=>readPublishedHomepage());
export default async function HomePage() {
  const published=await loadHomepage();
  return published?<CmsHomepage content={published.content} header={published.header}/>:<ConceptExperience />;
}
export async function generateMetadata():Promise<Metadata>{
  const published=await loadHomepage();
  return published?homepageMetadata(published.content.page,published.seoDefaults):legacyMetadata;
}

export const dynamic = "force-dynamic";

const legacyMetadata: Metadata = homepage ? {
  title: homepage.seo?.title || homepage.title,
  description: homepage.seo?.description || homepage.copy,
  alternates: {canonical: "/"},
  openGraph: {title: homepage.seo?.title || homepage.title, description: homepage.seo?.description || homepage.copy,
    images: (homepage.seo?.socialImage || homepage.heroMedia?.posterImage) ? [{url: (homepage.seo?.socialImage || homepage.heroMedia?.posterImage)!.src, alt: (homepage.seo?.socialImage || homepage.heroMedia?.posterImage)!.alt}] : undefined}
} : {};
