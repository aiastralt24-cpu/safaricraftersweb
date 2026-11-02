import {z} from 'zod';
import {formSchema,formFieldSchema} from './forms.ts';
const uuid=z.string().uuid();
export const publicFormSchema=z.object({formId:uuid,revisionId:uuid,locale:z.string(),title:z.string(),fields:z.array(formFieldSchema),submitLabel:z.string(),uploads:z.object({site:uuid}).strict().optional(),challenge:z.object({provider:z.literal('turnstile'),siteKey:z.string(),action:z.literal('cms_enquiry')}).strict()}).strict();
export type PublicForm=z.infer<typeof publicFormSchema>;
export function projectPublicForm(value:unknown,site:string,form:string,siteKey:string):PublicForm|null{
 const stored=z.object({websiteId:uuid,formId:uuid,revisionId:uuid,locale:z.string(),definition:formSchema}).strict().safeParse(value);
 if(!stored.success||stored.data.websiteId!==site||stored.data.formId!==form||!siteKey||siteKey.length>200)return null;
 const input=stored.data;
 // Public file-form activation stays fenced until processing readiness and
 // attachment lifecycle controls are verified for the deployment.
 if(input.definition.fields.some(field=>field.type==='file'))return null;
 return {formId:input.formId,revisionId:input.revisionId,locale:input.locale,title:input.definition.title,fields:input.definition.fields,submitLabel:input.definition.submitLabel,challenge:{provider:'turnstile',siteKey,action:'cms_enquiry'}};
}
export type PublicFormConfig={site:string;siteKey:string;read:(site:string,form:string)=>Promise<unknown>};
export async function handlePublicFormRead(request:Request,id:string,config:PublicFormConfig|null){
 const headers={'Cache-Control':'private, no-store, max-age=0','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
 const fail=(status:number)=>Response.json({error:'This form is unavailable.'},{status,headers});
 if(!config||!uuid.safeParse(config.site).success||!config.siteKey)return fail(503);
 if(request.method!=='GET'||new URL(request.url).search||!uuid.safeParse(id).success)return fail(400);
 try{const form=projectPublicForm(await config.read(config.site,id),config.site,id,config.siteKey);return form?Response.json({form},{headers}):fail(404);}catch{return fail(503);}
}

export type ExpectedPublicForm={revisionId:string;locale:string};
/** A page may pin the published form it resolved. A later form revision must not
 * silently replace that page's expected field set. */
export function parseExpectedPublicForm(input:unknown,formId:string,expected?:ExpectedPublicForm){
 const form=publicFormSchema.parse(input);uuid.parse(formId);
 if(form.formId!==formId)throw Error('Public form identity mismatch.');
 if(expected){uuid.parse(expected.revisionId);if(form.revisionId!==expected.revisionId||form.locale!==expected.locale)throw Error('The page form revision has changed.');}
 return form;
}
