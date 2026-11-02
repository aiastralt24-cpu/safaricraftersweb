import test from 'node:test';import assert from 'node:assert/strict';
import {newLocation} from '../lib/cms/locations.ts';
import {publishedLocationMetadata,usesCmsLocation} from '../lib/cms/location-route.ts';
const profile={path:'/locations/example',content:{...newLocation(),title:'Example office',summary:'Public office summary',slug:'example'}};
test('location metadata respects editorial overrides and inherited indexing without private content',()=>{
 const m=publishedLocationMetadata(profile);assert.equal(m.title,'Example office');assert.equal(m.description,'Public office summary');assert.equal(m.openGraph.type,'website');assert.equal(m.alternates.canonical,profile.path);assert.equal('internalNotes' in m,false);
 assert.equal(publishedLocationMetadata(profile,{titleTemplate:'%s | Example',description:'Default',indexing:'noindex'}).robots.index,false);
 const override=publishedLocationMetadata({...profile,content:{...profile.content,seo:{...profile.content.seo,title:'Override',canonical:'https://example.test/person',indexing:'noindex',following:'nofollow'}}});assert.equal(override.title,'Override');assert.equal(override.alternates.canonical,'https://example.test/person');assert.deepEqual(override.robots,{index:false,follow:false});
 assert.equal(usesCmsLocation({CMS_LOCATION_DELIVERY_ENABLED:'true'}),false);assert.equal(usesCmsLocation({CMS_LOCATION_DELIVERY_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true'}),true);
});
