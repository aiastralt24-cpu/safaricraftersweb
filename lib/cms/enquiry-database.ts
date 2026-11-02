import {careerSourceMatches} from './career-source-context.ts';
import {createHash,createHmac} from 'node:crypto';
import {readEnquiryFileEvidence} from './enquiry-file-evidence.ts';
import {enquiryFileSessionIdentitySchema} from './enquiry-file-session-create.ts';
import {z} from 'zod';
import type {EnquiryIntakeAdapter} from './enquiry-intake.ts';
const procedures=['consume_enquiry_rate','get_enquiry_input','accept_enquiry','get_published_form','accept_expedition_enquiry','accept_career_enquiry','get_career_application_form','get_enquiry_file_transfer','confirm_enquiry_file','get_enquiry_file_session','create_enquiry_file_session','reserve_enquiry_file','get_enquiry_file_status','cancel_enquiry_file_session','get_enquiry_file_evidence','accept_enquiry_attachments'] as const;
export type EnquiryProcedure=typeof procedures[number];
export type EnquiryRpc=(procedure:EnquiryProcedure,args:Record<string,unknown>)=>Promise<unknown>;
/** Privileged server transport: never import this Node-only module from client UI.
 * No secrets are returned in errors and redirects cannot forward credentials. */
export function createEnquiryRpc(config:{url:string;serviceKey:string},fetcher:typeof fetch=fetch):EnquiryRpc{
 let origin:URL;try{origin=new URL(config.url);}catch{throw Error('Enquiry database is not configured.');}
 if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash||!config.serviceKey||/[\r\n]/.test(config.serviceKey))throw Error('Enquiry database is not configured.');
 return async(procedure,args)=>{
  if(!procedures.includes(procedure))throw Error('Invalid enquiry operation.');
  let response:Response;try{response=await fetcher(new URL(`/rest/v1/rpc/${procedure}`,origin),{method:'POST',headers:{apikey:config.serviceKey,Authorization:`Bearer ${config.serviceKey}`,'Content-Type':'application/json','Content-Profile':'cms','Accept-Profile':'cms'},body:JSON.stringify(args),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});}catch{throw Error('Enquiry database is unavailable.');}
  if(!response.ok)throw Error('Enquiry database operation failed.');
  try{return await response.json();}catch{throw Error('Invalid enquiry database response.');}
 };
}
export function createEnquiryIntakeAdapter(options:{site:string;trustedIdentity:string;identitySecret:string;rpc:EnquiryRpc;verifyChallenge:(token:string)=>Promise<boolean>;attachment?:{form:string;revision:string;request:string;session:string;token:string}}):EnquiryIntakeAdapter{
 if(!z.string().uuid().safeParse(options.site).success||!options.trustedIdentity||options.trustedIdentity.length>500||options.identitySecret.length<32||typeof options.verifyChallenge!=='function')throw Error('Trusted enquiry context is not configured.');
 const actorDigest=createHmac('sha256',options.identitySecret).update(options.site).update('\0').update(options.trustedIdentity).digest('hex');
 const site=options.site;
 // The HTTP layer supplies proof only when attachment delivery is enabled.
 // Capture a validated copy so a caller cannot change scope between evidence
 // validation and atomic persistence. Credentials are never lead attribution.
 const proof=options.attachment?z.object({form:z.string().uuid(),revision:z.string().uuid(),request:z.string().uuid(),session:z.string().uuid(),token:z.string().regex(/^[a-f0-9]{64}$/)}).strict().parse(options.attachment):null;
 const attachmentIdentity=(form:string,revision:string,request:string)=>{
  if(!proof||proof.form!==form||proof.revision!==revision||proof.request!==request)throw Error('Attachment submission scope mismatch.');
  return enquiryFileSessionIdentitySchema.parse({site,form,revision,request,session:proof.session});
 };
 return {
  consumeRate:async()=>z.object({allowed:z.boolean(),retryAfter:z.number().int().min(1).max(600)}).strict().parse(await options.rpc('consume_enquiry_rate',{p_site:site,p_actor_digest:actorDigest})),
  verifyChallenge:options.verifyChallenge,
  read:async(form,revision,request)=>options.rpc('get_enquiry_input',{p_site:site,p_form:form,p_revision:revision,p_request:request}),
  files:async(form,revision,answers,context)=>{
   if(!proof)return [];
   const identity=attachmentIdentity(form,revision,context.request);
   return readEnquiryFileEvidence(options.rpc,identity,proof.token,context.definition,answers);
  },
  persist:async input=>{
   if(input.site!==site)throw Error('Enquiry website mismatch.');
   if(input.career&&input.expedition)throw Error('Choose one enquiry context.');
   if(!careerSourceMatches(input.attribution.sourcePath,input.career))throw Error('Career source context mismatch.');
   if(proof){
    const identity=attachmentIdentity(input.form,input.revision,input.request);
    return options.rpc('accept_enquiry_attachments',{p_site:site,p_form:identity.form,p_revision:identity.revision,p_request:identity.request,p_session:identity.session,p_token_hash:createHash('sha256').update(proof.token).digest('hex'),p_answers:input.answers,p_consents:input.consents,p_attribution:input.attribution,p_context:input.career?{career:input.career}:input.expedition?{expedition:input.expedition}:{}});
   }
   if(input.career)return options.rpc('accept_career_enquiry',{p_site:site,p_form:input.form,p_revision:input.revision,p_request:input.request,p_answers:input.answers,p_consents:input.consents,p_source_path:input.attribution.sourcePath??null,p_selection:input.career});
   if(input.expedition)return options.rpc('accept_expedition_enquiry',{p_site:site,p_form:input.form,p_revision:input.revision,p_request:input.request,p_answers:input.answers,p_consents:input.consents,p_source_path:input.attribution.sourcePath??null,p_selection:input.expedition});
   return options.rpc('accept_enquiry',{p_site:site,p_form:input.form,p_revision:input.revision,p_request:input.request,p_answers:input.answers,p_consents:input.consents,p_attribution:input.attribution});
  },
 };
}
