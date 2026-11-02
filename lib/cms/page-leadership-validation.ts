import {z} from 'zod';
import {validateComposition} from './composition.ts';
export const pageLeadershipEvidenceSchema=z.object({websiteId:z.string().uuid(),recordId:z.string().uuid(),revisionId:z.string().uuid(),references:z.array(z.object({recordId:z.string().uuid(),available:z.boolean()}).strict()).max(30)}).strict();
export function pageLeadershipFindings(input:{site:string;record:string;revision:string;payload:Record<string,unknown>},evidence:unknown){
 const composition=validateComposition(input.payload.composition);
 const ids=[...new Set((composition.page?.sections??[]).filter(s=>s.kind==='reusableLeadership'&&s.controls.visible).flatMap(s=>(s.data as {records:{recordId:string}[]}).records.map(r=>r.recordId.toLowerCase())))];
 if(!ids.length)return [];
 const parsed=pageLeadershipEvidenceSchema.safeParse(evidence),e=parsed.success?parsed.data:null;
 const valid=e&&e.websiteId===input.site&&e.recordId===input.record&&e.revisionId===input.revision&&e.references.length===ids.length&&new Set(e.references.map(r=>r.recordId.toLowerCase())).size===ids.length&&e.references.every(r=>r.available&&ids.includes(r.recordId.toLowerCase()));
 return valid?[]:[{field:'composition.sections',severity:'error' as const,code:'page_leadership_unavailable',message:'Publish every selected leadership profile and check this saved page again. Evidence must match this exact page revision.'}];
}
