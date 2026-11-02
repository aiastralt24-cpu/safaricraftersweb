import {z} from 'zod';
import {activityCursor,verifiedContentActivity} from './content-activity.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const schema=z.object({site:z.string().uuid(),before:activityCursor.optional()}).strict();
export async function handleContentActivity(request:Request,call=(token:string,name:string,args:Record<string,unknown>)=>cmsRpc(cmsConnection(),token,name,args)){
 try{
  const token=bearerToken(request.headers.get('authorization')),params=new URL(request.url).searchParams;
  if([...params.keys()].length!==new Set(params.keys()).size)throw new CmsGatewayError(422,'Use one value per activity query field.');
  const parsed=schema.safeParse(Object.fromEntries(params));if(!parsed.success)throw new CmsGatewayError(422,'Choose a website and valid activity cursor.');
  const {site,before}=parsed.data,result=verifiedContentActivity(await call(token,'list_content_activity',{p_site:site,p_before:before??null,p_limit:20}),site,before??null);
  return Response.json({result},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
