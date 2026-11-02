import {z} from 'zod';
import {publicationScheduleSchema,parseFuturePublicationSchedule} from './publication-schedule.ts';
import {readBoundedJson,type EditorRpc} from './editor-api.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const uuid=z.string().uuid();
const command=z.discriminatedUnion('action',[
 publicationScheduleSchema.extend({action:z.literal('schedule')}).strict(),
 z.object({action:z.literal('cancel'),site:uuid,schedule:uuid}).strict(),
]);
const query=z.object({site:uuid,record:uuid}).strict();
const row=z.object({
 id:uuid,website_id:uuid,record_id:uuid,revision_id:uuid,
 operation:z.enum(['publish','unpublish']),run_at:z.iso.datetime({offset:true}),
 status:z.enum(['pending','running','published','unpublished','blocked','cancelled']),
 attempts:z.number().int().min(0).max(8),created_at:z.iso.datetime({offset:true}),
 finished_at:z.iso.datetime({offset:true}).nullable(),
 error_code:z.enum(['validation_unavailable','validation_failed','publication_guard_failed','worker_lease_expired']).nullable(),
 delivery_job_id:uuid.nullable(),
});
const rpc:EditorRpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args);
export async function handlePublicationScheduleRead(request:Request,call:EditorRpc=rpc){
 try{
  const token=bearerToken(request.headers.get('authorization'));
  const params=new URL(request.url).searchParams;
  if([...params.keys()].some(key=>params.getAll(key).length!==1))throw new CmsGatewayError(400,'Select one website and record.');
  const parsed=query.safeParse(Object.fromEntries(params));
  if(!parsed.success)throw new CmsGatewayError(400,'Select a website and record.');
  const {site,record}=parsed.data;
  const result=z.array(row).max(100).safeParse(await call(token,'list_publication_schedules',{p_site:site,p_record:record}));
  if(!result.success||result.data.some(value=>value.website_id!==site||value.record_id!==record)||new Set(result.data.map(value=>value.id)).size!==result.data.length)
   throw new CmsGatewayError(503,'Schedule information is unavailable. Reload before making changes.');
  // Deliberately project the response: actor identities, leases and future
  // database-only columns must not cross the browser boundary.
  return Response.json({schedules:result.data.map(value=>({id:value.id,site:value.website_id,record:value.record_id,revision:value.revision_id,operation:value.operation,runAt:value.run_at,status:value.status,attempts:value.attempts,createdAt:value.created_at,finishedAt:value.finished_at,errorCode:value.error_code,deliveryJobId:value.delivery_job_id}))},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
export async function handlePublicationScheduleCommand(request:Request,call:EditorRpc=rpc,now:()=>Date=()=>new Date()){
 try{
  const token=bearerToken(request.headers.get('authorization'));
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS writes are not allowed.');
  const parsed=command.safeParse(await readBoundedJson(request));
  if(!parsed.success)throw new CmsGatewayError(422,'Check the schedule fields and include an explicit time-zone offset.');
  const c=parsed.data;
  if(c.action==='cancel'){
   const result=await call(token,'cancel_publication_schedule',{p_site:c.site,p_schedule:c.schedule});
   if(result!==null)throw new CmsGatewayError(503,'Cancellation could not be confirmed. Reload the schedule status.');
   return Response.json({result:{id:c.schedule,status:'cancelled'}},{headers:privateHeaders});
  }
  let schedule;
  try{const {action,...input}=c;schedule=parseFuturePublicationSchedule(input,now());}
  catch{throw new CmsGatewayError(422,'Choose a future date and time with an explicit time-zone offset.');}
  const id=uuid.safeParse(await call(token,'schedule_publication',{p_site:schedule.site,p_record:schedule.record,p_revision:schedule.revision,p_operation:schedule.operation,p_run_at:schedule.runAt}));
  if(!id.success)throw new CmsGatewayError(503,'Schedule creation could not be confirmed. Reload schedules before retrying.');
  return Response.json({result:{id:id.data,status:'pending',...schedule}},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
