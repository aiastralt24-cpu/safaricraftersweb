import {z} from 'zod';
import {controlEnquiryFiles,enquiryFileControlSchema} from './enquiry-file-controls.ts';
import {readEnquiryFileControlJson,EnquiryFileRequestError} from './enquiry-file-session-http.ts';
import type {EnquiryRpc} from './enquiry-database.ts';
const headers={'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Vary':'Origin'};
export type EnquiryFileControlsHttpConfig={site:string;origin:string;readTimeoutMs?:number;adapterForRequest(request:Request):Promise<{rpc:EnquiryRpc;consumeRate():Promise<unknown>}>};
export async function handleEnquiryFileControlsHttp(request:Request,config:EnquiryFileControlsHttpConfig|null){
 const fail=(status:number,error:string,extra:Record<string,string>={})=>Response.json({ok:false,error},{status,headers:{...headers,...extra}});
 try{
  if(request.method!=='POST')return fail(405,'Use POST.',{Allow:'POST'});
  if(!config||!z.string().uuid().safeParse(config.site).success)return fail(503,'Upload controls are temporarily unavailable.');
  let origin:URL;try{origin=new URL(config.origin);if(origin.protocol!=='https:'||origin.pathname!=='/'||origin.search||origin.hash||origin.username||origin.password||/[\s\\]/.test(config.origin))throw Error();}catch{return fail(503,'Upload controls are temporarily unavailable.');}
  if(request.headers.get('origin')!==origin.origin||request.headers.get('sec-fetch-site')==='cross-site')return fail(403,'This upload origin is not allowed.');
  const token=/^Bearer ([a-f0-9]{64})$/.exec(request.headers.get('authorization')??'');if(!token)return fail(401,'Upload authorization is required.');
  const timeout=config.readTimeoutMs??15000;if(!Number.isInteger(timeout)||timeout<1||timeout>15000)return fail(503,'Upload controls are temporarily unavailable.');
  const adapter=await config.adapterForRequest(request);
  const raw=await readEnquiryFileControlJson(request,timeout,z.record(z.string(),z.unknown()));
  if(Object.hasOwn(raw,'site'))return fail(400,'Upload request is invalid.');
  const parsed=enquiryFileControlSchema.safeParse({...raw,site:config.site});if(!parsed.success)return fail(400,'Upload request is invalid.');
  const result=await controlEnquiryFiles(adapter.rpc,adapter.consumeRate,parsed.data,token[1]);
  if(result.status==='rate_limited')return fail(429,'Too many upload attempts. Please try again later.',{'Retry-After':String(result.retryAfter)});
  return Response.json({ok:true,...result},{headers});
 }catch(error){return error instanceof EnquiryFileRequestError?fail(error.status,error.message):fail(503,'Upload status could not be confirmed. Retry with the same session.');}
 finally{if(request.body&&!request.body.locked)void request.body.cancel().catch(()=>{});}
}
