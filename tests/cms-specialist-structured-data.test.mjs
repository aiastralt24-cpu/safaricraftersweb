import test from 'node:test';
import assert from 'node:assert/strict';
import {publishedSpecialistStructuredData} from '../lib/cms/specialist-structured-data.ts';
import {projectPublishedSpecialist} from '../lib/cms/public-specialists.ts';
import {newSpecialist} from '../lib/cms/specialists.ts';
const id='00000000-0000-4000-8000-000000000001';
const profile=projectPublishedSpecialist({websiteId:id,recordId:id,revisionId:id,locale:'en',payload:{...newSpecialist(),name:'Guide <&>',visible:true,role:'Naturalist',expertise:'Forests',bio:'Field biography',planning:{label:'Plan with us',enquiryName:'Guide'},image:{assetId:'portrait',alt:'Guide',decorative:false}},references:[]},id,id);
test('specialist structured data uses stable profile identity and published media only',()=>{
 const result=publishedSpecialistStructuredData(profile,'https://example.test');
 assert.equal(result['@type'],'Person');assert.equal(result.name,'Guide <&>');
 assert.equal(result['@id'],`https://example.test/specialists#specialist-${id}`);
 assert.equal(result.image,'https://example.test/api/cms/published/media/portrait');
 assert.deepEqual(result.worksFor,{'@id':'https://example.test/#organization'});
 assert.equal(publishedSpecialistStructuredData({...profile,payload:{...profile.payload,name:'Renamed'}},'https://example.test')['@id'],result['@id']);
 assert.equal('planning' in result,false);assert.equal('references' in result,false);
});
test('specialist teams do not generate false Person entities regardless of name',()=>{
 assert.equal(publishedSpecialistStructuredData({...profile,payload:{...profile.payload,kind:'team'}},'https://example.test'),null);
 assert.equal(publishedSpecialistStructuredData({...profile,payload:{...profile.payload,name:'Safari Crafters Field Team'}},'https://example.test')['@type'],'Person');
});
