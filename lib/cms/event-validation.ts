import {z} from 'zod';
import {eventSchema,eventPath,eventDraftFindings} from './events.ts';
import type {ContentFinding} from './content-validation.ts';
const uuid=z.string().uuid();
export const eventEvidenceSchema=z.object({websiteId:uuid,recordId:uuid,revisionId:uuid,references:z.array(z.object({type:z.enum(['page','project','journalArticle','destination','document']),recordId:uuid,available:z.boolean(),published:z.boolean(),locale:z.string().nullable()}).strict()).max(150),media:z.array(z.object({assetId:z.string(),available:z.boolean()}).strict()).max(233),links:z.array(z.object({href:z.string(),available:z.boolean()}).strict()).max(10000)}).strict();
type Input={site:string;record:string;revision:string;type:string;path:string|null;locale?:string;payload:unknown};
export function validateEventContent(input:Input,evidence:unknown){
 const findings:ContentFinding[]=[],error=(field:string,code:string,message:string)=>findings.push({field,code,message,severity:'error'});
 const parsed=eventSchema.safeParse(input.payload),checked=eventEvidenceSchema.safeParse(evidence);
 if(!parsed.success)for(const issue of parsed.error.issues)error(issue.path.join('.'),'event_field',issue.message);
 if(input.type!=='event')error('type','event_identity','Event checks require a event record.');
 if(input.locale!=='en')error('locale','event_locale_not_ready','Event delivery for this language is not connected yet.');
 if(!checked.success||checked.data.websiteId!==input.site||checked.data.recordId!==input.record||checked.data.revisionId!==input.revision)error('evidence','event_evidence_missing','Current server evidence for this saved revision is unavailable.');
 if(parsed.success){const v=parsed.data;
  if(input.path!==eventPath(v.slug))error('slug','event_identity','The saved URL must match the event slug.');
  findings.push(...eventDraftFindings(v));
  if(checked.success&&checked.data.websiteId===input.site&&checked.data.recordId===input.record&&checked.data.revisionId===input.revision){const e=checked.data;
   const expectedMedia=[...new Set([v.image,v.heroImage,...v.gallery,v.seo.socialImage,...v.body.flatMap(b=>b.kind==='image'?[b.image]:[])].filter(Boolean).map(i=>i!.assetId))];
   if(e.media.length!==expectedMedia.length||e.media.some(m=>!expectedMedia.includes(m.assetId)))error('media','event_evidence_mismatch','Image evidence does not match this draft.');
   for(const asset of expectedMedia){const rows=e.media.filter(m=>m.assetId===asset);if(rows.length!==1||!rows[0].available)error('media','event_image_unavailable','A selected image needs verified processing and current approved rights.');}
   const refs=([['pages','page'],['projects','project'],['articles','journalArticle'],['destinations','destination'],['documents','document']] as const).flatMap(([key,type])=>v.relationships[key].map(r=>({...r,type,key})));
   if(e.references.length!==refs.length||e.references.some(r=>!refs.some(x=>x.type===r.type&&x.recordId===r.recordId)))error('relationships','event_evidence_mismatch','Related-record evidence does not match this draft.');
   for(const ref of refs){const rows=e.references.filter(r=>r.type===ref.type&&r.recordId===ref.recordId);if(rows.length!==1||!rows[0].available||!rows[0].published||rows[0].locale!==input.locale||ref.recordId===input.record)error(`relationships.${ref.key}`,'event_reference_unavailable','Choose a published related record in this website and language.');}
   const hrefs=new Set<string>();const walk=(value:unknown)=>{if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')for(const [key,child]of Object.entries(value)){if(key==='href'&&typeof child==='string'&&(child.startsWith('/')||child.startsWith('#')))hrefs.add(child);else walk(child);}};walk([v.body,v.registration]);
   if(e.links.length!==hrefs.size||e.links.some(l=>!hrefs.has(l.href)))error('links','event_evidence_mismatch','Internal-link evidence does not match this draft.');
   for(const href of hrefs){const rows=e.links.filter(l=>l.href===href);if(rows.length!==1||!rows[0].available)error('links','event_link_unavailable','An internal link does not resolve to an available page. Fragment links need a supported anchor before publication.');}
  }
 }
 return {validatorVersion:'event-1',contentChecksPass:!findings.some(f=>f.severity==='error'),findings};
}
