import {z} from 'zod';
import {sectionDataSchemas} from './composition.ts';
import {publishedJourneySummarySchema} from './published-journey-list.ts';
export type HomepageJourneys=z.infer<typeof sectionDataSchemas.homepageJourneys>;
/** Resolve only the caller's published catalogue, never bundled or draft data.
 * Missing selections fail as a whole rather than silently dropping a card. */
export function resolveHomepageJourneys(value:unknown,catalogue:unknown){
 const section=sectionDataSchemas.homepageJourneys.parse(value);
 const rows=z.array(publishedJourneySummarySchema).max(10000).parse(catalogue);
 const byId=new Map(rows.map(row=>[row.recordId,row]));
 if(byId.size!==rows.length)throw Error('Duplicate published journey identity.');
 return section.items.map(item=>{
  const row=byId.get(item.recordId);
  if(!row?.hero)throw Error('A selected published journey or its hero image is unavailable.');
  return {recordId:row.recordId,revisionId:row.revisionId,path:row.path,title:row.title,region:row.region,duration:row.duration,image:row.hero,kicker:item.kicker};
 });
}
export type HomepageJourneyCard=ReturnType<typeof resolveHomepageJourneys>[number];
const draft=z.object({id:z.string().uuid(),currentRevision:z.string().uuid(),type:z.literal('journey'),path:z.string(),payload:z.object({slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),title:z.string().min(1).max(200),duration:z.string().min(1).max(50000),region:z.string().min(1).max(50000),media:z.array(z.object({role:z.string(),assetId:z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/),alt:z.string().min(1).max(50000)}).passthrough())}).passthrough()}).passthrough();
/** Authenticated editor preview only; never use this for public delivery. */
export function projectHomepageJourneyDraft(value:unknown,selection:HomepageJourneys['items'][number]):HomepageJourneyCard{
 const record=draft.parse(value),hero=record.payload.media.filter(image=>image.role==='hero');
 if(record.id!==selection.recordId||record.path!==`/journeys/${record.payload.slug}`||hero.length!==1)throw Error('Selected journey draft is unavailable or incomplete.');
 return {recordId:record.id,revisionId:record.currentRevision,path:record.path,title:record.payload.title,region:record.payload.region,duration:record.payload.duration,image:{assetId:hero[0].assetId,alt:hero[0].alt},kicker:selection.kicker};
}
/** Selection order changes must not move editorial labels onto other records. */
export function retainJourneyKickers(previous:HomepageJourneys['items'],selected:{recordId:string}[]){
 return selected.map(item=>({recordId:item.recordId,kicker:previous.find(old=>old.recordId===item.recordId)?.kicker??'Featured journey'}));
}
