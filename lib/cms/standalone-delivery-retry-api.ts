import {z} from 'zod';
import {readBoundedJson} from './editor-api.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const command=z.object({site:z.string().uuid(),job:z.string().uuid()}).strict();
export async function handleStandaloneDeliveryRetry(request:Request,call=(token:string,name:string,args:Record<string,unknown>)=>cmsRpc(cmsConnection(),token,name,args)){
 try{const token=bearerToken(request.headers.get('authorization')),origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS writes are not allowed.');
 const parsed=command.safeParse(await readBoundedJson(request));if(!parsed.success)throw new CmsGatewayError(422,'Choose a delivery job.');const target=parsed.data;
 const result=command.extend({status:z.enum(['queued','not_eligible'])}).parse(await call(token,'retry_standalone_delivery',{p_site:target.site,p_job:target.job}));
 if(result.site!==target.site||result.job!==target.job)throw new CmsGatewayError(503,'Retry confirmation is unavailable. Refresh delivery status before trying again.');
 return Response.json({result},{headers:privateHeaders});}catch(error){return cmsErrorResponse(error);}
}
