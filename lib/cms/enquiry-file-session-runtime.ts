import {createEnquiryRpc} from './enquiry-database.ts';
import {createTurnstileVerifier} from './turnstile.ts';
import {enquiryFileTransferHttpConfig} from './enquiry-file-transfer-runtime.ts';
import {createEnquiryFileSessionCreateAdapter} from './enquiry-file-session-create-adapter.ts';
import type {EnquiryFileSessionHttpConfig} from './enquiry-file-session-http.ts';
/** Share transfer configuration and ingress/rate identity. Session creation uses
 * a distinct widget action; an enquiry-submission challenge cannot authorize it. */
export function enquiryFileSessionHttpConfig(env:Record<string,string|undefined>,fetcher:typeof fetch=fetch):EnquiryFileSessionHttpConfig|null{
 const transfer=enquiryFileTransferHttpConfig(env,fetcher);if(!transfer)return null;
 try{
  const rpc=createEnquiryRpc({url:env.CMS_SUPABASE_URL??'',serviceKey:env.CMS_SUPABASE_SERVICE_ROLE_KEY??''},fetcher);
  const verify=createTurnstileVerifier({secret:env.CMS_TURNSTILE_SECRET??'',hostname:new URL(transfer.origin).hostname,action:'cms_enquiry_upload'},fetcher);
  return {site:transfer.site,origin:transfer.origin,adapterForRequest:async request=>{
   const trusted=await transfer.adapterForRequest(request);
   return createEnquiryFileSessionCreateAdapter(rpc,trusted.consumeRate,verify);
  }};
 }catch{return null;}
}
