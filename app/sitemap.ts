import {loadProductDiscovery,productSitemapItems} from '@/lib/cms/product-discovery';
import {loadProductCategoryDiscovery,productCategorySitemapItems} from '@/lib/cms/product-category-discovery';
import {loadPartnerDiscovery,partnerSitemapItems} from '@/lib/cms/partner-discovery';
import {loadCertificationDiscovery,certificationSitemapItems} from '@/lib/cms/certification-discovery';
import {loadCareerDiscovery,careerSitemapItems} from '@/lib/cms/career-discovery';
import {loadLocationDiscovery,locationSitemapItems} from '@/lib/cms/location-discovery';
import {loadApplicationDiscovery,applicationSitemapItems} from '@/lib/cms/application-discovery';
import {loadEventDiscovery,eventSitemapItems} from '@/lib/cms/event-discovery';
import {loadLeadershipDiscovery,leadershipSitemapItems} from '@/lib/cms/leadership-discovery';
import {loadNewsDiscovery,newsSitemapItems} from '@/lib/cms/news-discovery';
import {loadProjectDiscovery,projectSitemapItems} from '@/lib/cms/project-discovery';
import {readPublishedTanzania,usesCmsTanzania} from '@/lib/cms/published-tanzania';
import {tanzaniaSitemapItems} from '@/lib/cms/tanzania-sitemap';
import {readPublishedKenya,usesCmsKenya} from '@/lib/cms/published-kenya';
import {loadLocalizedPageDiscovery,localizedPageSitemapItems} from '@/lib/cms/localized-page-discovery';
import {kenyaSitemapItems} from '@/lib/cms/kenya-sitemap';
import {readPublishedMice,usesCmsMice} from '@/lib/cms/published-mice';
import {miceSitemapItems} from '@/lib/cms/mice-sitemap';
import {readPublishedAviation,usesCmsAviation} from '@/lib/cms/published-aviation';
import {aviationSitemapItems} from '@/lib/cms/aviation-sitemap';
import {readPublishedGuided,usesCmsGuided} from '@/lib/cms/published-guided';
import {guidedSitemapItems} from '@/lib/cms/guided-sitemap';
import {readPublishedConcept,usesCmsConcept} from '@/lib/cms/published-concept';
import {conceptSitemapItems} from '@/lib/cms/concept-sitemap';
import {loadContactRoute,usesCmsContact} from '@/lib/cms/contact-page-runtime';
import {contactSitemapItems} from '@/lib/cms/contact-sitemap';
import {loadConservationRoute,usesCmsConservation} from '@/lib/cms/conservation-page-runtime';
import {conservationSitemapItems} from '@/lib/cms/conservation-sitemap';
import {loadCustomPageDiscovery,customPageSitemapItems} from '@/lib/cms/custom-page-discovery';
import {loadAboutRoute,usesCmsAbout} from '@/lib/cms/about-page-runtime';
import {aboutSitemapItems} from '@/lib/cms/about-sitemap';
import {legalPaths} from '@/lib/cms/legal-page';
import {loadLegalRoute,usesCmsLegalPages} from '@/lib/cms/legal-page-runtime';
import {legalSitemapItems} from '@/lib/cms/legal-sitemap';
import {usesCmsExpedition} from '@/lib/cms/expedition-route';
import {readPublishedExpeditionDirectory,expeditionDirectoryReader} from '@/lib/cms/public-expedition-directory';
import {expeditionSitemapItems,expeditionAtlasSitemapItems} from '@/lib/cms/expedition-sitemap';
import {loadExpeditionRoute} from '@/lib/cms/expedition-page-runtime';
import {readSeoDefaults} from '@/lib/cms/seo-settings';
import {loadSpecialistRoute,usesCmsSpecialists} from '@/lib/cms/specialist-page-runtime';
import {specialistSitemapItems} from '@/lib/cms/specialist-sitemap';
import {usesCmsJournal} from '@/lib/cms/journal-route';
import {readPublishedJournalList,journalListReader,journalSitemapItems} from '@/lib/cms/published-journal-list';
import {destinationDiscoveryItems,destinationSitemapItems} from '@/lib/cms/destination-discovery';
import {destinationListReader} from '@/lib/cms/published-destination-list';
import {reservedDestinationSlugs} from '@/lib/cms/destination-reserved-routes';
import {journeyListReader,readPublishedJourneyList} from '@/lib/cms/published-journey-list';
import type { MetadataRoute } from "next";
import { destinations, expeditions, journal, journeys } from "@/lib/data";
import { storeCategories } from "@/lib/store";

export const dynamic='force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const seoDefaults=await readSeoDefaults();
  const base = "https://safaricrafters.com";
  const localizedRoutes=localizedPageSitemapItems(await loadLocalizedPageDiscovery(),process.env.CMS_PUBLIC_SITE_ORIGIN??base);
  if(seoDefaults?.indexing==='noindex')return localizedRoutes;
  const contentReviewed = new Date("2026-07-01T00:00:00.000Z");
  const staticRoutes = [
    "",
    "/journeys",
    ...(!usesCmsMice()?["/mice"]:[]),
    "/destinations",
    ...(!usesCmsExpedition()?["/photo-expeditions"]:[]),
    "/journal",
    "/reviews",
    "/store",
    ...(!usesCmsConcept()?["/concept"]:[]),
    ...(!usesCmsConservation()?["/conservation-commitment"]:[]),
    ...(!usesCmsAviation()?["/private-aviation"]:[]),
    ...(!usesCmsGuided()?["/guided-bespoke-safaris"]:[]),
    "/search",
    ...(!usesCmsAbout()?["/about"]:[]),
    ...(!usesCmsSpecialists()?["/specialists"]:[]),
    ...(!usesCmsContact()?["/contact"]:[]),
    "/plan",
    ...(!usesCmsLegalPages()?legalPaths:[])
  ];
  const storeRoutes = storeCategories.flatMap((category) => [
    `/store/${category.slug}`,
    ...category.products.map((product) => `/store/${category.slug}/${product.slug}`)
  ]);

  const destinationItems=await destinationDiscoveryItems(
    destinations.map(item=>({slug:item.slug,title:item.title,path:`/destinations/${item.slug}`,country:item.country,modifiedAt:item.seo?.reviewedAt||'2026-07-01T00:00:00.000Z',indexing:'inherit' as const,sitemap:'inherit' as const})),
    reservedDestinationSlugs,process.env.CMS_DESTINATION_RENDERING_ENABLED==='true',after=>destinationListReader()(after));
  const journeyRoutes=process.env.CMS_JOURNEY_RENDERING_ENABLED==='true'
    ?(await readPublishedJourneyList(journeyListReader())).map(item=>({url:`${base}${item.path}`,lastModified:new Date(item.modifiedAt)}))
    :journeys.map(item=>({url:`${base}/journeys/${item.slug}`,lastModified:new Date(item.seo?.reviewedAt||contentReviewed)}));
  const journalRoutes=usesCmsJournal()?journalSitemapItems(await readPublishedJournalList(journalListReader()),base):journal.map(item=>({url:`${base}/journal/${item.slug}`,lastModified:new Date(item.date)}));
  const expeditionRoutes=usesCmsExpedition()
    ?expeditionSitemapItems(await readPublishedExpeditionDirectory(process.env.CMS_WEBSITE_ID!,expeditionDirectoryReader()),process.env.CMS_PUBLIC_SITE_ORIGIN??base,seoDefaults)
    :expeditions.map(item=>({url:`${base}/photo-expeditions/${item.slug}`,lastModified:contentReviewed}));
  const specialistRoutes=usesCmsSpecialists()?specialistSitemapItems(await loadSpecialistRoute(),base):[];
  const expeditionAtlasRoutes=usesCmsExpedition()?expeditionAtlasSitemapItems(await loadExpeditionRoute(),process.env.CMS_PUBLIC_SITE_ORIGIN??base):[];
  const tanzaniaRoutes=usesCmsTanzania()?tanzaniaSitemapItems(await readPublishedTanzania(),base):[];
  const kenyaRoutes=usesCmsKenya()?kenyaSitemapItems(await readPublishedKenya(),base):[];
  const miceRoutes=usesCmsMice()?miceSitemapItems(await readPublishedMice(),base):[];
  const aviationRoutes=usesCmsAviation()?aviationSitemapItems(await readPublishedAviation(),base):[];
  const guidedRoutes=usesCmsGuided()?guidedSitemapItems(await readPublishedGuided(),base):[];
  const conceptRoutes=usesCmsConcept()?conceptSitemapItems(await readPublishedConcept(),base):[];
  const contactRoutes=usesCmsContact()?contactSitemapItems(await loadContactRoute(),base):[];
  const conservationRoutes=usesCmsConservation()?conservationSitemapItems(await loadConservationRoute(),base):[];
  const aboutRoutes=usesCmsAbout()?aboutSitemapItems(await loadAboutRoute(),base):[];
  const legalRoutes=usesCmsLegalPages()?legalSitemapItems(await Promise.all(legalPaths.map(path=>loadLegalRoute(path))),base):[];
  const events=await loadEventDiscovery();
  const products=await loadProductDiscovery();
  const productCategories=await loadProductCategoryDiscovery();
  const partners=await loadPartnerDiscovery();
  const certifications=await loadCertificationDiscovery();
  const careers=await loadCareerDiscovery();
  const locations=await loadLocationDiscovery();
  const applications=await loadApplicationDiscovery();
  const leadership=await loadLeadershipDiscovery();
  const news=await loadNewsDiscovery();
  const projects=await loadProjectDiscovery();
  const customPages=await loadCustomPageDiscovery();
  return [
    ...localizedRoutes,
    ...(news?newsSitemapItems(news,seoDefaults,base):[]),
    ...(events?eventSitemapItems(events,seoDefaults,base):[]),
    ...(applications?applicationSitemapItems(applications,seoDefaults,base):[]),
    ...(careers?careerSitemapItems(careers,seoDefaults,base):[]),
    ...(products?productSitemapItems(products,seoDefaults,base):[]),
    ...(productCategories?productCategorySitemapItems(productCategories,seoDefaults,base):[]),
    ...(partners?partnerSitemapItems(partners,seoDefaults,base):[]),
    ...(certifications?certificationSitemapItems(certifications,seoDefaults,base):[]),
    ...(locations?locationSitemapItems(locations,seoDefaults,base):[]),
    ...(leadership?leadershipSitemapItems(leadership,seoDefaults,base):[]),
    ...(projects?projectSitemapItems(projects,seoDefaults,base):[]),
    ...(customPages?customPageSitemapItems(customPages.items,customPages.seoDefaults,base):[]),
    ...[...staticRoutes, ...storeRoutes].map((route) => ({ url: `${base}${route}`, lastModified: contentReviewed })),
    ...journeyRoutes,
    ...specialistRoutes,
    ...legalRoutes,
    ...aboutRoutes,
    ...conservationRoutes,
    ...contactRoutes,
    ...conceptRoutes,
    ...guidedRoutes,
    ...aviationRoutes,
    ...miceRoutes,
    ...kenyaRoutes,
    ...tanzaniaRoutes,
    ...destinationSitemapItems(destinationItems.filter(item=>(!usesCmsKenya()||item.path!=='/destinations/kenya')&&(!usesCmsTanzania()||item.path!=='/destinations/tanzania')),base),
    ...expeditionRoutes,
    ...expeditionAtlasRoutes,
    ...journalRoutes
  ];
}
