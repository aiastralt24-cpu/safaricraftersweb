import test from 'node:test';
import assert from 'node:assert/strict';
import {handlePublicSpecialistDirectory,parseSpecialistDirectoryResponse,publicSpecialistDirectoryConfig} from '../lib/cms/specialist-directory-runtime.ts';
import {newSpecialist} from '../lib/cms/specialists.ts';
const site='00000000-0000-4000-8000-000000000001',id='00000000-0000-4000-8000-000000000002';
const profile={websiteId:site,recordId:id,revisionId:id,locale:'en',payload:{...newSpecialist(),visible:true,role:'Guide',bio:'Biography',expertise:'Forests',planning:{label:'Plan with guide',enquiryName:'Guide & team'},image:{assetId:'portrait',alt:'Guide',decorative:false}},references:[]};
const request=(query=`site=${site}`,method='GET')=>new Request(`https://example.test/api/cms/published/specialists?${query}`,{method});
test('directory endpoint returns validated published envelopes without trusting derived links',async()=>{
 const config={site,read:async()=>({websiteId:site,locale:'en',items:[profile],nextCursor:null})};
 const result=await handlePublicSpecialistDirectory(request(),config);assert.equal(result.status,200);assert.match(result.headers.get('cache-control'),/no-store/);
 const body=await result.json();assert.equal('planningHref' in body.items[0],false);
 const parsed=parseSpecialistDirectoryResponse(body,site,'en');assert.equal(parsed[0].planningHref,'/plan?specialist=Guide%20%26%20team');
 assert.throws(()=>parseSpecialistDirectoryResponse({...body,websiteId:id},site,'en'));
 assert.throws(()=>parseSpecialistDirectoryResponse({...body,items:[profile,profile]},site,'en'));
 assert.throws(()=>parseSpecialistDirectoryResponse({...body,items:[{...profile,planningHref:'https://bad.test'}]},site,'en'));
 assert.throws(()=>parseSpecialistDirectoryResponse({...body,items:[{...profile,payload:{...profile.payload,visible:false}}]},site,'en'));
});
test('directory endpoint separates empty results, bad requests, foreign websites and unavailable delivery',async()=>{
 let calls=0;const config={site,read:async()=>{calls++;return {websiteId:site,locale:'en',items:[],nextCursor:null};}};
 for(const query of [`site=${site}&site=${site}`,`site=${site}&locale=fr`,`site=${site}&draft=true`,'site=invalid',''])assert.equal((await handlePublicSpecialistDirectory(request(query),config)).status,400);
 assert.equal((await handlePublicSpecialistDirectory(request(`site=${id}`),config)).status,404);
 assert.equal((await handlePublicSpecialistDirectory(request(undefined,'POST'),config)).status,405);assert.equal(calls,0);
 assert.equal((await handlePublicSpecialistDirectory(request(),null)).status,503);assert.equal(publicSpecialistDirectoryConfig({}),null);
 const empty=await handlePublicSpecialistDirectory(request(),config);assert.equal(empty.status,200);assert.deepEqual(parseSpecialistDirectoryResponse(await empty.json(),site,'en'),[]);
 const failure=await handlePublicSpecialistDirectory(request(),{site,read:async()=>{throw Error('Private upstream detail');}});assert.equal(failure.status,503);assert.doesNotMatch(await failure.text(),/Private upstream/);
 const malformed=await handlePublicSpecialistDirectory(request(),{site,read:async()=>({websiteId:id,locale:'en',items:[],nextCursor:null})});assert.equal(malformed.status,503);
});
