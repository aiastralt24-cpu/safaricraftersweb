import {z} from 'zod';
import capture from '../../docs/cms/concept-migration-inventory.json' with {type:'json'};
import {planConceptMigration} from './concept-migration.ts';
import {projectHomepageJourneyDraft} from './homepage-journeys.ts';
import {projectHomepageGuestDraft} from './homepage-guest-notes.ts';
import {photoExpeditionSchema} from './photo-expeditions.ts';
import {departureLabel} from '../departures.ts';
import type {HomepageJourneys} from './homepage-journeys.ts';
import type {HomepageGuestNotes} from './homepage-guest-notes.ts';
const uuid=z.string().uuid();
const envelope=z.object({websiteId:uuid,id:uuid,currentRevision:uuid,locale:z.literal('en'),type:z.enum(['journey','photoExpedition','testimonial']),path:z.string().nullable(),payload:z.unknown()}).strict();
type Finding={sourceKey:string;recordId:string;field:string;code:string;message:string};
/** Server-side review of site-scoped draft reads. Does not attest that supplied
 * envelopes came from the provider and cannot authorize application/publication.
 * Returns revision identities and field names, never private record contents. */
export function compareConceptMigrationRecords(currentHashes:unknown,mappings:unknown,websiteId:string,input:unknown){
 uuid.parse(websiteId);const plan=planConceptMigration(currentHashes,mappings);
 if(!plan.previewPayload)throw Error('Complete Concept source mappings before comparing records.');
 const records=z.array(envelope).max(1000).parse(input),byId=new Map(records.map(record=>[record.id,record]));
 if(byId.size!==records.length)throw Error('Duplicate record evidence.');
 if(records.some(record=>!plan.records.some(binding=>binding.proposedRecordId===record.id)))throw Error('Unexpected record evidence.');
 const findings:Finding[]=[],revisions:{recordId:string;revisionId:string}[]=[];
 const source=(label:string)=>capture.content.find(section=>section.navLabel===label)!;
 const data=(kind:string)=>plan.previewPayload!.composition.sections.find(section=>section.kind===kind)!.data;
 const journeys=data('homepageJourneys') as HomepageJourneys,guests=data('homepageGuestNotes') as HomepageGuestNotes;
 const media=(path:string|null)=>plan.media.find(item=>item.sourcePath===path)?.proposedAssetId;
 let journeyIndex=0,expeditionIndex=0,guestIndex=0;
 for(const binding of plan.records){
  const index=binding.type==='journey'?journeyIndex++:binding.type==='photoExpedition'?expeditionIndex++:guestIndex++;
  const recordId=binding.proposedRecordId!,record=byId.get(recordId);
  const fail=(field:string,code:string,message:string)=>findings.push({sourceKey:binding.sourceKey,recordId,field,code,message});
  const same=(field:string,actual:unknown,expected:unknown)=>{if(actual!==expected)fail(field,'source_mismatch','Mapped content differs from the captured Concept page. Review the source and proposed revision.');};
  if(!record){fail('record','missing_record','The mapped record could not be read.');continue;}
  if(record.websiteId!==websiteId||record.type!==binding.type||(binding.path!==null&&record.path!==binding.path)){fail('record','identity_mismatch','The mapped record belongs to a different website, content type or route.');continue;}
  revisions.push({recordId,revisionId:record.currentRevision});
  try{
   if(binding.type==='journey'){
    const card=projectHomepageJourneyDraft(record,journeys.items[index]),captured=source('Private journeys');
    same('title',card.title,captured.headings[index+1].lines.map(line=>line.runs.map(run=>run.text).join('')).join(' '));same('duration',card.duration,captured.paragraphs[2+index*2].text);same('region',card.region,captured.paragraphs[3+index*2].text);
    same('hero.assetId',card.image.assetId,media(captured.images[index].sourcePath));same('hero.alt',card.image.alt,captured.images[index].alt);
   }else if(binding.type==='testimonial'){
    const projected=projectHomepageGuestDraft(record,guests.items[index]),captured=capture.states.filter(state=>state.kind==='guest-note')[index].content;
    const author=captured.paragraphs[2].parts[0];if(!('text' in author))throw Error('Author markup requires review.');
    same('quote',projected.card.quote,captured.quotes[0]);same('trip',projected.card.trip,captured.figures[0]);same('guestType',projected.card.category,captured.paragraphs[1].text);same('displayName',projected.card.name,author.text);
    if(!projected.verified)fail('verified','guest_unverified','The selected guest note has not been verified.');
    if(projected.consent!=='granted')fail('consent.status','guest_consent_required','Current publication consent is required.');
   }else{
    const payload=photoExpeditionSchema.parse(record.payload),captured=source('Photography Tours'),parts=captured.migration.departures[index].metadata.split(' · ');
    same('path',record.path,`/photo-expeditions/${payload.slug}`);same('duration',payload.duration,parts[0]);
    same('image.assetId',payload.image?.assetId,media(captured.images[index].sourcePath));same('image.alt',payload.image?.alt,captured.images[index].alt);same('image.decorative',payload.image?.decorative,false);
    const next=[...payload.departures].filter(item=>item.date>=capture.capturedAt.slice(0,10)).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id))[0];
    same('departures.date',next?.date,captured.dates[index].dateTime);same('departures.label',next?departureLabel(next):null,captured.dates[index].text);
    if(payload.video)fail('video','film_review_required','The mapped expedition includes a film requiring a separate migration review.');
   }
  }catch{fail('payload','invalid_record','The mapped record cannot be safely projected. Repair its content before migration.');}
 }
 return {mode:'review-only' as const,readyToApply:false as const,captureDigest:plan.captureDigest,websiteId,sourceMatches:findings.length===0,revisions,findings,
  limitations:['Source matching compares Concept-visible content at capture time; it is not an audit of full record content.','Provider origin, current revision locks, media processing/rights, refreshed departures and full visual acceptance must be verified before application.']};
}
