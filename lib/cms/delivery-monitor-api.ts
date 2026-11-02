import {deliveryMonitorQuery,verifiedDeliveryMonitor} from './delivery-monitor.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
export async function handleDeliveryMonitor(request:Request,call=(token:string,name:string,args:Record<string,unknown>)=>cmsRpc(cmsConnection(),token,name,args)){
 try{const token=bearerToken(request.headers.get('authorization')),params=new URL(request.url).searchParams;
 if([...params.keys()].length!==new Set(params.keys()).size)throw new CmsGatewayError(422,'Use one value per delivery filter.');
 const parsed=deliveryMonitorQuery.safeParse(Object.fromEntries(params));if(!parsed.success)throw new CmsGatewayError(422,'Choose valid delivery filters.');const query=parsed.data;
 return Response.json({result:verifiedDeliveryMonitor(await call(token,'list_delivery_monitor',{p_site:query.site,p_after:query.after??null,p_filter:query.filter,p_limit:20}),query)},{headers:privateHeaders});}catch(error){return cmsErrorResponse(error);}
}
