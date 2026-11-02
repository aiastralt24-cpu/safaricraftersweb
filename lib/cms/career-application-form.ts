import {z} from 'zod';
import {projectPublishedCareer} from './published-career.ts';
import {projectPublicForm} from './public-form.ts';
import {careerWindowState} from './career-display.ts';
const uuid=z.string().uuid();
const query=z.object({revision:uuid,form:uuid,formRevision:uuid}).strict();
type RequestIdentity={site:string;record:string;revision:string;form:string;formRevision:string};
export type CareerApplicationFormConfig={site:string;siteKey:string;read:(identity:RequestIdentity)=>Promise<unknown>;now?:()=>number};
/** The service response may contain private configuration; only the projected form leaves this handler. */
export async function handleCareerApplicationForm(request:Request,id:string,config:CareerApplicationFormConfig|null){
 const headers={'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
 const fail=(status:number)=>Response.json({error:'This application form is unavailable. Reload the job page.'},{status,headers});
 if(!config||!uuid.safeParse(config.site).success||!config.siteKey)return fail(503);
 const params=new URL(request.url).searchParams;
 if(request.method!=='GET'||!uuid.safeParse(id).success||[...params.keys()].some(key=>params.getAll(key).length!==1))return fail(400);
 const parsed=query.safeParse(Object.fromEntries(params));if(!parsed.success)return fail(400);const q=parsed.data;
 try{
  const raw=await config.read({site:config.site,record:id,...q});if(raw===null)return fail(404);
  const envelope=z.object({career:z.unknown(),form:z.unknown()}).strict().parse(raw);
  const path=z.object({path:z.string()}).passthrough().parse(envelope.career).path;
  const career=projectPublishedCareer(envelope.career,path);
  if(career.recordId!==id||career.revisionId!==q.revision||career.applicationForm?.formId!==q.form||career.applicationForm?.revisionId!==q.formRevision||careerWindowState(career.content,(config.now??Date.now)())!=='open')return fail(404);
  const form=projectPublicForm(envelope.form,config.site,q.form,config.siteKey);
  if(!form||form.revisionId!==q.formRevision||form.locale!=='en')return fail(404);
  return Response.json({form,career:{recordId:id,revisionId:career.revisionId,slug:career.content.slug}},{headers});
 }catch{return fail(503);}
}
