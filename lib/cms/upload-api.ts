import {z} from 'zod';
import {readBoundedJson} from './editor-api.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const uuid=z.string().uuid();
const commands=z.discriminatedUnion('action',[
  z.object({action:z.literal('list'),site:uuid}).strict(),
  z.object({action:z.literal('reserve'),site:uuid,requestKey:uuid,filename:z.string().min(1).max(255),mime:z.enum(['image/jpeg','image/png','image/webp','image/avif']),bytes:z.number().int().min(1).max(25_000_000)}).strict(),
  z.object({action:z.enum(['status','cancel']),site:uuid,upload:uuid}).strict(),
]);
type Rpc=(token:string,procedure:string,args:Record<string,unknown>)=>Promise<unknown>;
const rpc:Rpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args);
export async function handleUploadCommand(request:Request,call:Rpc=rpc){
  try{
    const token=bearerToken(request.headers.get('authorization'));
    const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS writes are not allowed.');
    const parsed=commands.safeParse(await readBoundedJson(request));
    if(!parsed.success)throw new CmsGatewayError(422,'Check the upload filename, image type and file size.');
    const c=parsed.data;
    const result=c.action==='list'?await call(token,'list_uploads',{p_site:c.site}):c.action==='reserve'?await call(token,'reserve_upload',{p_site:c.site,p_request:c.requestKey,p_filename:c.filename,p_mime:c.mime,p_bytes:c.bytes}):await call(token,c.action==='status'?'get_upload':'cancel_upload',{p_site:c.site,p_upload:c.upload});
    if(c.action==='status'&&!result)throw new CmsGatewayError(404,'Upload is unavailable.');
    return Response.json({result},{headers:privateHeaders});
  }catch(error){return cmsErrorResponse(error);}
}
