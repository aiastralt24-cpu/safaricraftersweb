import test from 'node:test';
import assert from 'node:assert/strict';
import {newJournalArticle} from '../lib/cms/journal.ts';
import {projectPublishedJournal} from '../lib/cms/published-journal.ts';
import {usesCmsJournal,publishedJournalMetadata,publishedJournalStructuredData} from '../lib/cms/journal-route.ts';
const uuid='00000000-0000-4000-8000-000000000001';
function fixture(){const {sources,...d}=newJournalArticle();return projectPublishedJournal({recordId:uuid,revisionId:uuid,type:'journalArticle',path:'/journal/new-article',locale:'en',payload:{...d,author:'Field guide',category:'Wildlife',date:'2026-10-22',description:'Forest notes',image:{assetId:'forest',alt:'Forest',decorative:false},body:[{id:'p',kind:'paragraph',text:'Field notes'}]}},'/journal/new-article');}
test('journal metadata preserves explicit SEO overrides and private delivery image paths',()=>{
 const article=fixture();let metadata=publishedJournalMetadata(article);assert.equal(metadata.title,'New article');assert.equal(metadata.alternates.canonical,'/journal/new-article');assert.deepEqual(metadata.robots,{});assert.equal(metadata.openGraph.images[0].url,'/api/cms/published/media/forest');assert.equal(metadata.openGraph.publishedTime,'2026-10-22');
 article.content.seo={...article.content.seo,title:'Search title',description:'Search description',canonical:'https://example.test/canonical',socialTitle:'Social title',socialDescription:'Social description',indexing:'noindex',following:'nofollow',socialImage:{assetId:'social',alt:'Retained caption',decorative:true}};
 metadata=publishedJournalMetadata(article);assert.equal(metadata.title,'Search title');assert.equal(metadata.description,'Search description');assert.equal(metadata.alternates.canonical,'https://example.test/canonical');assert.deepEqual(metadata.robots,{index:false,follow:false});assert.equal(metadata.openGraph.title,'Social title');assert.equal(metadata.twitter.description,'Social description');assert.deepEqual(metadata.openGraph.images,[{url:'/api/cms/published/media/social',alt:''}]);
});
test('journal structured data uses actual editorial fields without inferring publication timestamps',()=>{
 const data=publishedJournalStructuredData(fixture(),'https://site.test');assert.equal(data['@type'],'Article');assert.equal(data.datePublished,'2026-10-22');assert.deepEqual(data.author,{'@type':'Person',name:'Field guide'});assert.equal(data.mainEntityOfPage,'https://site.test/journal/new-article');assert.equal(data.image,'https://site.test/api/cms/published/media/forest');assert.equal('dateModified' in data,false);
});
test('journal rendering is explicitly opt-in and does not silently revert when backend configuration is absent',()=>{
 assert.equal(usesCmsJournal({}),false);assert.equal(usesCmsJournal({CMS_JOURNAL_DELIVERY_ENABLED:'false'}),false);assert.equal(usesCmsJournal({CMS_JOURNAL_DELIVERY_ENABLED:'true'}),true);
});
