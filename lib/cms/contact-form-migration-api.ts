import {z} from 'zod';
import {planContactFormMigration} from './contact-form-migration.ts';
import {contactMigrationDependencies} from './contact-migration.ts';
import {sourceDigest} from './testimonial-migration.ts';
import {readBoundedJson} from './editor-api.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const uuid=z.string().uuid(),digest=z.string().regex(/^[a-f0-9]{64}$/),variant=z.enum(['contact','corporate']);
const targets=z.array(z.object({variant,recordId:uuid.nullable(),expectedRevision:uuid.nullable()}).strict()).length(2).refine(items=>items[0].variant==='contact'&&items[1].variant==='corporate'&&items.every(item=>Boolean(item.recordId)===Boolean(item.expectedRevision))&&(!items[0].recordId||items[0].recordId!==items[1].recordId));
const command=z.discriminatedUnion('action',[
 z.object({action:z.literal('review'),site:uuid,targets}).strict(),
 z.object({action:z.literal('apply'),site:uuid,targets,requestKey:uuid,reviewDigest:digest}).strict(),
 z.object({action:z.literal('status'),site:uuid,requestKey:uuid}).strict(),
]);
const result=z.array(z.object({variant,recordId:uuid,revisionId:uuid}).strict()).length(2).refine(items=>items[0].variant==='contact'&&items[1].variant==='corporate'&&items[0].recordId!==items[1].recordId);
const receipt=z.object({requestKey:uuid,sourceDigest:digest,reviewDigest:digest,createdAt:z.string().datetime({offset:true}),result}).strict();
const version='contact-form-migration-review-1';
type Rpc=(token:string,name:string,args:Record<string,unknown>)=>Promise<unknown>;
export async function handleContactFormMigration(request:Request,call:Rpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{
  const token=bearerToken(request.headers.get('authorization')),origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS requests are not allowed.');
  const parsed=command.safeParse(await readBoundedJson(request));if(!parsed.success)throw new CmsGatewayError(422,'Check both enquiry form targets and the review identity.');const c=parsed.data;
  const readReceipt=async()=>{
   if(c.action==='review')return null;
   const raw=await call(token,'get_contact_form_migration_result',{p_site:c.site,p_request:c.requestKey});if(raw===null)return null;
   const saved=receipt.safeParse(raw);if(!saved.success||saved.data.requestKey!==c.requestKey)throw new CmsGatewayError(503,'Form migration receipt is unavailable. Check status before retrying.');return saved.data;
  };
  if(c.action==='status'){const saved=await readReceipt();return Response.json(saved?{status:'complete',...saved}:{status:'unconfirmed',message:'No completed migration is visible. A pending request may still complete.'},{headers:privateHeaders});}
  const plan=planContactFormMigration(contactMigrationDependencies),source=sourceDigest(plan),reviewDigest=sourceDigest({version,site:c.site,targets:c.targets,plan});
  const manifest=c.targets.map((target,index)=>({...target,payload:plan.forms[index].definition}));
  const apply=async()=>{
   if(c.action!=='apply')throw Error('Invalid action');
   const saved=result.safeParse(await call(token,'apply_contact_form_migration',{p_site:c.site,p_request:c.requestKey,p_source:source,p_review:reviewDigest,p_manifest:manifest}));
   if(!saved.success||saved.data.some((item,index)=>(c.targets[index].recordId&&item.recordId!==c.targets[index].recordId)||item.revisionId===c.targets[index].expectedRevision))throw new CmsGatewayError(503,'Form migration result is unavailable. Check status before retrying.');return saved.data;
  };
  if(c.action==='apply'){
   if(c.reviewDigest!==reviewDigest)throw new CmsGatewayError(409,'The form proposal or target changed. Review again.');
   const saved=await readReceipt();if(saved){
    if(saved.sourceDigest!==source||saved.reviewDigest!==reviewDigest)throw new CmsGatewayError(409,'This request belongs to another form migration.');
    const result=await apply();if(sourceDigest(result)!==sourceDigest(saved.result))throw new CmsGatewayError(503,'Form migration recovery returned inconsistent results.');
    return Response.json({requestKey:c.requestKey,sourceDigest:source,reviewDigest,result,replayed:true},{headers:privateHeaders});
   }
  }
  const before=[];
  for(const target of c.targets){
   if(target.recordId){
    const record=z.object({id:uuid,type:z.literal('form'),locale:z.literal('en'),currentRevision:uuid,payload:z.record(z.string(),z.unknown()),permissions:z.object({edit:z.boolean()})}).safeParse(await call(token,'get_editor_record',{p_site:c.site,p_record:target.recordId}));
    if(!record.success||record.data.id!==target.recordId||!record.data.permissions.edit)throw new CmsGatewayError(403,'A selected form is unavailable or cannot be edited.');
    if(record.data.currentRevision!==target.expectedRevision)throw new CmsGatewayError(409,'A selected form changed. Reload it before reviewing.');before.push(record.data.payload);
   }else{if(await call(token,'can',{p_site:c.site,p_action:'create',p_type:'form',p_record:null})!==true)throw new CmsGatewayError(403,'You cannot create enquiry forms for this website.');before.push(null);}
  }
  if(c.action==='review')return Response.json({version,sourceDigest:source,reviewDigest,before,proposal:plan,notice:'Apply saves both forms as drafts atomically. Review field limits, consent and delivery settings. Nothing is published or linked to a page.'},{headers:privateHeaders});
  return Response.json({requestKey:c.requestKey,sourceDigest:source,reviewDigest,result:await apply(),replayed:false},{headers:privateHeaders});
 }catch(error){return cmsErrorResponse(error);}
}
