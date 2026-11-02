import {z} from 'zod';
import {readBoundedJson} from './editor-api.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const uuid=z.string().uuid();
const commands=z.discriminatedUnion('action',[
 z.object({action:z.literal('recipients'),site:uuid,record:uuid,search:z.string().max(200).default(''),after:uuid.nullable().default(null)}).strict(),
 z.object({action:z.literal('sessions'),site:uuid,record:uuid}).strict(),
]);
type Rpc=(token:string,name:string,args:Record<string,unknown>)=>Promise<unknown>;
export async function handlePreviewManagement(request:Request,call:Rpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{
  const token=bearerToken(request.headers.get('authorization')),origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS requests are not allowed.');
  const parsed=commands.safeParse(await readBoundedJson(request));if(!parsed.success)throw new CmsGatewayError(422,'Check the preview fields.');
  const c=parsed.data;const result=c.action==='recipients'?await call(token,'list_preview_recipients',{p_site:c.site,p_record:c.record,p_search:c.search,p_after:c.after}):await call(token,'list_my_previews',{p_site:c.site,p_record:c.record});
  return Response.json({result},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
