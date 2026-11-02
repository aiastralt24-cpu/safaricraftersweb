import {z} from 'zod';
import {acceptFormEnquiry} from './enquiry-intake.ts';
import type {EnquiryIntakeAdapter} from './enquiry-intake.ts';
const MAX_BYTES=350000;
const headers={'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Vary':'Origin'};
export type EnquiryHttpConfig={site:string;origin:string;/** Must establish trusted ingress identity and return real server adapters. */adapterForRequest:(request:Request)=>Promise<EnquiryIntakeAdapter>};
class BodyError extends Error{readonly status:number;constructor(status:number,message:string){super(message);this.status=status;}}
async function readJson(request:Request){
 if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw new BodyError(415,'Send JSON content.');
 const length=request.headers.get('content-length');if(length!==null&&(!/^\d+$/.test(length)||Number(length)>MAX_BYTES))throw new BodyError(413,'This enquiry is too large.');
 const reader=request.body?.getReader();if(!reader)throw new BodyError(400,'Enquiry body is missing.');const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BYTES){await reader.cancel();throw new BodyError(413,'This enquiry is too large.');}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new BodyError(400,'The enquiry could not be read.');}
}
/** Ready for a configured route; no origin, proxy or abuse settings are guessed. */
export async function handleEnquiryHttp(request:Request,config:EnquiryHttpConfig|null){
 const fail=(status:number,error:string)=>Response.json({ok:false,error},{status,headers});
 if(request.method!=='POST')return Response.json({ok:false,error:'Use POST.'},{status:405,headers:{...headers,Allow:'POST'}});
 if(!config||!z.string().uuid().safeParse(config.site).success)return fail(503,'Enquiries are temporarily unavailable.');
 let origin:URL;try{origin=new URL(config.origin);if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash||/[\s\\]/.test(config.origin))throw Error();}catch{return fail(503,'Enquiries are temporarily unavailable.');}
 // Browser submissions must originate from the configured website. No CORS wildcard.
 if(request.headers.get('origin')!==origin.origin||request.headers.get('sec-fetch-site')==='cross-site')return fail(403,'This submission origin is not allowed.');
 try{
  const body=await readJson(request);
  const adapter=await config.adapterForRequest(request);
  const result=await acceptFormEnquiry(body,config.site,adapter);
  const retry=result.status===429&&'retryAfter' in result.body?String(result.body.retryAfter):undefined;
  return Response.json(result.body,{status:result.status,headers:{...headers,...(retry?{'Retry-After':retry}:{})}});
 }catch(error){return error instanceof BodyError?fail(error.status,error.message):fail(503,'We could not confirm your enquiry was saved. Please retry.');}
}
