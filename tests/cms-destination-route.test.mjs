import test from 'node:test';
import assert from 'node:assert/strict';
import {usesCmsDestination,publishedDestinationMetadata} from '../lib/cms/destination-route.ts';
import {newDestination} from '../lib/cms/destinations.ts';
test('destination rollout preserves reserved country and atlas routes and requires explicit enablement',()=>{
 const reserved=['india','uganda','rwanda','uganda-rwanda'];
 for(const value of [undefined,'false','1','TRUE'])assert.equal(usesCmsDestination('kanha',reserved,{CMS_DESTINATION_RENDERING_ENABLED:value}),false);
 const env={CMS_DESTINATION_RENDERING_ENABLED:'true'};
 assert.equal(usesCmsDestination('kanha',reserved,env),true);
 assert.equal(usesCmsDestination('new-cms-destination',reserved,env),true);
 for(const slug of reserved)assert.equal(usesCmsDestination(slug,reserved,env),false);
});
test('published destination metadata uses saved SEO and approved image identifiers',()=>{
 const content={...newDestination(),slug:'kanha',title:'Kanha',description:'Forest guide',heroImage:{assetId:'hero',alt:'Forest',decorative:false}};
 const destination={content,journeys:[],expeditions:[],pairings:[]};
 let result=publishedDestinationMetadata(destination);
 assert.equal(result.title,'Kanha');assert.equal(result.alternates.canonical,'/destinations/kanha');assert.deepEqual(result.robots,{});
 assert.equal(result.openGraph.images[0].url,'/api/cms/published/media/hero');
 content.seo={...content.seo,title:'Explore Kanha',description:'Plan your visit',canonical:'https://example.test/kanha',indexing:'noindex',following:'nofollow',socialTitle:'Social title',socialDescription:'Social copy',socialImage:{assetId:'social',alt:'Social forest',decorative:false}};
 result=publishedDestinationMetadata(destination);
 assert.equal(result.title,'Explore Kanha');assert.equal(result.description,'Plan your visit');assert.deepEqual(result.robots,{index:false,follow:false});
 assert.equal(result.alternates.canonical,'https://example.test/kanha');assert.equal(result.openGraph.title,'Social title');assert.equal(result.twitter.description,'Social copy');assert.equal(result.openGraph.images[0].url,'/api/cms/published/media/social');
});

test('reserved destination URLs cover current country data, atlas routes and aliases',async()=>{
 const {readFile}=await import('node:fs/promises');const {reservedDestinationSlugs}=await import('../lib/cms/destination-route-ownership.ts');
 const content=JSON.parse(await readFile(new URL('../content/site-content.json',import.meta.url),'utf8'));
 const expected=[...new Set([...content.destinations.map(item=>item.country.toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')),'india','africa','americas','arctic-beyond','uganda','rwanda','uganda-rwanda','brazil'])].sort();
 assert.deepEqual([...reservedDestinationSlugs],expected);
 const {validateDestinationDraft}=await import('../lib/cms/destinations.ts');
 for(const slug of expected)assert.ok(validateDestinationDraft({path:`/destinations/${slug}`,payload:{...newDestination(),slug}}).findings.some(f=>f.code==='destination_reserved_route'));
 assert.equal(validateDestinationDraft({path:'/destinations/kanha',payload:{...newDestination(),slug:'kanha'}}).findings.some(f=>f.code==='destination_reserved_route'),false);
});
