import {z} from 'zod';
import {careerSchema,careerPath,careerDraftFindings} from './careers.ts';
/** Visitor projection excludes internal notes and raw relationship collections. */
export const publicCareerContentSchema=z.object(careerSchema.shape).strict().omit({relationships:true,internalNotes:true});
const uuid=z.string().uuid();
const card=z.object({type:z.enum(['location','page','document']),recordId:uuid,title:z.string().trim().min(1).max(200),href:z.string().max(2048)}).strict().superRefine((v,ctx)=>{
 const valid=v.type==='location'?/^\/locations\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v.href):v.type==='document'?new RegExp(`^/api/documents/download\\?record=${v.recordId}&revision=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`).test(v.href):/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/.test(v.href)&&!/^\/(?:api|cms|admin|auth|login|logout|studio)(?:\/|$)/.test(v.href);
 if(!valid)ctx.addIssue({code:'custom',path:['href'],message:'Invalid related content route.'});
});
const envelope=z.object({recordId:uuid,revisionId:uuid,type:z.literal('career'),path:z.string(),locale:z.literal('en'),payload:publicCareerContentSchema,applicationForm:z.object({formId:uuid,revisionId:uuid}).strict().nullable(),related:z.array(card).max(90).refine(rows=>new Set(rows.map(r=>r.href)).size===rows.length&&new Set(rows.map(r=>r.recordId)).size===rows.length,'Duplicate related content.')}).strict();
export function projectPublishedCareer(input:unknown,path:string,locale='en'){
 const value=envelope.parse(input),d=value.payload;
 if(locale!=='en'||value.path!==path||path!==careerPath(d.slug)||value.related.some(r=>r.href===path||r.recordId===value.recordId))throw Error('Published career identity mismatch.');
 if(d.application.mode==='form'?!value.applicationForm||value.applicationForm.formId!==d.application.formId:value.applicationForm!==null)throw Error('Published career application identity mismatch.');
 const relationships={locations:value.related.filter(r=>r.type==='location').map(r=>({recordId:r.recordId})),documents:value.related.filter(r=>r.type==='document').map(r=>({recordId:r.recordId})),pages:value.related.filter(r=>r.type==='page').map(r=>({recordId:r.recordId}))};
 if(careerDraftFindings({...d,relationships,internalNotes:''}).some(f=>f.severity==='error'))throw Error('Published career is incomplete.');
 return {recordId:value.recordId,revisionId:value.revisionId,path:value.path,locale:value.locale,content:d,related:value.related,applicationForm:value.applicationForm};
}
export type PublishedCareer=ReturnType<typeof projectPublishedCareer>;
