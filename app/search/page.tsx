import {loadProductDiscovery,productSearchItems} from '@/lib/cms/product-discovery';
import {loadProductCategoryDiscovery,productCategorySearchItems} from '@/lib/cms/product-category-discovery';
import {loadPartnerDiscovery,partnerSearchItems} from '@/lib/cms/partner-discovery';
import {loadCertificationDiscovery,certificationSearchItems} from '@/lib/cms/certification-discovery';
import {loadCareerDiscovery,careerSearchItems} from '@/lib/cms/career-discovery';
import {loadLocationDiscovery,locationSearchItems} from '@/lib/cms/location-discovery';
import {loadApplicationDiscovery,applicationSearchItems} from '@/lib/cms/application-discovery';
import {loadEventDiscovery,eventSearchItems} from '@/lib/cms/event-discovery';
import {loadLeadershipDiscovery,leadershipSearchItems} from '@/lib/cms/leadership-discovery';
import {loadNewsDiscovery,newsSearchItems} from '@/lib/cms/news-discovery';
import {loadProjectDiscovery,projectSearchItems} from '@/lib/cms/project-discovery';
import {readSeoDefaults} from '@/lib/cms/seo-settings';
import {loadCustomPageDiscovery,customPageSearchItems} from '@/lib/cms/custom-page-discovery';
import {notFound} from 'next/navigation';
import {readSearchSettings} from '@/lib/cms/search-settings';
import {searchCategories} from '@/lib/cms/search-policy';
import {usesCmsJournal} from '@/lib/cms/journal-route';
import {readPublishedJournalList,journalListReader,journalSearchItems} from '@/lib/cms/published-journal-list';
import {destinationDiscoveryItems,destinationSearchItems} from '@/lib/cms/destination-discovery';
import {destinationListReader} from '@/lib/cms/published-destination-list';
import {reservedDestinationSlugs} from '@/lib/cms/destination-reserved-routes';
import {publishedJourneySearchItems} from '@/lib/cms/journey-search';
import {journeyListReader,readPublishedJourneyList} from '@/lib/cms/published-journey-list';
import { Metadata } from "next";
import { destinations, expeditions, journal, journeys } from "@/lib/data";
import { SearchIndex, type SearchItem } from "./SearchIndex";
import "./search.css";

export const dynamic='force-dynamic';
export const metadata: Metadata = {
  title: "Search",
  description: "Search Safari Crafters journeys, destinations, photography tours and journal stories.",
  alternates: { canonical: "/search" }
};

export default async function SearchPage() {
  const settings=await readSearchSettings();
  if(settings&&!settings.enabled)notFound();
  const allowed=settings?searchCategories(settings):undefined;
  const includes=(type:SearchItem['type'])=>!allowed||allowed.includes(type);
  const destinationItems=includes('Destination')?await destinationDiscoveryItems(
    destinations.map(item=>({slug:item.slug,title:item.title,path:`/destinations/${item.slug}`,country:item.country,modifiedAt:item.seo?.reviewedAt||'2026-07-01T00:00:00.000Z',indexing:'inherit' as const,sitemap:'inherit' as const})),
    reservedDestinationSlugs,process.env.CMS_DESTINATION_RENDERING_ENABLED==='true',after=>destinationListReader()(after)):[];
  const journeyItems=!includes('Journey')?[]:process.env.CMS_JOURNEY_RENDERING_ENABLED==='true'
    ?publishedJourneySearchItems(await readPublishedJourneyList(journeyListReader()))
    :journeys.map(item=>({title:item.title,href:`/journeys/${item.slug}`,type:'Journey' as const,detail:item.region}));
  const journalItems=!includes('Journal')?[]:usesCmsJournal()?journalSearchItems(await readPublishedJournalList(journalListReader())):journal.map(item=>({title:item.title,href:`/journal/${item.slug}`,type:'Journal' as const,detail:item.category}));
  const events=includes('Event')?await loadEventDiscovery():null;
  const products=includes('Product')?await loadProductDiscovery():null;
  const productItems=products?productSearchItems(products,await readSeoDefaults()):[];
  const productCategories=includes('Product category')?await loadProductCategoryDiscovery():null;
  const productCategoryItems=productCategories?productCategorySearchItems(productCategories,await readSeoDefaults()):[];
  const partners=includes('Partner')?await loadPartnerDiscovery():null;
  const partnerItems=partners?partnerSearchItems(partners,await readSeoDefaults()):[];
  const certifications=includes('Certification')?await loadCertificationDiscovery():null;
  const certificationItems=certifications?certificationSearchItems(certifications,await readSeoDefaults()):[];
  const careers=includes('Career')?await loadCareerDiscovery():null;
  const careerItems=careers?careerSearchItems(careers,await readSeoDefaults()):[];
  const locations=includes('Location')?await loadLocationDiscovery():null;
  const locationItems=locations?locationSearchItems(locations,await readSeoDefaults()):[];
  const applications=includes('Application')?await loadApplicationDiscovery():null;
  const applicationItems=applications?applicationSearchItems(applications,await readSeoDefaults()):[];
  const leadership=includes('Leadership')?await loadLeadershipDiscovery():null;
  const eventItems=events?eventSearchItems(events,await readSeoDefaults()):[];
  const leadershipItems=leadership?leadershipSearchItems(leadership,await readSeoDefaults()):[];
  const news=includes('News')?await loadNewsDiscovery():null;
  const newsItems=news?newsSearchItems(news,await readSeoDefaults()):[];
  const projects=includes('Project')?await loadProjectDiscovery():null;
  const projectItems=projects?projectSearchItems(projects,await readSeoDefaults()):[];
  const customPages=includes('Page')?await loadCustomPageDiscovery():null;
  const items: SearchItem[] = [
    ...(customPages?customPageSearchItems(customPages.items,customPages.seoDefaults,'https://safaricrafters.com'):[]),
    ...journeyItems,
    ...destinationSearchItems(destinationItems),
    ...(includes('Photography Tours')?expeditions:[]).map((item) => ({ title: item.title, href: `/photo-expeditions/${item.slug}`, type: "Photography Tours" as const, detail: item.category })),
    ...projectItems,
    ...newsItems,
    ...eventItems,
    ...applicationItems,
    ...locationItems,
    ...careerItems,
    ...partnerItems,
    ...productCategoryItems,
    ...productItems,
    ...certificationItems,
    ...leadershipItems,
    ...journalItems
  ];

  return (
    <section className="search-page">
      <header className="container search-heading">
        <p className="eyebrow">Search</p>
        <h1>Find a place, journey or field story.</h1>
        <p>Search the Safari Crafters collection, or browse it by the kind of experience you are considering.</p>
      </header>
      <div className="container">
        <SearchIndex items={items} settings={settings} />
      </div>
    </section>
  );
}
