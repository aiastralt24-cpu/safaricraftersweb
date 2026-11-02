import {scheduleMonitorQuery,verifiedScheduleMonitor} from './schedule-monitor.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
export async function handleScheduleMonitor(request:Request,call=(token:string,name:string,args:Record<string,unknown>)=>cmsRpc(cmsConnection(),token,name,args)){
 try{const token=bearerToken(request.headers.get('authorization')),params=new URL(request.url).searchParams;
 if([...params.keys()].length!==new Set(params.keys()).size)throw new CmsGatewayError(422,'Use one value per schedule filter.');
 const parsed=scheduleMonitorQuery.safeParse(Object.fromEntries(params));if(!parsed.success)throw new CmsGatewayError(422,'Choose valid schedule filters.');
 const query=parsed.data,result=verifiedScheduleMonitor(await call(token,'list_schedule_monitor',{p_site:query.site,p_after:query.after??null,p_state:query.state,p_operation:query.operation,p_limit:20}),query);
 return Response.json({result},{headers:privateHeaders});}catch(error){return cmsErrorResponse(error);}
}
