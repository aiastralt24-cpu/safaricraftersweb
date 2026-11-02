import {z} from 'zod';
import {projectSchema,projectPath} from './projects.ts';
import {pageSeoFindings} from './page-seo.ts';
import type {ContentFinding} from './content-validation.ts';
const uuid=z.string().uuid();
export const projectEvidenceSchema=z.object({websiteId:uuid,recordId:uuid,revisionId:uuid,claims:z.array(z.object({claimId:uuid,approved:z.boolean()}).strict()).max(30),references:z.array(z.object({type:z.enum(['project','product','destination','document']),recordId:uuid,available:z.boolean(),published:z.boolean(),locale:z.string().nullable()}).strict()).max(120),media:z.array(z.object({assetId:z.string(),available:z.boolean()}).strict()).max(32),links:z.array(z.object({href:z.string(),available:z.boolean()}).strict()).max(10000)}).strict();
type Input={site:string;record:string;revision:string;type:string;path:string|null;locale?:string;payload:unknown};
export function validateProjectContent(input:Input,evidence:unknown){
 const findings:ContentFinding[]=[],error=(field:string,code:string,message:string)=>findings.push({field,code,message,severity:'error'});
 const parsed=projectSchema.safeParse(input.payload),checked=projectEvidenceSchema.safeParse(evidence);
 if(!parsed.success)for(const issue of parsed.error.issues)error(issue.path.join('.'),'project_field',issue.message);
 if(input.type!=='project')error('type','project_identity','Project checks require a project record.');
 if(input.locale!=='en')error('locale','project_locale_not_ready','Project delivery for this language is not connected yet.');
 if(!checked.success||checked.data.websiteId!==input.site||checked.data.recordId!==input.record||checked.data.revisionId!==input.revision)error('evidence','project_evidence_missing','Current server evidence for this saved revision is unavailable.');
 if(parsed.success){const v=parsed.data;
  if(input.path!==projectPath(v.slug))error('slug','project_identity','The saved URL must match the project slug.');
  if(!v.summary.trim())error('summary','project_summary_required','Add a project summary.');
  if(![...v.body,...v.challenge,...v.approach,...v.outcomes].some(b=>b.kind==='paragraph'||b.kind==='quote'?Boolean(b.text.trim()):b.kind==='list'?b.items.some(i=>Boolean(i.trim())):b.kind==='table'?b.rows.some(row=>row.some(cell=>Boolean(cell.trim()))):false))error('body','project_content_required','Add substantive overview, challenge, approach or outcome content.');
  if(!v.image)error('image','project_image_required','Choose a listing image.');
  if(v.relationships.products.length)error('relationships.products','project_product_delivery_not_ready','Public product delivery is not connected yet. Keep these relationships in a draft until product delivery is available.');
  findings.push(...pageSeoFindings(v.seo));
  if(checked.success&&checked.data.websiteId===input.site&&checked.data.recordId===input.record&&checked.data.revisionId===input.revision){const e=checked.data;
   const expectedMedia=[...new Set([v.image,...v.gallery,v.seo.socialImage].filter(Boolean).map(i=>i!.assetId))];
   if(e.media.length!==expectedMedia.length||e.media.some(m=>!expectedMedia.includes(m.assetId)))error('media','project_evidence_mismatch','Image evidence does not match this draft.');
   for(const asset of expectedMedia){const rows=e.media.filter(m=>m.assetId===asset);if(rows.length!==1||!rows[0].available)error('media','project_image_unavailable','A selected image needs verified processing and current approved rights.');}
   if(e.claims.length!==v.claims.length||e.claims.some(c=>!v.claims.some(x=>x.id===c.claimId)))error('claims','project_evidence_mismatch','Claim approval evidence does not match this draft.');
   for(const [index,claim]of v.claims.entries()){const rows=e.claims.filter(c=>c.claimId===claim.id);if(rows.length!==1||!rows[0].approved)error(`claims.${index}`,'project_claim_unapproved','The assigned reviewer must approve current supporting evidence for this saved claim.');}
   const refs=([['projects','project'],['products','product'],['destinations','destination'],['documents','document']] as const).flatMap(([key,type])=>v.relationships[key].map(r=>({...r,type,key})));
   if(e.references.length!==refs.length||e.references.some(r=>!refs.some(x=>x.type===r.type&&x.recordId===r.recordId)))error('relationships','project_evidence_mismatch','Related-record evidence does not match this draft.');
   for(const ref of refs){const rows=e.references.filter(r=>r.type===ref.type&&r.recordId===ref.recordId);if(rows.length!==1||!rows[0].available||!rows[0].published||rows[0].locale!==input.locale||ref.recordId===input.record)error(`relationships.${ref.key}`,'project_reference_unavailable','Choose a published related record in this website and language.');}
   const hrefs=new Set<string>();const walk=(value:unknown)=>{if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')for(const [key,child]of Object.entries(value)){if(key==='href'&&typeof child==='string'&&(child.startsWith('/')||child.startsWith('#')))hrefs.add(child);else walk(child);}};walk(v);
   if(e.links.length!==hrefs.size||e.links.some(l=>!hrefs.has(l.href)))error('links','project_evidence_mismatch','Internal-link evidence does not match this draft.');
   for(const href of hrefs){const rows=e.links.filter(l=>l.href===href);if(rows.length!==1||!rows[0].available)error('links','project_link_unavailable','An internal link does not resolve to an available page. Fragment links need a supported anchor before publication.');}
  }
 }
 return {validatorVersion:'project-1',contentChecksPass:!findings.some(f=>f.severity==='error'),findings};
}
