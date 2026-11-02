import {z} from 'zod';
import {newsSchema,newsPath} from './news.ts';
/** Reject private fields at the boundary; never silently strip them in a browser. */
export const publicNewsContentSchema=newsSchema.omit({relationships:true,internalNotes:true});
const card=z.object({type:z.enum(['page','project','journalArticle','destination','document']),title:z.string().trim().min(1).max(200),href:z.string().max(2048)}).strict().superRefine((value,ctx)=>{
 const valid=value.type==='document'?/^\/api\/documents\/download\?record=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}&revision=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value.href):value.type==='page'?/^\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(value.href):new RegExp(`^/${value.type==='project'?'projects':value.type==='journalArticle'?'journal':'destinations'}/[a-z0-9]+(?:-[a-z0-9]+)*$`).test(value.href);
 if(!valid)ctx.addIssue({code:'custom',path:['href'],message:'Invalid related content route.'});
});
const envelope=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),type:z.literal('news'),path:z.string(),locale:z.literal('en'),payload:publicNewsContentSchema,related:z.array(card).max(150).refine(rows=>new Set(rows.map(r=>r.href)).size===rows.length,'Duplicate related content.')}).strict();
export function projectPublishedNews(input:unknown,path:string,locale='en'){
 const value=envelope.parse(input),d=value.payload;
 if(value.related.some(item=>item.href===path))throw Error('News cannot relate to itself.');
 if(locale!=='en'||value.locale!==locale||value.path!==path||path!==newsPath(d.slug))throw Error('Published news identity mismatch.');
 if(!d.summary.trim()||!d.author.trim()||!d.topic.trim()||!d.date||d.kind==='pressRelease'&&!d.dateline.trim()||!d.body.some(b=>b.kind==='paragraph'||b.kind==='quote'?Boolean(b.text.trim()):b.kind==='list'?b.items.some(i=>Boolean(i.trim())):b.kind==='table'?b.rows.some(row=>row.some(cell=>Boolean(cell.trim()))):false))throw Error('Published news is incomplete.');
 return {recordId:value.recordId,revisionId:value.revisionId,path:value.path,locale:value.locale,content:d,related:value.related};
}
export type PublishedNews=ReturnType<typeof projectPublishedNews>;
