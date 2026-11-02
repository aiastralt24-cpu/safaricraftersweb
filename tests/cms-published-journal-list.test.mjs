import test from 'node:test';
import assert from 'node:assert/strict';
import {readPublishedJournalList,journalListReader,journalSearchItems,journalSitemapItems} from '../lib/cms/published-journal-list.ts';
const site='00000000-0000-4000-8000-000000000001';
const row=n=>({recordId:`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,revisionId:site,path:`/journal/story-${n}`,modifiedAt:'2026-10-22T00:00:00Z',slug:`story-${n}`,title:`Story ${n}`,description:'Forest notes',category:'Wildlife',author:'Guide',date:'2026-10-22',readTime:'3 min read',image:{assetId:'forest',alt:'Forest',decorative:false},canonical:'',indexing:'inherit',sitemap:'inherit'});
test('journal catalogue follows bounded keyset pages then sorts by editorial date',async()=>{
 const calls=[],batch=Array.from({length:100},(_,i)=>row(i+1));const last={...row(101),date:'2026-10-23'};
 const values=await readPublishedJournalList(async after=>{calls.push(after);return after?[last]:batch;});assert.deepEqual(calls,[null,row(100).recordId]);assert.equal(values.length,101);assert.equal(values[0].recordId,last.recordId);
});
test('journal catalogue rejects duplicate routes, backwards cursors, malformed data and unbounded readers',async()=>{
 for(const values of [[row(2),row(1)],[row(1),{...row(2),path:row(1).path,slug:row(1).slug}],[{...row(1),path:'/journal/wrong'}],[{...row(1),sources:[]}],[{...row(1),date:'invalid'}]])await assert.rejects(readPublishedJournalList(async()=>values));
 let count=0;await assert.rejects(readPublishedJournalList(async()=>Array.from({length:100},()=>row(++count))),/delivery limit/);assert.equal(count,10000);
});
test('journal discovery respects exclusion settings and preserves revision modification times',()=>{
 const items=[row(1),{...row(2),indexing:'noindex'},{...row(3),sitemap:'exclude'}];assert.deepEqual(journalSearchItems(items).map(v=>v.href),['/journal/story-1','/journal/story-3']);const sitemap=journalSitemapItems(items,'https://site.test');assert.equal(sitemap.length,1);assert.equal(sitemap[0].url,'https://site.test/journal/story-1');assert.equal(sitemap[0].lastModified.toISOString(),'2026-10-22T00:00:00.000Z');
});
test('journal catalogue RPC binds website, English and page bounds using anonymous credentials',async()=>{
 const env={CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_JOURNAL_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://database.test',CMS_SUPABASE_ANON_KEY:'public-key'};let call;
 const read=journalListReader(env,async(url,options)=>{call={url:String(url),options};return Response.json([]);});await read(null);assert.equal(call.url,'https://database.test/rest/v1/rpc/list_published_journal');assert.equal(call.options.headers.Authorization,'Bearer public-key');assert.deepEqual(JSON.parse(call.options.body),{p_site:site,p_locale:'en',p_after:null,p_limit:100});assert.throws(()=>journalListReader({...env,CMS_JOURNAL_DELIVERY_ENABLED:'false'}));
});
test('journal sitemap honors canonical identity even when inclusion is explicit',async()=>{
 const items=await readPublishedJournalList(async()=>[
  {...row(1),canonical:'https://site.test/journal/story-1'},
  {...row(2),canonical:'https://other.test/journal/story-2',sitemap:'include'},
  {...row(3),canonical:'https://site.test/journal/different',sitemap:'include'},
  {...row(4),canonical:'https://site.test/journal/story-4?variant=1'},
  {...row(5),canonical:'https://SITE.test:443/journal/story-5'},
 ]);
 assert.deepEqual(journalSitemapItems(items,'https://site.test').map(v=>v.url),['https://site.test/journal/story-1','https://site.test/journal/story-5']);
 for(const canonical of [undefined,'javascript:alert(1)','https://user:pass@site.test/story','https://site.test/story#fragment'])await assert.rejects(readPublishedJournalList(async()=>[{...row(1),canonical}]));
});
