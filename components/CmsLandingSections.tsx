'use client';
import {CmsDocumentDownloads} from './CmsDocumentDownloads';
import type {resolveHomepageDependencies} from '../lib/cms/homepage-dependencies';
import type {SectionImage} from '../lib/cms/composition';
import {publishedMediaUrl} from '../lib/cms/published-journey';
import {CmsHomepageHero} from './CmsHomepageHero';
import {CmsPublishedHomepageStory} from './CmsPublishedHomepageStory';
import {CmsHomepageJourneyTypes} from './CmsHomepageJourneyTypes';
import {CmsHomepageJourneys} from './CmsHomepageJourneys';
import {CmsHomepageDepartureRows} from './CmsHomepageDepartures';
import {CmsHomepageCorporate} from './CmsHomepageCorporate';
import {CmsHomepageAviation} from './CmsHomepageAviation';
import {CmsHomepagePartners} from './CmsHomepagePartners';
import {CmsHomepageGuestNotes} from './CmsHomepageGuestNotes';
import {CmsHomepageConcierge} from './CmsHomepageConcierge';
import './CmsHomepage.css';
type ResolvedHomepage=Awaited<ReturnType<typeof resolveHomepageDependencies>>;
type LandingContent=Pick<ResolvedHomepage,'journeys'|'departures'|'guests'>&{page:Pick<ResolvedHomepage['page'],'sections'>};
function required<T extends {sectionId:string}>(items:T[],id:string):T{const matches=items.filter(item=>item.sectionId===id);if(matches.length!==1)throw Error('Landing page dependency section is missing or duplicated.');return matches[0];}
const picture=(image:Pick<SectionImage,'assetId'|'alt'>&Partial<SectionImage>)=><img src={publishedMediaUrl(image.assetId)} alt={image.decorative?'':image.alt} loading='lazy'/>;
/** Render only already-resolved public sections; header and page identity belong to the caller. */
export function CmsLandingSections({content}:{content:LandingContent}){
 return <>{content.page.sections.map(section=>{
  const controls=section.controls,H=controls.headingLevel;
  if(section.kind==='homepageHero')return <CmsHomepageHero key={section.id} section={section}/>;
  if(section.kind==='homepageStory')return <CmsPublishedHomepageStory key={section.id} section={section}/>;
  let body;
  switch(section.kind){
   case 'downloads':body=<CmsDocumentDownloads data={section.data} headingLevel={H}/>;break;
   case 'homepageJourneyTypes':body=<CmsHomepageJourneyTypes value={section.data} headingLevel={H} renderImage={picture}/>;break;
   case 'homepageJourneys':body=<CmsHomepageJourneys value={section.data} cards={required(content.journeys,section.id).cards} headingLevel={H} renderImage={picture}/>;break;
   case 'homepageDepartures':body=<CmsHomepageDepartureRows value={section.data} rows={required(content.departures,section.id).items} headingLevel={H}/>;break;
   case 'homepageCorporate':body=<CmsHomepageCorporate value={section.data} headingLevel={H} renderImage={picture}/>;break;
   case 'homepageAviation':body=<CmsHomepageAviation value={section.data} headingLevel={H} renderImage={picture}/>;break;
   case 'homepagePartners':body=<CmsHomepagePartners value={section.data} headingLevel={H} renderImage={picture}/>;break;
   case 'homepageGuestNotes':body=<CmsHomepageGuestNotes value={section.data} cards={required(content.guests,section.id).cards} headingLevel={H} renderImage={picture}/>;break;
   case 'homepageConcierge':body=<CmsHomepageConcierge value={section.data} headingLevel={H}/>;break;
  }
  return <section key={section.id} id={controls.anchor} data-cms-section={section.kind} data-cms-motion={controls.animation} data-nav-label={controls.label} className={`cms-homepage-section background-${controls.background} spacing-${controls.spacing} align-${controls.textAlign} media-${controls.mediaAlign} mobile-${controls.mobileOrder}`}><div className={`cms-homepage-width width-${controls.width}`}>{body}</div></section>;
 })}</>;
}
