import test from 'node:test';import assert from 'node:assert/strict';
import {conceptSitemapItems} from '../lib/cms/concept-sitemap.ts';
import {projectConceptPage,conceptPageMetadata} from '../lib/cms/concept-page.ts';
import {planConceptMigration} from '../lib/cms/concept-migration.ts';
import {conceptMigrationDependencies} from '../lib/cms/concept-migration-review.ts';
import {makeConceptMigrationFixture,site,revision} from './fixtures/cms-concept-migration.mjs';
import {usesCmsConcept,readPublishedConcept} from '../lib/cms/published-concept.ts';
const origin='https://safaricrafters.com';
function source(){const payload=structuredClone(planConceptMigration(conceptMigrationDependencies,makeConceptMigrationFixture().mappings).previewPayload);payload.seo.canonical=origin+'/concept';return {content:{page:projectConceptPage({recordId:site,revisionId:revision,type:'page',payload},{locale:'en',now:new Date('2026-10-23')}),journeys:[],departures:[],guests:[]},seoDefaults:{titleTemplate:'%s | Brand',description:'Default',indexing:'index'}};}
test('Concept sitemap includes only eligible published canonical content without synthetic dates',()=>{
 assert.deepEqual(conceptSitemapItems(source(),origin),[{url:origin+'/concept'}]);
 for(const absent of [undefined,null])assert.deepEqual(conceptSitemapItems(absent,origin),[]);
 for(const patch of [{indexing:'noindex'},{sitemap:'exclude'},{canonical:origin+'/'},{canonical:'https://elsewhere.example/concept'}]){const value=source();Object.assign(value.content.page.seo,patch);assert.deepEqual(conceptSitemapItems(value,origin),[]);}
 const value=source();value.seoDefaults.indexing='noindex';value.content.page.seo.indexing='index';value.content.page.seo.sitemap='include';assert.deepEqual(conceptSitemapItems(value,origin),[]);assert.equal(conceptPageMetadata(value.content.page,value.seoDefaults,origin).robots.index,false);
});
test('Concept route switch is explicit and disabled without making a CMS request',async()=>{
 for(const flag of [undefined,'false','TRUE','1']){const env={CMS_CONCEPT_DELIVERY_ENABLED:flag};assert.equal(usesCmsConcept(env),false);assert.equal(await readPublishedConcept(env,async()=>assert.fail('disabled route must not request CMS')),undefined);}
 assert.equal(usesCmsConcept({CMS_CONCEPT_DELIVERY_ENABLED:'true'}),true);
});
