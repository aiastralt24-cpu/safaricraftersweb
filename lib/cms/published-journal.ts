import {z} from 'zod';
import {journalArticleSchema} from './journal.ts';
const uuid=z.string().uuid();
// Research provenance is editor-only. The database reader must omit it, along
// with any future internal fields, before returning an anonymous response.
export const publicJournalContentSchema=journalArticleSchema.omit({sources:true});
const envelope=z.object({recordId:uuid,revisionId:uuid,type:z.literal('journalArticle'),path:z.string(),locale:z.literal('en'),payload:publicJournalContentSchema}).strict();
/** Accept only the dedicated published reader's output. Parsing does not confer
 * publication authority or replace its current media-rights checks. */
export function projectPublishedJournal(input:unknown,path:string,locale='en'){
 const page=envelope.parse(input),d=page.payload;
 if(locale!=='en'||page.locale!==locale||page.path!==path||path!==`/journal/${d.slug}`)throw Error('Published article route or language mismatch.');
 for(const field of ['author','date','category','description'] as const)if(!d[field].trim())throw Error('Published article is incomplete.');
 if(!d.image||!d.body.some(block=>((block.kind==='paragraph'||block.kind==='quote')&&Boolean(block.text.trim()))||(block.kind==='list'&&block.items.some(item=>item.trim()))))throw Error('Published article content is incomplete.');
 if(d.cta.enabled&&!d.cta.heading.trim())throw Error('Published article call to action is incomplete.');
 return {recordId:page.recordId,revisionId:page.revisionId,path:page.path,locale:page.locale,content:d};
}
export type PublishedJournal=ReturnType<typeof projectPublishedJournal>;
