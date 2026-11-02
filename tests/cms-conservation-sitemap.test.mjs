import test from 'node:test';import assert from 'node:assert/strict';
import {conservationSitemapItems} from '../lib/cms/conservation-sitemap.ts';
import {projectConservationPage,conservationPageMetadata} from '../lib/cms/conservation-page.ts';
import {planConservationMigration,conservationMigrationDependencies} from '../lib/cms/conservation-migration.ts';
const origin='https://safaricrafters.com',id='00000000-0000-4000-8000-000000000001';
const source=()=>({page:projectConservationPage({recordId:id,revisionId:id,type:'page',payload:planConservationMigration(conservationMigrationDependencies).previewPayload},{locale:'en',now:new Date('2026-10-23')}),seoDefaults:{titleTemplate:'%s | Brand',description:'Default',indexing:'index'}});
test('conservation sitemap includes only published indexable canonical pages without invented modification dates',()=>{
 assert.deepEqual(conservationSitemapItems(source(),origin),[{url:`${origin}/conservation-commitment`}]);assert.deepEqual(conservationSitemapItems(null,origin),[]);
 for(const patch of [{indexing:'noindex'},{sitemap:'exclude'},{canonical:`${origin}/another-page`},{canonical:'https://another.example/conservation-commitment'}]){const value=source();Object.assign(value.page.seo,patch);assert.deepEqual(conservationSitemapItems(value,origin),[]);}
 const value=source();value.seoDefaults.indexing='noindex';value.page.seo.indexing='index';value.page.seo.sitemap='include';assert.deepEqual(conservationSitemapItems(value,origin),[]);assert.equal(conservationPageMetadata(value.page,value.seoDefaults,origin).robots.index,false);
});
