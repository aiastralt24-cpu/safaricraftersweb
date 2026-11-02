import test from 'node:test';
import assert from 'node:assert/strict';
import {newPageSeo} from '../lib/cms/page-seo.ts';
import {newGlobalSettings} from '../lib/cms/global-settings.ts';
import {resolvedSeoMetadata} from '../lib/cms/seo-metadata.ts';
import {readSeoDefaults} from '../lib/cms/seo-settings.ts';
import {publishedJournalMetadata} from '../lib/cms/journal-route.ts';
import {publishedDestinationMetadata} from '../lib/cms/destination-route.ts';
const context={origin:'https://example.test',path:'/journal/forest',title:'Forest'};
test('metadata uses absolute titles, website fallback and canonical public image URLs',()=>{
 const defaults={...newGlobalSettings().seo,titleTemplate:'%s — Field Notes',description:'Website description',socialImage:{assetId:'forest',alt:'Forest canopy',decorative:false}};
 const metadata=resolvedSeoMetadata(newPageSeo(),defaults,context);
 assert.deepEqual(metadata.title,{absolute:'Forest — Field Notes'});assert.equal(metadata.description,'Website description');assert.equal(metadata.alternates.canonical,'https://example.test/journal/forest');assert.deepEqual(metadata.robots,{index:true,follow:true});assert.deepEqual(metadata.openGraph.images,[{url:'https://example.test/api/cms/published/media/forest',alt:'Forest canopy'}]);
 const seo={...newPageSeo(),title:'Custom',description:'Custom description',canonical:'https://other.test/original',indexing:'index',following:'nofollow',socialTitle:'Social',socialImage:{assetId:'page',alt:'',decorative:true}};
 const override=resolvedSeoMetadata(seo,{...defaults,indexing:'noindex'},context);assert.deepEqual(override.title,{absolute:'Custom'});assert.equal(override.description,'Custom description');assert.equal(override.robots.index,false);assert.equal(override.robots.follow,false);assert.equal(override.openGraph.url,seo.canonical);assert.equal(override.openGraph.title,'Social');assert.equal(override.openGraph.images[0].alt,'');assert.equal(override.openGraph.images[0].url,'https://example.test/api/cms/published/media/page');
});
test('published destination and journal consumers apply defaults and retain article metadata',()=>{
 const defaults={...newGlobalSettings().seo,description:'Shared',indexing:'noindex'};
 const content={title:'Forest',slug:'forest',description:'Editorial',seo:newPageSeo(),date:'2026-10-22',author:'Editor'};
 const article=publishedJournalMetadata({content,path:'/journal/forest'},defaults,context.origin);
 assert.equal(article.description,'Shared');assert.equal(article.openGraph.type,'article');assert.equal(article.openGraph.publishedTime,content.date);assert.deepEqual(article.openGraph.authors,['Editor']);assert.equal(article.robots.index,false);
 const destination=publishedDestinationMetadata({content},defaults,context.origin);assert.equal(destination.alternates.canonical,'https://example.test/destinations/forest');assert.equal(destination.robots.index,false);
});
test('SEO defaults rollout requires exact published identity and is offline when disabled',async()=>{
 assert.equal(await readSeoDefaults({},async()=>assert.fail('network')),undefined);
 const site='00000000-0000-4000-8000-000000000001',env={CMS_SEO_SETTINGS_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://db.test',CMS_SUPABASE_ANON_KEY:'anon'};
 const row={websiteId:site,recordId:site,revisionId:site,locale:'en',seo:newGlobalSettings().seo};
 assert.deepEqual(await readSeoDefaults(env,async(url)=>{assert.match(String(url),/get_public_seo_settings$/);return Response.json(row);}),row.seo);
 await assert.rejects(readSeoDefaults(env,async()=>Response.json(null)),/unavailable/);
 await assert.rejects(readSeoDefaults(env,async()=>Response.json({...row,locale:'fr'})));
});
