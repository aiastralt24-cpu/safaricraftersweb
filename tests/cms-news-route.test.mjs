import test from 'node:test';import assert from 'node:assert/strict';
import {newNews} from '../lib/cms/news.ts';
import {publishedNewsMetadata,publishedNewsStructuredData,usesCmsNews} from '../lib/cms/news-route.ts';
const news={path:'/news/example',content:{...newNews(),title:'Example news',summary:'Public summary',author:'Example author',date:'2026-10-29',slug:'example'}};
test('news metadata preserves editorial date, author and indexing controls without private data',()=>{
 const metadata=publishedNewsMetadata(news);assert.equal(metadata.title,'Example news');assert.equal(metadata.description,'Public summary');assert.equal(metadata.openGraph.type,'article');assert.equal(metadata.openGraph.publishedTime,'2026-10-29');assert.deepEqual(metadata.openGraph.authors,['Example author']);
 const defaults={titleTemplate:'%s | Example',description:'Default',indexing:'noindex'};assert.equal(publishedNewsMetadata(news,defaults).robots.index,false);
 const ld=publishedNewsStructuredData(news,'https://example.test');assert.equal(ld['@type'],'NewsArticle');assert.equal(ld.mainEntityOfPage,'https://example.test/news/example');assert.equal(ld.datePublished,'2026-10-29');assert.equal('internalNotes' in ld,false);assert.equal('image' in ld,false);
 assert.equal(usesCmsNews({CMS_NEWS_DELIVERY_ENABLED:'true'}),false);assert.equal(usesCmsNews({CMS_NEWS_DELIVERY_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true'}),true);
});
