import test from 'node:test';import assert from 'node:assert/strict';
import {newPartner} from '../lib/cms/partners.ts';
import {publishedPartnerMetadata,usesCmsPartner} from '../lib/cms/partner-route.ts';
const profile={path:'/partners/example',content:{...newPartner(),title:'Example office',summary:'Public office summary',slug:'example'}};
test('partner metadata respects editorial overrides and inherited indexing without private content',()=>{
 const m=publishedPartnerMetadata(profile);assert.equal(m.title,'Example office');assert.equal(m.description,'Public office summary');assert.equal(m.openGraph.type,'website');assert.equal(m.alternates.canonical,profile.path);assert.equal('internalNotes' in m,false);
 assert.equal(publishedPartnerMetadata(profile,{titleTemplate:'%s | Example',description:'Default',indexing:'noindex'}).robots.index,false);
 const override=publishedPartnerMetadata({...profile,content:{...profile.content,seo:{...profile.content.seo,title:'Override',canonical:'https://example.test/person',indexing:'noindex',following:'nofollow'}}});assert.equal(override.title,'Override');assert.equal(override.alternates.canonical,'https://example.test/person');assert.deepEqual(override.robots,{index:false,follow:false});
 assert.equal(usesCmsPartner({CMS_PARTNER_DELIVERY_ENABLED:'true'}),false);assert.equal(usesCmsPartner({CMS_PARTNER_DELIVERY_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true'}),true);
});
