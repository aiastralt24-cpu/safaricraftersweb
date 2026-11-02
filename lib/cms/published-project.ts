import {z} from 'zod';
import {projectSchema,projectPath} from './projects.ts';
// Public input is a strict allowlist. Internal claims, evidence and ownership must
// already have been removed by the published reader, not stripped in the browser.
export const publicProjectContentSchema=projectSchema.omit({claims:true,relationships:true});
const card=z.object({type:z.enum(['project','destination','document']),title:z.string().trim().min(1).max(200),href:z.string().max(2048)}).strict().superRefine((value,context)=>{const valid=value.type==='document'?/^\/api\/documents\/download\?record=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}&revision=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value.href):new RegExp(`^/${value.type==='project'?'projects':'destinations'}/[a-z0-9]+(?:-[a-z0-9]+)*$`).test(value.href);if(!valid)context.addIssue({code:'custom',path:['href'],message:'Invalid related content route.'});});
const envelope=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),type:z.literal('project'),path:z.string(),locale:z.literal('en'),payload:publicProjectContentSchema,related:z.array(card).max(90).refine(rows=>new Set(rows.map(r=>r.href)).size===rows.length,'Duplicate related content.')}).strict();
export function projectPublishedProject(input:unknown,path:string,locale='en'){
 const value=envelope.parse(input),d=value.payload;
 if(value.related.some(item=>item.href===path))throw Error('Published project cannot relate to itself.');
 if(locale!=='en'||value.locale!==locale||value.path!==path||path!==projectPath(d.slug))throw Error('Published project identity mismatch.');
 if(!d.summary.trim()||!d.image||![...d.body,...d.challenge,...d.approach,...d.outcomes].some(b=>b.kind==='paragraph'||b.kind==='quote'?Boolean(b.text.trim()):b.kind==='list'?b.items.some(i=>Boolean(i.trim())):b.kind==='table'?b.rows.some(row=>row.some(cell=>Boolean(cell.trim()))):false))throw Error('Published project is incomplete.');
 return {recordId:value.recordId,revisionId:value.revisionId,path:value.path,locale:value.locale,content:d,related:value.related};
}
export type PublishedProject=ReturnType<typeof projectPublishedProject>;
