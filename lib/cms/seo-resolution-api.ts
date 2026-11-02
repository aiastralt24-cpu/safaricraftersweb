import {z} from 'zod';
import {readBoundedJson} from './editor-api.ts';
import {pageSeoSchema} from './page-seo.ts';
import {globalSettingsSchema} from './global-settings.ts';
import {resolvePageSeo} from './seo-resolution.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const uuid=z.string().uuid();
const input=z.object({site:uuid,record:uuid,revision:uuid,title:z.string().trim().min(1).max(200),seo:pageSeoSchema}).strict();
type Rpc=(token:string,name:string,args:Record<string,unknown>)=>Promise<unknown>;
export async function handleSeoResolution(request:Request,call:Rpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args),origin=process.env.CMS_PUBLIC_SITE_ORIGIN||''){
 try{
  const token=bearerToken(request.headers.get('authorization')),requestOrigin=request.headers.get('origin');
  if(requestOrigin&&requestOrigin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS requests are not allowed.');
  const parsed=input.safeParse(await readBoundedJson(request));if(!parsed.success)throw new CmsGatewayError(422,'Check the SEO fields.');const c=parsed.data;
  const record=z.object({id:uuid,type:z.enum(['page','homepage']),currentRevision:uuid,locale:z.string(),path:z.string()}).passthrough().safeParse(await call(token,'get_editor_record',{p_site:c.site,p_record:c.record}));
  if(!record.success)throw new CmsGatewayError(404,'Page is unavailable.');
  if(record.data.id!==c.record||record.data.currentRevision!==c.revision)throw new CmsGatewayError(409,'Reload the current page before resolving SEO.');
  const workspace=z.object({record:z.object({id:uuid,currentRevision:uuid,payload:globalSettingsSchema}).passthrough()}).passthrough().safeParse(await call(token,'get_settings_workspace',{p_site:c.site,p_locale:record.data.locale}));
  if(!workspace.success)throw new CmsGatewayError(422,'Accessible, valid website settings for this locale are required to resolve defaults.');
  let values;try{values=resolvePageSeo(c.seo,workspace.data.record.payload,{origin,path:record.data.path,title:c.title});}catch{throw new CmsGatewayError(422,'Configure a valid public HTTPS website origin and page path before resolving SEO.');}
  return Response.json({result:{values,pageRevision:c.revision,settingsRevision:workspace.data.record.currentRevision,publicationAuthorized:false,source:'Current website settings draft and current page form. Published values may differ.'}},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
