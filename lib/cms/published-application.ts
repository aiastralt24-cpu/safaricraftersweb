import {z} from 'zod';
import {applicationSchema,applicationPath,applicationDraftFindings} from './applications.ts';
/** Strict visitor boundary: private fields must never reach the browser. */
export const publicApplicationContentSchema=applicationSchema.omit({relationships:true,internalNotes:true,claims:true});
const card=z.object({type:z.enum(['application','project','journalArticle','document']),title:z.string().trim().min(1).max(200),href:z.string().max(2048)}).strict().superRefine((value,ctx)=>{
 const valid=value.type==='document'?/^\/api\/documents\/download\?record=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}&revision=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value.href):value.type==='application'?/^\/(?:applications|industries)\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.href):new RegExp(`^/${value.type==='project'?'projects':value.type==='journalArticle'?'journal':'destinations'}/[a-z0-9]+(?:-[a-z0-9]+)*$`).test(value.href);
 if(!valid)ctx.addIssue({code:'custom',path:['href'],message:'Invalid related content route.'});
});
const envelope=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),type:z.literal('application'),path:z.string(),locale:z.literal('en'),payload:publicApplicationContentSchema,related:z.array(card).max(150).refine(rows=>new Set(rows.map(r=>r.href)).size===rows.length,'Duplicate related content.')}).strict();
export function projectPublishedApplication(input:unknown,path:string,locale='en'){
 const value=envelope.parse(input),d=value.payload;
 if(locale!=='en'||value.locale!==locale||value.path!==path||path!==applicationPath(d.slug,d.kind))throw Error('Published application identity mismatch.');
 if(value.related.some(item=>item.href===path))throw Error('Application cannot relate to itself.');
 const findings=applicationDraftFindings({...d,internalNotes:'',claims:[],relationships:{applications:[],products:[],projects:[],articles:[],documents:[]}});
 if(findings.some(f=>f.severity==='error'))throw Error('Published application is incomplete.');
 return {recordId:value.recordId,revisionId:value.revisionId,path:value.path,locale:value.locale,content:d,related:value.related};
}
export type PublishedApplication=ReturnType<typeof projectPublishedApplication>;
