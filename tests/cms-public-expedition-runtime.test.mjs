import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readPublishedExpedition,publicExpeditionConfig,handlePublishedExpedition} from '../lib/cms/public-expedition-runtime.ts';
import {newPhotoExpedition} from '../lib/cms/photo-expeditions.ts';
const site=randomUUID(),record=randomUUID(),revision=randomUUID(),form=randomUUID(),image={assetId:'forest',alt:'Forest',decorative:false};
const value={page:{websiteId:site,recordId:record,revisionId:revision,type:'photoExpedition',locale:'en',payload:{...newPhotoExpedition(),slug:'forest',title:'Forest',category:'Photography',skill:'All',groupSize:'Six',duration:'Five days',description:'Forest',intro:'Explore',mentor:'Mentor',heroTitle:'Forest',heroCopy:'Morning',price:'INR 1,20,000 + tax',image,heroImage:image,enquiry:{...newPhotoExpedition().enquiry,form:{recordId:form}}}},references:{specialists:[],form:{websiteId:site,recordId:form,publishedRevisionId:revision,type:'form',locale:'en'}}};
const request=(query='',method='GET')=>new Request(`https://site.test/api/cms/published/expeditions/forest${query}`,{method});
test('expedition transport requires both rollout flags and confines requests to configured site and route',async()=>{
 const env={CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_EXPEDITION_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://cms.test',CMS_SUPABASE_ANON_KEY:'public-key'};let calls=0;
 const fetcher=async(url,options)=>{calls++;assert.equal(String(url),'https://cms.test/rest/v1/rpc/get_public_expedition');assert.deepEqual(JSON.parse(options.body),{p_site:site,p_path:'/photo-expeditions/forest',p_locale:'en'});return Response.json(value);};
 for(const key of Object.keys(env))assert.equal(publicExpeditionConfig({...env,[key]:undefined},fetcher),null);
 const config=publicExpeditionConfig(env,fetcher);const result=await readPublishedExpedition('forest',config,'en','2028-02-29');assert.equal(result.recordId,record);assert.equal(result.content.price,'INR 1,20,000 + tax');assert.equal(calls,1);
 for(const [target,path,locale] of [[randomUUID(),'/photo-expeditions/forest','en'],[site,'/photo-expeditions/../secret','en'],[site,'/photo-expeditions/forest','fr']])await assert.rejects(config.read(target,path,locale));assert.equal(calls,1);
});
test('expedition public handler distinguishes missing and invalid delivery without leaking errors',async()=>{
 const config={site,read:async()=>value};const good=await handlePublishedExpedition(request(),'forest',config,'2028-02-29');assert.equal(good.status,200);assert.match(good.headers.get('cache-control'),/no-store/);assert.equal((await good.json()).expedition.today,'2028-02-29');
 assert.equal((await handlePublishedExpedition(request(),'forest',{site,read:async()=>null})).status,404);
 for(const read of [async()=>{throw Error('private database details');},async()=>({...value,page:{...value.page,websiteId:randomUUID()}}),async()=>({...value,references:{}})]){const response=await handlePublishedExpedition(request(),'forest',{site,read});assert.equal(response.status,503);assert.deepEqual(await response.json(),{error:'Published expedition is unavailable.'});}
 assert.equal((await handlePublishedExpedition(request(),'forest',null)).status,503);
});
test('expedition public handler rejects unsupported queries and methods before calling storage',async()=>{
 let calls=0;const config={site,read:async()=>{calls++;return value;}};
 for(const query of ['?locale=fr','?locale=en&locale=en','?draft=true','?today=2028-02-29'])assert.equal((await handlePublishedExpedition(request(query),'forest',config)).status,400);
 for(const slug of ['../secret','Forest','a'.repeat(101)])assert.equal((await handlePublishedExpedition(request(),slug,config)).status,400);
 assert.equal((await handlePublishedExpedition(request('','POST'),'forest',config)).status,405);assert.equal(calls,0);
});
