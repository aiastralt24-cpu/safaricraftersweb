import {productCategoryRevisionQuery,verifiedProductCategoryRevision} from './product-category-revision.ts';
import type {EditorRpc} from './editor-api.ts';
import {bearerToken,cmsConnection,cmsRpc,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
export async function handleProductCategoryRevision(request:Request,call:EditorRpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{
 const token=bearerToken(request.headers.get('authorization')),params=new URL(request.url).searchParams;
 if([...params.keys()].some(key=>params.getAll(key).length!==1))throw new CmsGatewayError(400,'Use one value per category revision parameter.');
 const parsed=productCategoryRevisionQuery.safeParse(Object.fromEntries(params));if(!parsed.success)throw new CmsGatewayError(400,'Choose a saved category revision.');const q=parsed.data;
 const raw=await call(token,'get_product_category_revision',{p_site:q.site,p_record:q.record,p_revision:q.revision});if(!raw)throw new CmsGatewayError(404,'Category revision is unavailable.');
 return Response.json({category:verifiedProductCategoryRevision(raw,q)},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
