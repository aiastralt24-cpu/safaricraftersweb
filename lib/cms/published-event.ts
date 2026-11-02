import {z} from 'zod';
import {eventSchema,eventPath,eventDraftFindings} from './events.ts';
/** Strict visitor boundary: private fields must never reach the browser. */
export const publicEventContentSchema=eventSchema.omit({relationships:true,internalNotes:true});
const card=z.object({type:z.enum(['page','project','journalArticle','destination','document']),title:z.string().trim().min(1).max(200),href:z.string().max(2048)}).strict().superRefine((value,ctx)=>{
 const valid=value.type==='document'?/^\/api\/documents\/download\?record=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}&revision=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value.href):value.type==='page'?/^\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(value.href):new RegExp(`^/${value.type==='project'?'projects':value.type==='journalArticle'?'journal':'destinations'}/[a-z0-9]+(?:-[a-z0-9]+)*$`).test(value.href);
 if(!valid)ctx.addIssue({code:'custom',path:['href'],message:'Invalid related content route.'});
});
const envelope=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),type:z.literal('event'),path:z.string(),locale:z.literal('en'),payload:publicEventContentSchema,related:z.array(card).max(150).refine(rows=>new Set(rows.map(r=>r.href)).size===rows.length,'Duplicate related content.')}).strict();
export function projectPublishedEvent(input:unknown,path:string,locale='en'){
 const value=envelope.parse(input),d=value.payload;
 if(locale!=='en'||value.locale!==locale||value.path!==path||path!==eventPath(d.slug))throw Error('Published event identity mismatch.');
 if(value.related.some(item=>item.href===path))throw Error('Event cannot relate to itself.');
 const findings=eventDraftFindings({...d,internalNotes:'',relationships:{pages:[],projects:[],articles:[],destinations:[],documents:[]}});
 if(findings.some(f=>f.severity==='error'))throw Error('Published event is incomplete.');
 return {recordId:value.recordId,revisionId:value.revisionId,path:value.path,locale:value.locale,content:d,related:value.related};
}
export type PublishedEvent=ReturnType<typeof projectPublishedEvent>;
