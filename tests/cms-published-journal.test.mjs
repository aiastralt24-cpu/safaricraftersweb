import test from 'node:test';
import assert from 'node:assert/strict';
import {newJournalArticle} from '../lib/cms/journal.ts';
import {projectPublishedJournal} from '../lib/cms/published-journal.ts';
import {publicJournalConfig,readPublishedJournal,handlePublishedJournal} from '../lib/cms/public-journal-runtime.ts';
const site='00000000-0000-4000-8000-000000000001',record='00000000-0000-4000-8000-000000000002',revision='00000000-0000-4000-8000-000000000003';
function fixture(){const {sources,...payload}=newJournalArticle();return {recordId:record,revisionId:revision,type:'journalArticle',path:'/journal/new-article',locale:'en',payload:{...payload,author:'Field guide',category:'Wildlife',date:'2026-10-22',description:'Forest notes',image:{assetId:'forest',alt:'Forest',decorative:false},body:[{id:'p',kind:'paragraph',text:'A forest walk.'}]}};}
test('journal publication projection preserves approved content and revision identity without provenance',()=>{
 const page=fixture(),article=projectPublishedJournal(page,page.path);assert.deepEqual(article.content,page.payload);assert.equal(article.revisionId,revision);assert.equal('sources' in article.content,false);
 for(const changed of [{...page,type:'destination'},{...page,locale:'fr'},{...page,path:'/journal/wrong'},{...page,payload:{...page.payload,sources:[]}},{...page,internal:'secret'},{...page,payload:{...page.payload,date:''}},{...page,payload:{...page.payload,image:undefined}},{...page,payload:{...page.payload,body:[{id:'p',kind:'paragraph',text:'  '}]}},{...page,payload:{...page.payload,cta:{...page.payload.cta,heading:' '}}}])assert.throws(()=>projectPublishedJournal(changed,page.path));
 assert.throws(()=>projectPublishedJournal(page,'/journal/wrong'));assert.throws(()=>projectPublishedJournal(page,page.path,'fr'));
});
test('journal delivery requires two explicit flags and uses only fixed anonymous RPC authority',async()=>{
 const env={CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_JOURNAL_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://database.test',CMS_SUPABASE_ANON_KEY:'public-key',CMS_SUPABASE_SERVICE_ROLE_KEY:'never-use'};let call;
 const config=publicJournalConfig(env,async(url,options)=>{call={url:String(url),options};return Response.json(fixture());});
 const article=await readPublishedJournal('new-article',config);assert.equal(article.revisionId,revision);assert.equal(call.url,'https://database.test/rest/v1/rpc/get_public_journal_article');assert.equal(call.options.headers.Authorization,'Bearer public-key');assert.deepEqual(JSON.parse(call.options.body),{p_site:site,p_path:'/journal/new-article',p_locale:'en'});assert.equal(call.options.redirect,'error');
 for(const patch of [{CMS_PUBLIC_DELIVERY_ENABLED:'false'},{CMS_JOURNAL_DELIVERY_ENABLED:undefined},{CMS_SUPABASE_ANON_KEY:''},{CMS_WEBSITE_ID:''}])assert.equal(publicJournalConfig({...env,...patch}),null);
 let calls=0;for(const slug of ['../bad','Uppercase','a'.repeat(101),''])assert.equal(await readPublishedJournal(slug,{site,read:async()=>{calls++;}}),null);assert.equal(calls,0);
});
test('public journal response distinguishes absence and service failure and rejects caller overrides',async()=>{
 const req=(query='',method='GET')=>new Request(`https://site.test/api/cms/published/journal/new-article${query}`,{method});
 const config={site,read:async()=>fixture()};assert.equal((await handlePublishedJournal(req(),'new-article',config)).status,200);
 for(const query of ['?site='+site,'?locale=en&locale=en','?locale=fr','?revision='+revision])assert.equal((await handlePublishedJournal(req(query),'new-article',config)).status,400);
 assert.equal((await handlePublishedJournal(req('','POST'),'new-article',config)).status,405);
 assert.equal((await handlePublishedJournal(req(),'new-article',null)).status,503);
 assert.equal((await handlePublishedJournal(req(),'new-article',{site,read:async()=>null})).status,404);
 for(const read of [async()=>({draft:true}),async()=>{throw Error('private database details');}]){const response=await handlePublishedJournal(req(),'new-article',{site,read});assert.equal(response.status,503);assert.match(response.headers.get('cache-control'),/no-store/);assert.equal((await response.text()).includes('private database'),false);}
});
