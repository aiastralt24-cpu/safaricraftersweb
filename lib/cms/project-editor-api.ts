import {projectSaveCommand} from './project-commands.ts';
import {projectPath} from './projects.ts';
import {handleEditorCommand,readBoundedJson,type EditorRpc} from './editor-api.ts';
import {bearerToken,cmsConnection,cmsRpc,cmsErrorResponse,CmsGatewayError} from './gateway.ts';
export async function handleProjectSave(request:Request,call:EditorRpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{const token=bearerToken(request.headers.get('authorization')),origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS writes are not allowed.');
 const parsed=projectSaveCommand.safeParse(await readBoundedJson(request));if(!parsed.success)throw new CmsGatewayError(422,'Check the project fields before saving.');const c=parsed.data;
 if(c.record){const stored=await call(token,'get_editor_record',{p_site:c.site,p_record:c.record}) as Record<string,unknown>|null;if(!stored||stored.id!==c.record||stored.type!=='project')throw new CmsGatewayError(404,'Project is unavailable.');if(stored.currentRevision!==c.expectedRevision)throw new CmsGatewayError(409,'This project changed. Your draft is preserved; reload the latest revision before saving.');if(stored.path!==projectPath(c.payload.slug)||stored.locale!==c.locale)throw new CmsGatewayError(422,'Existing project URLs and languages require their dedicated migration workflow.');}
 const headers=new Headers(request.headers);headers.delete('content-length');
 return handleEditorCommand(new Request(request.url,{method:'POST',headers,body:JSON.stringify({...c,type:'project',path:projectPath(c.payload.slug),title:c.payload.title})}),call);
 }catch(error){return cmsErrorResponse(error);}
}
