import {projectLibraryQuery,verifiedProjectLibrary} from './project-library.ts';
import type {EditorRpc} from './editor-api.ts';
import {bearerToken,cmsConnection,cmsRpc,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
export async function handleProjectLibrary(request:Request,call:EditorRpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{const token=bearerToken(request.headers.get('authorization')),params=new URL(request.url).searchParams;
 if([...params.keys()].some(key=>params.getAll(key).length!==1))throw new CmsGatewayError(400,'Use one value for each project filter.');const parsed=projectLibraryQuery.safeParse(Object.fromEntries(params));if(!parsed.success)throw new CmsGatewayError(400,'Check the project filters.');const q=parsed.data;
 const result=await call(token,'search_project_library',{p_site:q.site,p_search:q.search,p_status:q.status,p_owned:q.owned==='mine',p_publication:q.publication,p_after:q.after??null,p_limit:q.limit});
 return Response.json(verifiedProjectLibrary(result,q.limit,q.after),{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
