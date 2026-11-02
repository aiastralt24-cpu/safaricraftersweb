import {z} from 'zod';
import {destinationSchema} from './destinations.ts';
const uuid=z.string().uuid();
const referenceSchema=z.object({recordId:uuid,type:z.enum(['journey','photoExpedition','destination']),title:z.string().trim().min(1).max(200),path:z.string(),locale:z.string(),publishedRevisionId:uuid}).strict();
export type PublishedDestinationReference=z.infer<typeof referenceSchema>;
const envelope=z.object({recordId:uuid,revisionId:uuid,type:z.literal('destination'),payload:destinationSchema}).strict();
/** Projection only: caller must obtain both inputs from publication-authorized readers.
 * This function cannot authorize a draft or verify current media rights. */
export function projectPublishedDestination(input:unknown,path:string,locale:string,references:unknown){
 const page=envelope.parse(input),resolved=z.array(referenceSchema).max(250).parse(references),d=page.payload;
 if(path!==`/destinations/${d.slug}`)throw Error('Destination route mismatch.');
 if(!d.country.trim()||!d.description.trim()||!d.intro.trim()||!d.bestMonths.trim()||!d.image||!d.heroImage||d.video)throw Error('Destination delivery is incomplete.');
 const used=new Set<string>();
 const routes={journey:'/journeys/',photoExpedition:'/photo-expeditions/',destination:'/destinations/'} as const;
 function card(recordId:string,type:PublishedDestinationReference['type']){
  const matches=resolved.filter(item=>item.recordId===recordId&&item.type===type);
  if(matches.length!==1)throw Error('Published destination reference unavailable.');
  const item=matches[0];
  if(item.locale!==locale||item.recordId===page.recordId||!item.path.startsWith(routes[type])||!/^\/[a-z0-9-]+\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.path))throw Error('Published destination reference mismatch.');
  used.add(`${type}:${recordId}`);return {title:item.title,path:item.path};
 }
 const journeys=d.journeys.map(item=>card(item.recordId,'journey'));
 const expeditions=d.expeditions.map(item=>card(item.recordId,'photoExpedition'));
 const pairings=d.pairings.map(item=>({...card(item.recordId,'destination'),title:item.title,reason:item.reason}));
 if(resolved.some(item=>!used.has(`${item.type}:${item.recordId}`)))throw Error('Unexpected published destination reference.');
 const {journeys:rawJourneys,expeditions:rawExpeditions,pairings:rawPairings,video,...content}=d;
 void rawJourneys;void rawExpeditions;void rawPairings;void video;
 return {recordId:page.recordId,revisionId:page.revisionId,content,journeys,expeditions,pairings};
}
export type PublishedDestination=ReturnType<typeof projectPublishedDestination>;
