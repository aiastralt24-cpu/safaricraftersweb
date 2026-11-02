import {projectContactPage} from './contact-page.ts';
import type {ContentFinding,ValidationRecord} from './content-validation.ts';
/** Advisory structure feedback only. Trusted publication additionally requires current form/media evidence
 * and the database release policy. */
export function contactPageFindings(record:ValidationRecord,now=new Date()):ContentFinding[]{
 const findings:ContentFinding[]=[];
 if(record.type!=='page'||record.path!=='/contact')findings.push({field:'path',severity:'error',code:'contact_page_route',message:'Use an ordinary page at /contact.'});
 try{
  projectContactPage({recordId:'00000000-0000-4000-8000-000000000001',revisionId:'00000000-0000-4000-8000-000000000002',type:'page',payload:record.payload},{locale:record.locale??'en',now});
 }catch(error){findings.push({field:'composition',severity:'error',code:'contact_page_structure',message:error instanceof Error&&!('issues'in error)?error.message:'Contact composition and SEO must match the supported page contract.'});}
 findings.push({field:'composition',severity:'warning',code:'contact_form_delivery_pending',message:'A selected form must be verified against its same-site published revision. The public route remains gated until rollout verification is complete.'});
 return findings;
}
