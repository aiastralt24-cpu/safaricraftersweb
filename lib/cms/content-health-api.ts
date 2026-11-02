import {z} from 'zod';
import {verifiedContentHealth} from './content-health.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const querySchema=z.object({site:z.string().uuid(),after:z.string().uuid().optional(),record:z.string().uuid().optional()}).strict();
export async function handleContentHealthRead(request:Request,call=(token:string,name:string,args:Record<string,unknown>)=>cmsRpc(cmsConnection(),token,name,args)){
 try{
  const token=bearerToken(request.headers.get('authorization')),query=new URL(request.url).searchParams;
  if([...query.keys()].length!==new Set(query.keys()).size)throw new CmsGatewayError(422,'Use one value per query field.');
  const parsed=querySchema.safeParse(Object.fromEntries(query));if(!parsed.success)throw new CmsGatewayError(422,'Choose a website and valid content cursor.');
  const {site,after,record}=parsed.data;
  if(after&&record)throw new CmsGatewayError(422,'Choose either a record or a continuation cursor.');
  const result=verifiedContentHealth(await call(token,record?'get_content_health':'list_content_health',record?{p_site:site,p_record:record}:{p_site:site,p_after:after??null,p_limit:50}),site,after??null);
  if(record&&(result.nextCursor!==null||result.items.length>1||result.items.some(row=>row.id!==record)))throw new Error('Content health record mismatch.');
  return Response.json({result},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
