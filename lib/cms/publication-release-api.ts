import {releaseManifestSchema,parseReleaseReceipt,parseReleaseCancellation} from './publication-release.ts';
import {readBoundedJson,type EditorRpc} from './editor-api.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const rpc:EditorRpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args);
export async function handlePublicationRelease(request:Request,call:EditorRpc=rpc,operation:'publish'|'cancel'='publish'){
 try{
  const token=bearerToken(request.headers.get('authorization'));
  const url=new URL(request.url),origin=request.headers.get('origin');
  if(origin&&origin!==url.origin)throw new CmsGatewayError(403,'Cross-origin CMS writes are not allowed.');
  if(request.method!=='POST'||url.search)throw new CmsGatewayError(400,'Send a release manifest without query parameters.');
  const parsed=releaseManifestSchema.safeParse(await readBoundedJson(request));
  if(!parsed.success)throw new CmsGatewayError(422,'Select one to fifty distinct records with their saved revisions and a release request identity.');
  const manifest=parsed.data;
  const response=await call(token,operation==='cancel'?'cancel_release':'publish_release',{p_site:manifest.site,p_request:manifest.request,p_items:manifest.items});
  let result;
  try{result=operation==='cancel'?parseReleaseCancellation(response,manifest):parseReleaseReceipt(response,manifest);}catch{throw new CmsGatewayError(503,'Release confirmation is unavailable. Keep this exact manifest and request identity to recover the result.');}
  return Response.json({site:manifest.site,result,deliveryStatus:'unverified'},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
