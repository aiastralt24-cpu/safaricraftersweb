import {z} from 'zod';
import {readBoundedJson} from './editor-api.ts';
import {parseMfaPolicy} from './mfa-policy.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const command=z.discriminatedUnion('action',[z.object({action:z.literal('read'),site:z.string().uuid()}).strict(),z.object({action:z.literal('set'),site:z.string().uuid(),version:z.number().int().min(0).max(Number.MAX_SAFE_INTEGER-1),required:z.boolean()}).strict()]);
type Rpc=(token:string,name:string,args:Record<string,unknown>)=>Promise<unknown>;
export async function handleMfaPolicy(request:Request,call:Rpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{
  const token=bearerToken(request.headers.get('authorization')),url=new URL(request.url),origin=request.headers.get('origin');
  if(request.method!=='POST'||url.search)throw new CmsGatewayError(400,'Invalid MFA policy request.');
  if(origin&&origin!==url.origin)throw new CmsGatewayError(403,'Cross-origin CMS requests are not allowed.');
  const parsed=command.safeParse(await readBoundedJson(request));if(!parsed.success)throw new CmsGatewayError(422,'Check the MFA policy fields.');
  const c=parsed.data,raw=await call(token,c.action==='read'?'get_mfa_policy':'set_mfa_policy',c.action==='read'?{p_site:c.site}:{p_site:c.site,p_version:c.version,p_required:c.required});
  let policy;try{policy=parseMfaPolicy(raw,c.site);}catch{throw new CmsGatewayError(503,'The MFA policy could not be verified. Reload its status.');}
  if(c.action==='set'&&(policy.required!==c.required||policy.version!==c.version+1||!policy.verified||!policy.canManage))throw new CmsGatewayError(503,'The MFA policy change could not be confirmed. Reload its status.');
  return Response.json({policy},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
