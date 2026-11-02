import {z} from 'zod';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const query=z.object({site:z.string().uuid(),locale:z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/).default('en')}).strict();
type Rpc=(token:string,name:string,args:Record<string,unknown>)=>Promise<unknown>;
export async function handleSettingsRead(request:Request,call:Rpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{
  const token=bearerToken(request.headers.get('authorization')),params=new URL(request.url).searchParams;
  if(new Set(params.keys()).size!==[...params.keys()].length)throw new CmsGatewayError(422,'Duplicate settings parameters are not allowed.');
  const parsed=query.safeParse(Object.fromEntries(params));if(!parsed.success)throw new CmsGatewayError(422,'Choose a website and valid locale.');
  const result=await call(token,'get_settings_workspace',{p_site:parsed.data.site,p_locale:parsed.data.locale});
  if(!result)throw new CmsGatewayError(404,'Settings are unavailable.');
  return Response.json({result},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
