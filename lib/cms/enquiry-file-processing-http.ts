import {createHash,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {dispatchEnquiryFiles,type EnquiryFileDispatchAdapter} from './enquiry-file-dispatch.ts';
import type {DocumentRuntime} from './document-inspection.ts';
export type EnquiryFileProcessingConfig={site:string;secret:string;adapter:EnquiryFileDispatchAdapter;runtime:DocumentRuntime};
/** Server-scheduled entry point, not a browser operation. A deployment factory
 * must supply a real scanner/PDF runtime; no permissive defaults are provided. */
export async function handleEnquiryFileProcessing(request:Request,config:EnquiryFileProcessingConfig|null){
 const respond=(status:number,body:unknown)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'}});
 if(!config||!z.string().uuid().safeParse(config.site).success||!/^[-A-Za-z0-9_]{32,256}$/.test(config.secret))return respond(503,{error:'Attachment processing is not configured.'});
 const received=request.headers.get('authorization')??'';
 if(received.length>1024||!timingSafeEqual(createHash('sha256').update(received).digest(),createHash('sha256').update(`Bearer ${config.secret}`).digest()))return respond(401,{error:'Unauthorized.'});
 if(request.method!=='POST'||new URL(request.url).search||request.body!==null)return respond(400,{error:'Send an empty POST without query parameters.'});
 try{return respond(200,{ok:true,counts:await dispatchEnquiryFiles(config.adapter,config.site,config.runtime,1)});}catch{return respond(503,{error:'Attachment processing could not be confirmed.'});}
}
