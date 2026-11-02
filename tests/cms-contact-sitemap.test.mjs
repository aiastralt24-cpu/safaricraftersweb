import test from 'node:test';import assert from 'node:assert/strict';
import {contactSitemapItems} from '../lib/cms/contact-sitemap.ts';
import {projectContactPage,contactPageMetadata} from '../lib/cms/contact-page.ts';
import {planContactMigration,contactMigrationDependencies} from '../lib/cms/contact-migration.ts';
const origin='https://safaricrafters.com',id='00000000-0000-4000-8000-000000000001';
const payload=()=>{const value=planContactMigration(contactMigrationDependencies).previewPayload;value.composition.sections[1].data.form={recordId:id};value.seo.canonical=`${origin}/contact`;return value;};
const source=()=>({page:projectContactPage({recordId:id,revisionId:id,type:'page',payload:payload()},{locale:'en',now:new Date('2026-10-23')}),seoDefaults:{titleTemplate:'%s | Brand',description:'Default',indexing:'index'}});
test('contact sitemap includes only published indexable canonical pages without invented modification dates',()=>{
 assert.deepEqual(contactSitemapItems(source(),origin),[{url:`${origin}/contact`}]);assert.deepEqual(contactSitemapItems(null,origin),[]);
 for(const patch of [{indexing:'noindex'},{sitemap:'exclude'},{canonical:`${origin}/another-page`},{canonical:'https://another.example/contact'}]){const value=source();Object.assign(value.page.seo,patch);assert.deepEqual(contactSitemapItems(value,origin),[]);}
 const value=source();value.seoDefaults.indexing='noindex';value.page.seo.indexing='index';value.page.seo.sitemap='include';assert.deepEqual(contactSitemapItems(value,origin),[]);assert.equal(contactPageMetadata(value.page,value.seoDefaults,origin).robots.index,false);
});
