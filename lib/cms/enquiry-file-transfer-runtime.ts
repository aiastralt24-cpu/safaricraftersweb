import {createHmac} from 'node:crypto';
import {z} from 'zod';
import {verifiedIngressIdentity} from './enquiry-runtime.ts';
import {createEnquiryRpc} from './enquiry-database.ts';
import {createEnquiryFileStorageAdapter} from './enquiry-file-storage-adapter.ts';
import {createEnquiryFileTransferAdapter} from './enquiry-file-transfer-adapter.ts';
import type {EnquiryFileTransferHttpConfig} from './enquiry-file-transfer-http.ts';
/** Transfer only: never runs inspection or substitutes a clean malware verdict.
 * Session creation must verify a challenge before issuing upload credentials. */
export function enquiryFileTransferHttpConfig(env:Record<string,string|undefined>,fetcher:typeof fetch=fetch):EnquiryFileTransferHttpConfig|null{
 if(env.CMS_ENQUIRY_ENABLED!=='true'||env.CMS_ENQUIRY_FILES_ENABLED!=='true')return null;
 try{
  const site=z.string().uuid().parse(env.CMS_WEBSITE_ID),rawOrigin=env.CMS_PUBLIC_SITE_ORIGIN??'',origin=new URL(rawOrigin);
  if(origin.protocol!=='https:'||origin.pathname!=='/'||origin.search||origin.hash||origin.username||origin.password||/[\s\\]/.test(rawOrigin))throw Error();
  const ingressSecret=env.CMS_ENQUIRY_INGRESS_SECRET??'',identitySecret=env.CMS_ENQUIRY_IDENTITY_SECRET??'';
  if(ingressSecret.length<32||identitySecret.length<32)throw Error();
  const connection={url:env.CMS_SUPABASE_URL??'',serviceKey:env.CMS_SUPABASE_SERVICE_ROLE_KEY??''};
  const rpc=createEnquiryRpc(connection,fetcher);
  const storage=createEnquiryFileStorageAdapter({...connection,site},async()=>'unavailable',fetcher);
  const transfer=createEnquiryFileTransferAdapter(rpc,storage);
  return {site,origin:origin.origin,adapterForRequest:async request=>{
   const identity=verifiedIngressIdentity(request,ingressSecret);
   // Share the intake rate window, so upload traffic cannot bypass its limit.
   const digest=createHmac('sha256',identitySecret).update(site).update('\0').update(identity).digest('hex');
   return {transfer,consumeRate:()=>rpc('consume_enquiry_rate',{p_site:site,p_actor_digest:digest})};
  }};
 }catch{return null;}
}
