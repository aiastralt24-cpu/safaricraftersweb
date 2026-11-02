import {z} from 'zod';
import {planTestimonialMigration,sourceDigest} from './testimonial-migration.ts';
import {testimonialSchema} from './testimonials.ts';
import {readBoundedJson} from './editor-api.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const uuid=z.string().uuid();
const command=z.object({action:z.enum(['review','apply']),site:uuid,locale:z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/),source:z.array(z.record(z.string(),z.unknown())).min(1).max(100),mappings:z.record(z.string(),z.unknown()).default({}),requestKey:uuid.optional(),reviewDigest:z.string().regex(/^[a-f0-9]{64}$/).optional()}).strict();
type Rpc=(token:string,name:string,args:Record<string,unknown>)=>Promise<unknown>;
export async function handleTestimonialMigration(request:Request,call:Rpc=(token,name,args)=>cmsRpc(cmsConnection(),token,name,args)){
 try{
  const token=bearerToken(request.headers.get('authorization'));const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS writes are not allowed.');
  const c=command.parse(await readBoundedJson(request));
  const plan=planTestimonialMigration(c.source,c.mappings);
  const manifest=plan.candidates.map(item=>({sourceKey:`testimonial_${item.sourceDigest}`,source:item.source,payload:item.canSaveDraft?testimonialSchema.parse(item.payload):item.payload,locale:c.locale}));
  const digest=sourceDigest({site:c.site,sourceDigest:plan.sourceDigest,manifest});
  if(c.action==='review')return Response.json({plan,reviewDigest:digest},{headers:privateHeaders});
  if(!c.requestKey||c.reviewDigest!==digest)throw new CmsGatewayError(409,'Review this exact source and mapping before applying.');
  if(plan.unusedMappings.length||plan.readyDrafts!==plan.count)throw new CmsGatewayError(422,'Resolve migration errors and unused mappings before applying.');
  const result=await call(token,'apply_testimonial_migration',{p_site:c.site,p_request:c.requestKey,p_source:plan.sourceDigest,p_review:digest,p_items:manifest});
  return Response.json({result},{headers:privateHeaders});
 }catch(error){if(error instanceof z.ZodError)return Response.json({error:'Check the migration source and mappings.'},{status:422,headers:privateHeaders});return cmsErrorResponse(error);}
}
