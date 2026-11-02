import {z} from 'zod';
import type {HomepagePublicSection} from './homepage-projection.ts';
import {resolveHomepageJourneys} from './homepage-journeys.ts';
import {resolvePublicHomepageGuest} from './homepage-guest-notes.ts';
import {projectHomepageDepartures} from './homepage-departures.ts';
export type LandingPublishedReaders={
 journeys(site:string,locale:string):Promise<unknown>;
 expeditions(site:string,locale:string):Promise<unknown>;
 guest(site:string,id:string,locale:string):Promise<unknown>;
};
/** Internal resolver: callers must first project and validate their page envelope.
 * Trusted server readers must return published records only. Site envelopes are
 * checked here; no draft reader, bundled fallback or partial success is accepted. */
export async function resolveLandingDependencies<T extends {sections:HomepagePublicSection[]}>(page:T,site:string,context:{locale:string;now:Date},read:LandingPublishedReaders){
 z.string().uuid().parse(site);if(context.locale!=='en'||!Number.isFinite(context.now.getTime()))throw Error('Landing page context is unsupported.');
 const list=z.object({site:z.literal(site),items:z.array(z.unknown()).max(10000)}).strict();
 const journeySections=page.sections.filter(section=>section.kind==='homepageJourneys'),departureSections=page.sections.filter(section=>section.kind==='homepageDepartures'),guestSections=page.sections.filter(section=>section.kind==='homepageGuestNotes');
 const results=await Promise.allSettled([
  journeySections.length?read.journeys(site,context.locale).then(value=>list.parse(value).items):Promise.resolve([]),
  departureSections.length?read.expeditions(site,context.locale).then(value=>list.parse(value).items):Promise.resolve([]),
 ]);
 const catalogues=results.map(result=>{if(result.status==='rejected')throw result.reason;return result.value;});
 const journeys=journeySections.map(section=>({sectionId:section.id,cards:resolveHomepageJourneys(section.data,catalogues[0])}));
 for(const row of catalogues[1])z.object({websiteId:z.literal(site)}).passthrough().parse(row);
 const departures=departureSections.map(section=>({sectionId:section.id,items:projectHomepageDepartures(section.data,catalogues[1],context.now.toISOString().slice(0,10))}));
 if(departures.some(section=>section.items.some(item=>item.card.websiteId!==site)))throw Error('Expedition website identity mismatch.');
 const ids=[...new Set(guestSections.flatMap(section=>section.data.items.map(item=>item.recordId)))],records=new Map<string,unknown>();
 for(let index=0;index<ids.length;index+=4){
  const batch=ids.slice(index,index+4),responses=await Promise.allSettled(batch.map(id=>read.guest(site,id,context.locale)));
  for(let offset=0;offset<responses.length;offset++){
   const response=responses[offset];if(response.status==='rejected')throw response.reason;
   const value=z.object({site:z.literal(site),record:z.unknown()}).strict().parse(response.value);records.set(batch[offset],value.record);
  }
 }
 const guests=guestSections.map(section=>({sectionId:section.id,cards:section.data.items.map(selection=>resolvePublicHomepageGuest(records.get(selection.recordId),selection))}));
 return {page,journeys,departures,guests};
}
