import test from 'node:test';
import assert from 'node:assert/strict';
import {destinationDiscoveryItems,destinationSearchItems,destinationSitemapItems} from '../lib/cms/destination-discovery.ts';
const legacy=slug=>({slug,title:`Legacy ${slug}`,path:`/destinations/${slug}`,country:'India',modifiedAt:'2026-07-01T00:00:00Z',canonical:'',indexing:'inherit',sitemap:'inherit'});
const row=(n,slug)=>({...legacy(slug),title:`Published ${slug}`,recordId:`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`,revisionId:'20000000-0000-4000-8000-000000000001',description:'Forest guide',continent:'India',region:'Central India',bestMonths:'Winter',image:{assetId:'forest',alt:'Forest',decorative:false}});
test('destination discovery keeps legacy mode offline and replaces individual records without fallback',async()=>{
 const old=[legacy('india'),legacy('kanha')];let called=false;
 assert.deepEqual(await destinationDiscoveryItems(old,['india'],false,async()=>{called=true;throw Error('offline');}),old);assert.equal(called,false);
 const items=await destinationDiscoveryItems(old,['india'],true,async()=>[row(1,'india'),row(2,'new-forest')]);
 assert.deepEqual(items.map(item=>item.title),['Legacy india','Published new-forest']);assert.equal(items.some(item=>item.slug==='kanha'),false);
 assert.deepEqual(destinationSearchItems(items),[{title:'Legacy india',href:'/destinations/india',type:'Destination',detail:'India'},{title:'Published new-forest',href:'/destinations/new-forest',type:'Destination',detail:'India'}]);
 assert.deepEqual(await destinationDiscoveryItems(old,['india'],true,async()=>[]),[legacy('india')]);
 await assert.rejects(destinationDiscoveryItems(old,['india'],true,async()=>{throw Error('offline');}),/offline/);
});
test('destination sitemap exclusion and noindex override explicit inclusion without removing internal search entries',()=>{
 const items=[legacy('normal'),{...legacy('hidden'),indexing:'noindex',sitemap:'include'},{...legacy('excluded'),sitemap:'exclude'},{...legacy('included'),sitemap:'include'}];
 const result=destinationSitemapItems(items,'https://example.test');
 assert.deepEqual(result.map(item=>item.url),['https://example.test/destinations/normal','https://example.test/destinations/included']);
 assert.equal(result[0].lastModified.toISOString(),'2026-07-01T00:00:00.000Z');assert.equal(destinationSearchItems(items).length,4);
});
test('destination discovery preserves published canonicals through sitemap projection',async()=>{
 const values=[{...row(1,'forest'),canonical:'https://site.test/destinations/forest'},
 {...row(2,'duplicate'),canonical:'https://site.test/destinations/forest',sitemap:'include'},
 {...row(3,'external'),canonical:'https://external.test/original'}];
 const items=await destinationDiscoveryItems([legacy('india')],['india'],true,async()=>values);
 assert.deepEqual(destinationSitemapItems(items,'https://site.test').map(v=>v.url),['https://site.test/destinations/india','https://site.test/destinations/forest']);
 assert.equal(destinationSearchItems(items).length,4);
 assert.throws(()=>destinationSitemapItems(items,'https://user:password@site.test'));
});
