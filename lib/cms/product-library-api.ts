import type {EditorRpc} from './editor-api.ts';
import {bearerToken,cmsConnection,cmsRpc,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
import {productLibraryQuery,verifiedProductLibrary} from './product-library.ts';
export {productLibraryQuery,verifiedProductLibrary} from './product-library.ts';
export async function handleProductLibrary(request:Request,type:'product'|'productCategory',call:EditorRpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{const token=bearerToken(request.headers.get('authorization')),params=new URL(request.url).searchParams;
 if([...params.keys()].some(key=>params.getAll(key).length!==1))throw new CmsGatewayError(400,'Use one value for each filter.');
 const parsed=productLibraryQuery.safeParse(Object.fromEntries(params));if(!parsed.success)throw new CmsGatewayError(400,'Check the product filters.');const q=parsed.data;
 const raw=await call(token,'search_product_library',{p_site:q.site,p_type:type,p_search:q.search,p_status:q.status,p_owned:q.owned==='mine',p_after:q.after??null,p_limit:q.limit});
 return Response.json(verifiedProductLibrary(raw,type,q.limit,q.after),{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
