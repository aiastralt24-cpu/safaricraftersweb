import {createEnquiryRpc} from './enquiry-database.ts';
import {enquiryFileTransferHttpConfig} from './enquiry-file-transfer-runtime.ts';
import type {EnquiryFileControlsHttpConfig} from './enquiry-file-controls-http.ts';
export function enquiryFileControlsHttpConfig(env:Record<string,string|undefined>,fetcher:typeof fetch=fetch):EnquiryFileControlsHttpConfig|null{
 const transfer=enquiryFileTransferHttpConfig(env,fetcher);if(!transfer)return null;
 try{const rpc=createEnquiryRpc({url:env.CMS_SUPABASE_URL??'',serviceKey:env.CMS_SUPABASE_SERVICE_ROLE_KEY??''},fetcher);
  return {site:transfer.site,origin:transfer.origin,adapterForRequest:async request=>{const trusted=await transfer.adapterForRequest(request);return {rpc,consumeRate:trusted.consumeRate};}};
 }catch{return null;}
}
