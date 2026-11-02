import {z} from 'zod';
import {readBoundedJson} from './editor-api.ts';
import {globalSettingsSchema,globalSettingsImpact} from './global-settings.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const uuid=z.string().uuid();
const input=z.object({site:uuid,record:uuid,revision:uuid,payload:globalSettingsSchema}).strict();
type Rpc=(token:string,name:string,args:Record<string,unknown>)=>Promise<unknown>;
export async function handleSettingsReview(request:Request,call:Rpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{
  const token=bearerToken(request.headers.get('authorization')),origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS requests are not allowed.');
  const parsed=input.safeParse(await readBoundedJson(request));if(!parsed.success)throw new CmsGatewayError(422,'Check the global settings fields.');
  const c=parsed.data;
  const stored=z.object({id:uuid,type:z.literal('settings'),currentRevision:uuid,payload:z.unknown()}).passthrough().safeParse(await call(token,'get_editor_record',{p_site:c.site,p_record:c.record}));
  if(!stored.success)throw new CmsGatewayError(404,'Settings are unavailable.');
  if(stored.data.id!==c.record||stored.data.currentRevision!==c.revision)throw new CmsGatewayError(409,'Reload the current settings before reviewing impact.');
  const baseline=globalSettingsSchema.safeParse(stored.data.payload);if(!baseline.success)throw new CmsGatewayError(422,'Existing settings need migration before this review.');
  return Response.json({result:{revision:c.revision,impact:globalSettingsImpact(baseline.data,c.payload),publicationAuthorized:false,scope:'Potential shared-setting impact; live usage and page overrides are not enumerated.'}},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
