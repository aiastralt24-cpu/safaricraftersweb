import {validateLocalizedSettings} from './localized-settings-validation.ts';
import {localizedPublicationEvidenceSchema,localizedPublicationFindings} from './localized-publication-validation.ts';
import {downloadReferenceStatusSchema} from './download-reference-validation.ts';
import {isCustomPagePath} from './custom-page-path.ts';
import {documentSchema} from './documents.ts';
import {expeditionReferenceStatusSchema} from './expedition-reference-status.ts';
import {photoExpeditionSchema,validatePhotoExpedition} from './photo-expeditions.ts';
import {specialistReferenceStatusSchema} from './specialist-reference-status.ts';
import {validateSpecialistDraft} from './specialists.ts';
import {settingsReferenceStatusSchema} from './settings-reference-status.ts';
import {specialistSchema} from './specialists.ts';
import {validateSettingsDraft} from './settings-validation.ts';
import {validateNavigationDraft,navigationReferenceStatusSchema} from './navigation-validation.ts';
import {journalArticleSchema} from './journal.ts';
import {destinationSchema,validateDestinationDraft} from './destinations.ts';
import {z} from 'zod';
import {testimonialSchema} from './testimonials.ts';
import {formSchema} from './forms.ts';
import {pageSeoSchema} from './page-seo.ts';
import {navigationSchema} from './navigation.ts';
import {globalSettingsSchema} from './global-settings.ts';
import {compositionCommandSchema,editComposition,validateComposition} from './composition.ts';
import {validateStoredContent} from './content-validation.ts';
import {bearerToken,cmsRpc,cmsConnection,cmsErrorResponse,CmsGatewayError,privateHeaders} from './gateway.ts';
const uuid=z.string().uuid();
const type=z.enum(['page','homepage','destination','journey','photoExpedition','journalArticle','specialist','testimonial','navigation','settings','sharedSection','document','form','product','project']);
const command=z.discriminatedUnion('action',[
  z.object({action:z.literal('cancel_create'),site:uuid,requestKey:uuid,type}).strict(),
  z.object({action:z.literal('compose'),site:uuid,record:uuid,revision:uuid,command:compositionCommandSchema}).strict(),
  z.object({action:z.literal('save'),site:uuid,record:uuid.nullable(),expectedRevision:uuid.nullable(),requestKey:uuid.optional(),type,
    path:z.string().max(500).regex(/^\/[a-z0-9/-]*$/).nullable(),title:z.string().trim().min(1).max(200),
    locale:z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/).default('en'),payload:z.record(z.string(),z.unknown())}).strict(),
  z.object({action:z.enum(['request_validation','validation_status','validate','submit','approve','request_changes','publish','unpublish']),site:uuid,record:uuid,revision:uuid}).strict(),
  z.object({action:z.literal('restore'),site:uuid,record:uuid,revision:uuid,expectedRevision:uuid}).strict(),
  z.object({action:z.literal('preview'),site:uuid,record:uuid,revision:uuid,recipient:uuid,minutes:z.number().int().min(1).max(1440).default(60)}).strict(),
  z.object({action:z.literal('revoke_preview'),preview:uuid}).strict(),
]);
const MAX_BODY=1_100_000;
export async function readBoundedJson(request:Request){
  if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')throw new CmsGatewayError(415,'Send JSON content.');
  if(Number(request.headers.get('content-length'))>MAX_BODY)throw new CmsGatewayError(413,'This draft is too large.');
  const reader=request.body?.getReader();if(!reader)throw new CmsGatewayError(400,'Request body is missing.');
  const chunks:Uint8Array[]=[];let size=0;
  try{
    while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BODY){await reader.cancel();throw new CmsGatewayError(413,'This draft is too large.');}chunks.push(value);}
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new CmsGatewayError(400,'Request body is not valid JSON.');}
}
export type EditorRpc=(token:string,procedure:string,args:Record<string,unknown>)=>Promise<unknown>;
const rpc:EditorRpc=(token,procedure,args)=>cmsRpc(cmsConnection(),token,procedure,args);
export async function handleEditorCommand(request:Request,call:EditorRpc=rpc){
  try{
    const token=bearerToken(request.headers.get('authorization'));
    const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new CmsGatewayError(403,'Cross-origin CMS writes are not allowed.');
    const parsed=command.safeParse(await readBoundedJson(request));
    if(!parsed.success)return Response.json({error:'Check the content fields.',issues:parsed.error.issues.map(issue=>({path:issue.path.join('.'),message:issue.message}))},{status:422,headers:privateHeaders});
    const c=parsed.data;let procedure:string,args:Record<string,unknown>;
    if(c.action==='compose'){
      const stored=z.object({id:uuid,type:z.enum(['page','homepage']),path:z.string().nullable(),locale:z.string(),title:z.string(),currentRevision:uuid,payload:z.record(z.string(),z.unknown())}).passthrough().safeParse(await call(token,'get_editor_record',{p_site:c.site,p_record:c.record}));
      if(!stored.success)throw new CmsGatewayError(422,'Select an existing composed page draft.');
      const record=stored.data;
      if(record.id!==c.record||record.currentRevision!==c.revision)throw new CmsGatewayError(409,'Reload the latest revision before changing sections.');
      let composition;
      try{composition=editComposition(record.payload.composition,c.command);}catch(error){throw new CmsGatewayError(422,error instanceof Error?error.message:'Check the section content.');}
      const result=await call(token,'save_draft',{p_site:c.site,p_record:c.record,p_expected:c.revision,p_type:record.type,p_path:record.path,p_title:record.title,p_locale:record.locale,p_payload:{...record.payload,composition}});
      return Response.json({result},{headers:privateHeaders});
    }
    if(c.action==='validation_status'){
      const result=await call(token,'get_validation',{p_site:c.site,p_record:c.record});
      if(!result||typeof result!=='object'||!('revision' in result))throw new CmsGatewayError(404,'Content is unavailable.');
      if(result.revision!==c.revision)throw new CmsGatewayError(409,'Reload the latest revision before checking validation status.');
      return Response.json({result},{headers:privateHeaders});
    }
    if(c.action==='validate'){
      const stored=z.object({id:uuid,type:z.string(),path:z.string().nullable(),currentRevision:uuid,payload:z.record(z.string(),z.unknown())}).passthrough().safeParse(await call(token,'get_editor_record',{p_site:c.site,p_record:c.record}));
      if(!stored.success)throw new CmsGatewayError(404,'Content is unavailable.');
      if(stored.data.id!==c.record||stored.data.currentRevision!==c.revision)throw new CmsGatewayError(409,'Reload the latest revision before checking content.');
      const media=stored.data.payload.media;
      const statuses=(['page','homepage','destination','journalArticle','settings','specialist','photoExpedition'].includes(stored.data.type)||(Array.isArray(media)&&media.length))?z.array(z.object({assetId:z.string(),available:z.boolean()}).strict()).parse(await call(token,'get_record_media_status',{p_site:c.site,p_record:c.record,p_revision:c.revision})):[];
      if(stored.data.type==='specialist'){
        const references=specialistSchema.safeParse(stored.data.payload).success?specialistReferenceStatusSchema.parse(await call(token,'get_specialist_reference_status',{p_site:c.site,p_record:c.record,p_revision:c.revision})):[];
        return Response.json({result:{revision:c.revision,...validateSpecialistDraft({...stored.data,locale:typeof stored.data.locale==='string'?stored.data.locale:undefined},statuses,references),publicationAuthorized:false}},{headers:privateHeaders});
      }
      if(stored.data.type==='photoExpedition'){
        const raw=await call(token,'get_expedition_reference_status',{p_site:c.site,p_record:c.record,p_revision:c.revision});
        const references=expeditionReferenceStatusSchema.parse(raw??[]);
        return Response.json({result:{revision:c.revision,...validatePhotoExpedition({...stored.data,record:c.record,locale:typeof stored.data.locale==='string'?stored.data.locale:undefined},statuses,references),publicationAuthorized:false}},{headers:privateHeaders});
      }
      if(stored.data.type==='settings'){
        const references=settingsReferenceStatusSchema.parse(await call(token,'get_settings_reference_status',{p_site:c.site,p_record:c.record,p_revision:c.revision}));
        if(typeof stored.data.locale==='string'&&stored.data.locale!=='en'){
          const evidence=await call(token,'get_editor_localized_settings_evidence',{p_site:c.site,p_record:c.record,p_revision:c.revision});
          return Response.json({result:{revision:c.revision,...validateLocalizedSettings({...stored.data,site:c.site,record:c.record,revision:c.revision,locale:stored.data.locale},statuses,references,evidence),publicationAuthorized:false}},{headers:privateHeaders});
        }
        return Response.json({result:{revision:c.revision,...validateSettingsDraft({...stored.data,locale:typeof stored.data.locale==='string'?stored.data.locale:undefined},statuses,references),publicationAuthorized:false}},{headers:privateHeaders});
      }
      if(stored.data.type==='navigation'){
        const references=navigationReferenceStatusSchema.parse(await call(token,'get_navigation_reference_status',{p_site:c.site,p_record:c.record,p_revision:c.revision}));
        return Response.json({result:{revision:c.revision,...validateNavigationDraft({...stored.data,locale:typeof stored.data.locale==='string'?stored.data.locale:undefined},references),publicationAuthorized:false}},{headers:privateHeaders});
      }
      if(stored.data.type==='destination'){
        const destination=destinationSchema.safeParse(stored.data.payload);
        const referenceStatuses=destination.success?(await Promise.all(([['journeys','journey'],['expeditions','photoExpedition'],['pairings','destination']] as const).map(async([field,type])=>{
          const ids=destination.data[field].map(item=>item.recordId);
          if(!ids.length)return [];
          const rows=z.array(z.object({id:uuid,available:z.boolean(),published:z.boolean().optional(),locale:z.string().optional()}).passthrough()).parse(await call(token,'resolve_editor_references',{p_site:c.site,p_type:type,p_records:ids}));
          if(rows.length!==ids.length||rows.some((row,index)=>row.id!==ids[index]))throw new CmsGatewayError(503,'Related content checks returned an invalid response.');
          return rows.map(row=>({recordId:row.id,type,available:row.available,published:row.published,locale:row.locale}));
        }))).flat():[];
        return Response.json({result:{revision:c.revision,...validateDestinationDraft({...stored.data,locale:typeof stored.data.locale==='string'?stored.data.locale:undefined},statuses,referenceStatuses),publicationAuthorized:false}},{headers:privateHeaders});
      }
      if(stored.data.type==='page'&&typeof stored.data.locale==='string'&&stored.data.locale!=='en'&&isCustomPagePath(stored.data.path)){
        const evidence=z.object({localizedEvidence:localizedPublicationEvidenceSchema,downloadStatus:downloadReferenceStatusSchema}).strict().safeParse(await call(token,'get_editor_localized_page_evidence',{p_site:c.site,p_record:c.record,p_revision:c.revision}));
        const record={...stored.data,site:c.site,record:c.record,revision:c.revision,locale:stored.data.locale,downloadStatus:evidence.success?evidence.data.downloadStatus:undefined};
        const result=validateStoredContent(record,statuses);
        const findings=[...result.findings.filter(f=>f.code!=='custom_page_content'),...localizedPublicationFindings(record,evidence.success?evidence.data.localizedEvidence:null)];
        return Response.json({result:{revision:c.revision,...result,findings,contentChecksPass:!findings.some(f=>f.severity==='error'),publicationAuthorized:false}},{headers:privateHeaders});
      }
      return Response.json({result:{revision:c.revision,...validateStoredContent({...stored.data,locale:typeof stored.data.locale==='string'?stored.data.locale:undefined},statuses),publicationAuthorized:false}},{headers:privateHeaders});
    }
    if(c.action==='save'){
      if(c.type==='document'){const document=documentSchema.safeParse(c.payload);if(!document.success||c.path!==null||c.locale!==document.data.language||c.title!==document.data.title)throw new CmsGatewayError(422,'Check the document fields, matching title and language. Documents do not have page URLs.');c.payload=document.data;}
      if(c.type==='homepage'){const composition=validateComposition(c.payload.composition);if(c.path!=='/'||!composition.page||composition.page.title!==c.title)throw new CmsGatewayError(422,'Homepage drafts require the root path, valid composition and matching title.');c.payload={...c.payload,composition:composition.page};}
      if(c.type==='photoExpedition'){const expedition=photoExpeditionSchema.safeParse(c.payload);if(!expedition.success||c.path!==`/photo-expeditions/${expedition.success?expedition.data.slug:''}`||c.title!==expedition.data.title)throw new CmsGatewayError(422,'Check the expedition fields and matching title and URL.');c.payload=expedition.data;}
      if(c.type==='specialist'){const profile=specialistSchema.safeParse(c.payload);if(!profile.success||c.path!==null||c.title!==profile.data.name)throw new CmsGatewayError(422,'Check the specialist fields and matching name; profiles do not have individual page URLs.');c.payload=profile.data;}
      if(c.type==='journalArticle'){const article=journalArticleSchema.safeParse(c.payload);if(!article.success||c.path!==`/journal/${article.success?article.data.slug:''}`||c.title!==article.data.title)throw new CmsGatewayError(422,'Check the article fields and matching article title and URL.');}
      if(c.type==='destination'){const destination=destinationSchema.safeParse(c.payload);if(!destination.success||c.path!==`/destinations/${destination.success?destination.data.slug:''}`)throw new CmsGatewayError(422,'Check the destination fields and matching destination URL.');}
      if(c.type==='testimonial'&&(!testimonialSchema.safeParse(c.payload).success||c.path!==null))throw new CmsGatewayError(422,'Check the testimonial fields; testimonials do not have a page path.');
      if(c.type==='form'&&(!formSchema.safeParse(c.payload).success||c.path!==null))throw new CmsGatewayError(422,'Check the form fields; forms do not have a page path.');
      if(['page','homepage'].includes(c.type)&&c.payload.seo!==undefined&&!pageSeoSchema.safeParse(c.payload.seo).success)throw new CmsGatewayError(422,'Check the page SEO fields.');
      if(c.type==='navigation'&&(!navigationSchema.safeParse(c.payload).success||c.path!==null))throw new CmsGatewayError(422,'Check the navigation items; menus do not have a page path.');
      if(c.type==='settings'&&(!globalSettingsSchema.safeParse(c.payload).success||c.path!==null))throw new CmsGatewayError(422,'Check the global settings fields; settings do not have a page path.');
      if((c.record===null)!==(c.expectedRevision===null))throw new CmsGatewayError(422,'Updates require their current revision; new records must omit it.');
      if(c.requestKey&&c.record!==null)throw new CmsGatewayError(422,'Creation request identities cannot update existing records.');
      if(c.requestKey){procedure='create_draft_once';args={p_site:c.site,p_request:c.requestKey,p_type:c.type,p_path:c.path,p_title:c.title,p_payload:c.payload,p_locale:c.locale};}
      else{procedure='save_draft';args={p_site:c.site,p_record:c.record,p_expected:c.expectedRevision,p_type:c.type,p_path:c.path,p_title:c.title,p_payload:c.payload,p_locale:c.locale};}
    }else if(c.action==='cancel_create'){procedure='cancel_draft_creation';args={p_site:c.site,p_request:c.requestKey,p_type:c.type};
    }else if(c.action==='restore'){procedure='restore_draft';args={p_site:c.site,p_record:c.record,p_revision:c.revision,p_expected:c.expectedRevision};
    }else if(c.action==='preview'){procedure='create_preview';args={p_site:c.site,p_record:c.record,p_revision:c.revision,p_recipient:c.recipient,p_minutes:c.minutes};
    }else if(c.action==='revoke_preview'){procedure='revoke_preview';args={p_id:c.preview};
    }else if(c.action==='request_validation'){procedure='request_validation';args={p_site:c.site,p_record:c.record,p_revision:c.revision};
    }else if(c.action==='publish'){procedure='publish';args={p_site:c.site,p_record:c.record,p_revision:c.revision};
    }else if(c.action==='unpublish'){procedure='unpublish';args={p_site:c.site,p_record:c.record,p_expected_published:c.revision};
    }else{procedure='review';args={p_site:c.site,p_record:c.record,p_revision:c.revision,p_action:c.action};}
    const result=await call(token,procedure,args);return Response.json(((c.action==='save'&&c.requestKey)||c.action==='cancel_create')?{site:c.site,requestKey:c.requestKey,result}:{result},{headers:privateHeaders});
  }catch(error){return cmsErrorResponse(error);}
}
export async function handleEditorRead(request:Request,call:EditorRpc=rpc){
  try{
    const token=bearerToken(request.headers.get('authorization')),query=new URL(request.url).searchParams;
    if(!query.size)return Response.json({sites:await call(token,'list_editor_sites',{})},{headers:privateHeaders});
    const parsed=z.object({site:uuid,record:uuid.optional(),type:type.optional(),after:uuid.optional(),limit:z.coerce.number().int().min(1).max(100).default(50)}).strict().safeParse(Object.fromEntries(query));
    if(!parsed.success)throw new CmsGatewayError(400,'Invalid content query.');
    const q=parsed.data;
    if(q.record){const record=await call(token,'get_editor_record',{p_site:q.site,p_record:q.record});return Response.json(record?{record}:{error:'Content is unavailable.'},{status:record?200:404,headers:privateHeaders});}
    const records=await call(token,'list_editor_records',{p_site:q.site,p_type:q.type??null,p_after:q.after??null,p_limit:q.limit});
    return Response.json({records},{headers:privateHeaders});
  }catch(error){return cmsErrorResponse(error);}
}
