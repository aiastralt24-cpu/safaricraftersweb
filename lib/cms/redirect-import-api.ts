import {z} from 'zod';
import {createHash} from 'node:crypto';
import {verifiedRedirectImportReceipt} from './redirect-import-proposal.ts';
import {parseRedirectImport,verifiedRedirectImportReview} from './redirect-import.ts';
import {readBoundedJson} from './editor-api.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
export async function handleRedirectImportReview(request:Request,call=(token:string,name:string,args:Record<string,unknown>)=>cmsRpc(cmsConnection(),token,name,args)){
 try{
  const token=bearerToken(request.headers.get('authorization')),url=new URL(request.url),origin=request.headers.get('origin');
  if(origin&&origin!==url.origin)throw new CmsGatewayError(403,'Cross-origin CMS requests are not allowed.');
  if(url.search)throw new CmsGatewayError(422,'Redirect reviews cannot contain query parameters.');
  const uuid=z.string().uuid(),input=z.union([
   z.object({site:uuid,file:z.string().max(1000000),action:z.literal('review').optional()}).strict(),
   z.object({site:uuid,file:z.string().max(1000000),action:z.literal('submit'),requestKey:uuid,snapshots:z.array(z.string().regex(/^[a-f0-9]{32}$/)).min(1).max(100)}).strict(),
   z.object({site:uuid,action:z.enum(['status','cancel']),requestKey:uuid}).strict(),
  ]).safeParse(await readBoundedJson(request));
  if(!input.success)throw new CmsGatewayError(422,'Choose a website and JSON redirect file.');
  const command=input.data;
  if(command.action==='status'||command.action==='cancel'){
   const raw=await call(token,command.action==='status'?'get_redirect_import_request':'cancel_redirect_import_request',{p_site:command.site,p_request:command.requestKey});
   return Response.json({result:raw===null&&command.action==='status'?null:verifiedRedirectImportReceipt(raw,command)},{headers:privateHeaders});
  }
  if(!('file' in command))throw new CmsGatewayError(422,'Invalid redirect import action.');
  const {site,file}=command;let rows;try{rows=parseRedirectImport(file,site);}catch(error){throw new CmsGatewayError(422,error instanceof Error?error.message:'Invalid redirect file.');}
  if(command.action==='submit'){
   if(command.snapshots.length!==rows.length)throw new CmsGatewayError(422,'Review every redirect before submitting.');
   const source=createHash('sha256').update(file).digest('hex');
   const receipt=verifiedRedirectImportReceipt(await call(token,'submit_redirect_import',{p_site:site,p_request:command.requestKey,p_source:source,p_items:rows,p_snapshots:command.snapshots}),command);
   if(receipt.sourceDigest!==source)throw new CmsGatewayError(503,'The submitted source file was not confirmed.');
   return Response.json({result:receipt},{headers:privateHeaders});
  }
  return Response.json({result:verifiedRedirectImportReview(await call(token,'review_redirect_import',{p_site:site,p_items:rows}),site,rows)},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
