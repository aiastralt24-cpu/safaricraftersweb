import test from 'node:test';
import assert from 'node:assert/strict';
import {newGlobalSettings} from '../lib/cms/global-settings.ts';
import {readPublishedSettings,settingsReader} from '../lib/cms/public-settings.ts';
const site='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
const row=()=>({websiteId:site,recordId:site,revisionId:other,locale:'en',payload:newGlobalSettings()});
test('published settings validate complete public contract and exact site/language identity',async()=>{
 assert.deepEqual(await readPublishedSettings(site,'en',async()=>row()),row());assert.equal(await readPublishedSettings(site,'en',async()=>null),null);
 for(const data of [{...row(),websiteId:other},{...row(),locale:'fr'},{...row(),privateNote:'hidden'},{...row(),payload:{...row().payload,internal:'hidden'}},{...row(),payload:{...row().payload,header:{...row().payload.header,variant:'unsupported'}}}])await assert.rejects(readPublishedSettings(site,'en',async()=>data));
 await assert.rejects(readPublishedSettings(site,'invalid_locale',async()=>assert.fail('invalid read')));
});
test('published settings transport binds public credentials and refuses other websites',async()=>{
 let calls=0;const env={CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://db.test',CMS_SUPABASE_ANON_KEY:'anon'};
 const read=settingsReader(env,async(url,options)=>{calls++;assert.match(String(url),/get_public_settings$/);assert.equal(options.headers.Authorization,'Bearer anon');assert.deepEqual(JSON.parse(options.body),{p_site:site,p_locale:'en'});return Response.json(row());});assert.ok(await readPublishedSettings(site,'en',read));assert.throws(()=>read(other,'en'));assert.equal(calls,1);assert.throws(()=>settingsReader({}));
 await assert.rejects(readPublishedSettings(site,'en',async()=>{throw Error('offline');}),/offline/);
});
test('footer rollout is offline by default, selects public fields and refuses missing publication',async()=>{
 const {readFooterSettings}=await import('../lib/cms/footer-settings.ts');assert.equal(await readFooterSettings({},async()=>assert.fail('disabled network')),undefined);
 const env={CMS_FOOTER_DELIVERY_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://db.test',CMS_SUPABASE_ANON_KEY:'anon'};
 await assert.rejects(readFooterSettings(env,async()=>Response.json(null)),/unavailable/);const settings=await readFooterSettings(env,async()=>Response.json(row()));assert.deepEqual(Object.keys(settings),['brand','contact','footer','social']);assert.equal(settings.brand.name,'Safari Crafters');
});
test('message rollout is offline by default and only exposes published message fields',async()=>{
 const {readMessageSettings}=await import('../lib/cms/message-settings.ts');
 assert.equal(await readMessageSettings({},async()=>assert.fail('disabled network')),undefined);
 const env={CMS_MESSAGES_DELIVERY_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://db.test',CMS_SUPABASE_ANON_KEY:'anon'};
 await assert.rejects(readMessageSettings(env,async()=>Response.json(null)),/unavailable/);
 await assert.rejects(readMessageSettings(env,async()=>Response.json({...row(),websiteId:other})));
 const data=row();data.payload.announcement={enabled:true,title:'Travel update',body:'New dates',button:{label:'Read more',href:'/contact',newWindow:false}};
 data.payload.stickyCta={enabled:true,button:{label:'Talk to us',href:'/contact',newWindow:false}};
 assert.deepEqual(await readMessageSettings(env,async()=>Response.json(data)),{announcement:data.payload.announcement,stickyCta:data.payload.stickyCta});
});
test('cookie copy reads only a valid published settings snapshot when opted in',async()=>{
 const {readCookieSettings}=await import('../lib/cms/cookie-settings.ts');assert.equal(await readCookieSettings({},async()=>assert.fail('network')),undefined);
 const env={CMS_COOKIE_SETTINGS_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://db.test',CMS_SUPABASE_ANON_KEY:'anon'};
 assert.deepEqual(await readCookieSettings(env,async()=>Response.json(row())),row().payload.cookies);
 await assert.rejects(readCookieSettings(env,async()=>Response.json(null)),/unavailable/);
 await assert.rejects(readCookieSettings(env,async()=>Response.json({...row(),websiteId:other})));
});
