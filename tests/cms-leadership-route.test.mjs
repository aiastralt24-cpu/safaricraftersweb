import test from 'node:test';import assert from 'node:assert/strict';
import {newLeadership} from '../lib/cms/leadership.ts';
import {publishedLeadershipMetadata,usesCmsLeadership} from '../lib/cms/leadership-route.ts';
const profile={path:'/leadership/example',content:{...newLeadership(),title:'Example person',summary:'Public biography summary',slug:'example'}};
test('leadership metadata respects editorial overrides and inherited indexing without private content',()=>{
 const m=publishedLeadershipMetadata(profile);assert.equal(m.title,'Example person');assert.equal(m.description,'Public biography summary');assert.equal(m.openGraph.type,'website');assert.equal(m.alternates.canonical,profile.path);assert.equal('internalNotes' in m,false);
 assert.equal(publishedLeadershipMetadata(profile,{titleTemplate:'%s | Example',description:'Default',indexing:'noindex'}).robots.index,false);
 const override=publishedLeadershipMetadata({...profile,content:{...profile.content,seo:{...profile.content.seo,title:'Override',canonical:'https://example.test/person',indexing:'noindex',following:'nofollow'}}});assert.equal(override.title,'Override');assert.equal(override.alternates.canonical,'https://example.test/person');assert.deepEqual(override.robots,{index:false,follow:false});
 assert.equal(usesCmsLeadership({CMS_LEADERSHIP_DELIVERY_ENABLED:'true'}),false);assert.equal(usesCmsLeadership({CMS_LEADERSHIP_DELIVERY_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true'}),true);
});
