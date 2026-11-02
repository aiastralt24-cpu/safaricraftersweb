import {createHmac,timingSafeEqual} from 'node:crypto';
import {isIP} from 'node:net';
import {z} from 'zod';
import {createEnquiryRpc,createEnquiryIntakeAdapter} from './enquiry-database.ts';
import {createTurnstileVerifier} from './turnstile.ts';
import type {EnquiryHttpConfig} from './enquiry-http.ts';
/** A trusted proxy signs these headers after removing any incoming copies.
 * No x-forwarded-for or unsigned client identity is ever trusted. */
export function verifiedIngressIdentity(request:Request,secret:string,now=Date.now()){
 const ip=request.headers.get('x-cms-client-ip')??'',timestamp=request.headers.get('x-cms-ingress-timestamp')??'',signature=request.headers.get('x-cms-ingress-signature')??'';
 if(secret.length<32||!isIP(ip)||!/^\d{10}$/.test(timestamp)||Math.abs(now/1000-Number(timestamp))>60||!/^([a-f0-9]{64})$/.test(signature))throw Error('Trusted ingress identity is unavailable.');
 const expected=createHmac('sha256',secret).update(`${timestamp}\n${ip}`).digest();if(!timingSafeEqual(expected,Buffer.from(signature,'hex')))throw Error('Trusted ingress identity is unavailable.');
 return isIP(ip)===6?new URL(`http://[${ip}]`).hostname.slice(1,-1):ip;
}
export function enquiryHttpConfig(env:Record<string,string|undefined>,fetcher:typeof fetch=fetch):EnquiryHttpConfig|null{
 if(env.CMS_ENQUIRY_ENABLED!=='true')return null;
 try{
  const site=z.string().uuid().parse(env.CMS_WEBSITE_ID),origin=new URL(env.CMS_PUBLIC_SITE_ORIGIN??'');
  if(origin.protocol!=='https:'||origin.pathname!=='/'||origin.search||origin.hash||origin.username||origin.password)throw Error();
  const ingressSecret=env.CMS_ENQUIRY_INGRESS_SECRET??'',identitySecret=env.CMS_ENQUIRY_IDENTITY_SECRET??'';
  if(ingressSecret.length<32||identitySecret.length<32)throw Error();
  const rpc=createEnquiryRpc({url:env.CMS_SUPABASE_URL??'',serviceKey:env.CMS_SUPABASE_SERVICE_ROLE_KEY??''},fetcher);
  const verifyChallenge=createTurnstileVerifier({secret:env.CMS_TURNSTILE_SECRET??'',hostname:origin.hostname,action:'cms_enquiry'},fetcher);
  return {site,origin:origin.origin,adapterForRequest:async request=>{
   const trustedIdentity=verifiedIngressIdentity(request,ingressSecret);
   const names=['authorization','x-cms-form','x-cms-revision','x-cms-request','x-cms-session'];
   let attachment: {form:string;revision:string;request:string;session:string;token:string}|undefined;
   if(names.some(name=>request.headers.has(name))){
    if(env.CMS_ENQUIRY_FILES_ENABLED!=='true')throw Error('Attachments are unavailable.');
    const token=/^Bearer ([a-f0-9]{64})$/.exec(request.headers.get('authorization')??'')?.[1];
    attachment=z.object({form:z.string().uuid(),revision:z.string().uuid(),request:z.string().uuid(),session:z.string().uuid(),token:z.string().regex(/^[a-f0-9]{64}$/)}).parse({form:request.headers.get('x-cms-form'),revision:request.headers.get('x-cms-revision'),request:request.headers.get('x-cms-request'),session:request.headers.get('x-cms-session'),token});
   }
   return createEnquiryIntakeAdapter({site,trustedIdentity,identitySecret,rpc,verifyChallenge,attachment});
  }};
 }catch{return null;}
}
