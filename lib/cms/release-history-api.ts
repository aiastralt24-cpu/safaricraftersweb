import {z} from 'zod';
import type {EditorRpc} from './editor-api.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const uuid=z.string().uuid();
import {releaseHistorySchema} from './release-history.ts';
const query=z.object({site:uuid,before:uuid.optional()}).strict();
const rpc:EditorRpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args);
export async function handleReleaseHistoryRead(request:Request,call:EditorRpc=rpc){
 try{
  const token=bearerToken(request.headers.get('authorization')),params=new URL(request.url).searchParams;
  if([...params.keys()].some(key=>params.getAll(key).length!==1))throw new CmsGatewayError(400,'Select one website and history cursor.');
  const parsed=query.safeParse(Object.fromEntries(params));if(!parsed.success)throw new CmsGatewayError(400,'Check the release history query.');
  const {site,before}=parsed.data;
  const rows=releaseHistorySchema.safeParse(await call(token,'list_release_history',{p_site:site,p_before:before??null,p_limit:20}));
  if(!rows.success)throw new CmsGatewayError(503,'Release history could not be verified.');
  return Response.json({site,releases:rows.data,nextCursor:rows.data.length===20?rows.data.at(-1)!.release:null},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
