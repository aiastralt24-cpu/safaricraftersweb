import test from 'node:test';
import assert from 'node:assert/strict';
import {rootSeoMetadata,websiteIndexingHeaders} from '../lib/cms/root-seo-metadata.ts';
import {newGlobalSettings} from '../lib/cms/global-settings.ts';
const base={title:{default:'Website',template:'%s | Old'},description:'Old description',metadataBase:new URL('https://example.test'),alternates:{canonical:'/'},openGraph:{type:'website',siteName:'Website',title:'Website',images:[{url:'/old.jpg'}]},twitter:{card:'summary',title:'Website'},robots:{follow:false}};
test('root SEO applies shared defaults while retaining site identity and canonical configuration',()=>{
 const defaults={...newGlobalSettings().seo,titleTemplate:'%s | New',description:'Shared description',socialImage:{assetId:'social',alt:'Landscape',decorative:false}};
 const result=rootSeoMetadata(base,defaults);assert.deepEqual(result.title,{default:'Website',template:'%s | New'});assert.equal(result.description,'Shared description');assert.equal(result.metadataBase,base.metadataBase);assert.deepEqual(result.alternates,base.alternates);assert.equal(result.openGraph.siteName,'Website');assert.equal(result.openGraph.type,'website');assert.equal(result.openGraph.description,'Shared description');assert.deepEqual(result.openGraph.images,[{url:'/api/cms/published/media/social',alt:'Landscape'}]);assert.equal(result.twitter.description,'Shared description');assert.deepEqual(result.robots,{follow:false});assert.equal(base.description,'Old description');
 const empty=rootSeoMetadata(base,newGlobalSettings().seo);assert.deepEqual(empty.openGraph.images,[]);
});
test('website noindex is expressed in metadata and HTTP headers without enabling indexing elsewhere',()=>{
 const defaults={...newGlobalSettings().seo,indexing:'noindex'};assert.deepEqual(rootSeoMetadata(base,defaults).robots,{follow:false,index:false});assert.deepEqual(websiteIndexingHeaders(defaults),{'X-Robots-Tag':'noindex'});assert.deepEqual(websiteIndexingHeaders(undefined),{});assert.deepEqual(websiteIndexingHeaders(newGlobalSettings().seo),{});
});
