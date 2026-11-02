import test from 'node:test';
import assert from 'node:assert/strict';
import {newGlobalSettings} from '../lib/cms/global-settings.ts';
import {readErrorMessage} from '../lib/cms/error-settings.ts';
const site='00000000-0000-4000-8000-000000000001';
const env={CMS_ERROR_SETTINGS_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://db.test',CMS_SUPABASE_ANON_KEY:'anon'};
const row=()=>({websiteId:site,recordId:site,revisionId:site,locale:'en',payload:newGlobalSettings()});
test('recovery copy requires enabled published content and uses no draft or invalid fallback',async()=>{
 assert.equal(await readErrorMessage('notFound',{},async()=>assert.fail('network')),undefined);
 const value=row();value.payload.errors.notFound={enabled:true,title:'No trail here',body:'Choose another route.',button:{label:'Browse journeys',href:'/journeys',newWindow:false}};
 assert.deepEqual(await readErrorMessage('notFound',env,async(_url,options)=>{assert.ok(options.signal);return Response.json(value);}),value.payload.errors.notFound);
 assert.equal(await readErrorMessage('serverError',env,async()=>Response.json(value)),undefined);
 for(const bad of [null,{...value,locale:'fr'},{...value,websiteId:'00000000-0000-4000-8000-000000000002'}])assert.equal(await readErrorMessage('notFound',env,async()=>Response.json(bad)),undefined);
 value.payload.errors.notFound.body=' ';assert.equal(await readErrorMessage('notFound',env,async()=>Response.json(value)),undefined);
 assert.equal(await readErrorMessage('notFound',env,async()=>{throw Error('offline');}),undefined);
 assert.equal(await readErrorMessage('notFound',{CMS_ERROR_SETTINGS_ENABLED:'true'},async()=>assert.fail('network')),undefined);
});
test('recovery read passes a bounded abort signal and falls back on timeout',async()=>{
 const started=Date.now();let timer;
 try{timer=setTimeout(()=>{},3000);assert.equal(await readErrorMessage('notFound',env,(_url,options)=>new Promise((_resolve,reject)=>{options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true});})),undefined);assert.ok(Date.now()-started<2800);}finally{clearTimeout(timer);}
});
