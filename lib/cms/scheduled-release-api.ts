import {scheduledReleaseRows as rows} from './scheduled-release-list.ts';
import {z} from 'zod';
import {releaseManifestSchema} from './publication-release.ts';
import {readBoundedJson,type EditorRpc} from './editor-api.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const uuid=z.string().uuid(),instant=z.iso.datetime({offset:true});
const create=releaseManifestSchema.safeExtend({action:z.literal('schedule'),runAt:instant});
const cancel=z.object({action:z.literal('cancel'),site:uuid,schedule:uuid}).strict();
const command=z.union([create,cancel]);
const query=z.object({site:uuid,before:uuid.optional()}).strict();

const rpc:EditorRpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args);
export async function handleScheduledReleaseCommand(request:Request,call:EditorRpc=rpc){
 try{
  const token=bearerToken(request.headers.get('authorization')),origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS writes are not allowed.');
  const parsed=command.safeParse(await readBoundedJson(request));if(!parsed.success)throw new CmsGatewayError(422,'Check the release manifest and explicit time-zone offset.');
  const c=parsed.data;
  if(c.action==='cancel'){
   const result=await call(token,'cancel_scheduled_release',{p_site:c.site,p_schedule:c.schedule});if(result!==null)throw new CmsGatewayError(503,'Cancellation could not be confirmed. Refresh schedules.');
   return Response.json({result:{id:c.schedule,status:'cancelled'}},{headers:privateHeaders});
  }
  // Database checks future time for new requests. Retried old instants must be
  // allowed through so the immutable existing schedule can be recovered.
  const runAt=new Date(c.runAt).toISOString();
  const result=uuid.safeParse(await call(token,'schedule_release',{p_site:c.site,p_request:c.request,p_items:c.items,p_run_at:runAt}));
  if(!result.success)throw new CmsGatewayError(503,'Schedule confirmation is unavailable. Retain this exact request and refresh schedules.');
  return Response.json({result:{id:result.data,site:c.site,request:c.request,runAt}},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
export async function handleScheduledReleaseRead(request:Request,call:EditorRpc=rpc){
 try{
  const token=bearerToken(request.headers.get('authorization')),params=new URL(request.url).searchParams;
  if([...params.keys()].some(key=>params.getAll(key).length!==1))throw new CmsGatewayError(400,'Select one schedule query.');
  const parsed=query.safeParse(Object.fromEntries(params));if(!parsed.success)throw new CmsGatewayError(400,'Select a website and valid cursor.');
  const {site,before}=parsed.data,result=rows.safeParse(await call(token,'list_scheduled_releases',{p_site:site,p_before:before??null,p_limit:20}));
  if(!result.success||result.data.some(row=>row.site.toLowerCase()!==site.toLowerCase()||new Set(row.items.map(item=>item.record)).size!==row.items.length)||new Set(result.data.map(row=>row.id)).size!==result.data.length)throw new CmsGatewayError(503,'Schedule information could not be verified.');
  return Response.json({site,schedules:result.data,nextCursor:result.data.length===20?result.data.at(-1)!.id:null},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
