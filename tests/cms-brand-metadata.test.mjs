import test from 'node:test';
import assert from 'node:assert/strict';
import {brandMetadata,publishedOrganizationSchema} from '../lib/cms/brand-metadata.ts';
import {readBrandSettings} from '../lib/cms/brand-settings.ts';
import {newGlobalSettings} from '../lib/cms/global-settings.ts';
test('brand metadata applies configured browser identity without overriding page SEO',()=>{
 const brand={name:'Field Notes',tagline:'Wild journeys',favicon:{assetId:'icon',alt:'Icon',decorative:false}};
 const base={title:{absolute:'Page title'},description:'Page description',openGraph:{title:'Page title',siteName:'Old'},robots:{index:false}};
 const result=brandMetadata(base,brand);assert.equal(result.applicationName,'Field Notes');assert.deepEqual(result.title,base.title);assert.deepEqual(result.robots,base.robots);assert.equal(result.openGraph.siteName,'Field Notes');assert.deepEqual(result.icons,{icon:[{url:'/api/cms/published/media/icon',type:'image/webp'}]});assert.deepEqual(brandMetadata(base,{name:'New',tagline:''}).icons,{icon:[]});assert.equal(base.openGraph.siteName,'Old');
});
test('structured identity uses published names, contact, logo and profiles with stable organization links',()=>{
 const settings=newGlobalSettings();settings.brand={name:'Field Notes',tagline:'Wild journeys',logo:{assetId:'logo',alt:'Brand',decorative:false}};settings.contact={email:'hello@example.test',phone:'+123456789',addresses:[{id:'one',label:'Office',address:'Street\nCity'}]};settings.social=[{id:'one',label:'Profile',url:'https://social.example/field'}];
 const [org,site]=publishedOrganizationSchema(settings,'https://example.test')['@graph'];assert.equal(org.name,'Field Notes');assert.equal(org.logo,'https://example.test/api/cms/published/media/logo');assert.equal(org.email,'hello@example.test');assert.equal(org.address[0].streetAddress,'Street\nCity');assert.deepEqual(org.sameAs,['https://social.example/field']);assert.equal(site.publisher['@id'],org['@id']);assert.equal(site.name,org.name);
 const empty=publishedOrganizationSchema(newGlobalSettings(),'https://example.test')['@graph'][0];assert.equal('logo' in empty,false);assert.equal('email' in empty,false);assert.equal('address' in empty,false);
 for(const origin of ['http://example.test','https://user:secret@example.test','https://example.test/path'])assert.throws(()=>publishedOrganizationSchema(settings,origin));
});
test('brand metadata reads only published fields and refuses absent or wrong-site settings',async()=>{
 assert.equal(await readBrandSettings({},async()=>assert.fail('network')),undefined);const site='00000000-0000-4000-8000-000000000001',env={CMS_BRAND_METADATA_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://db.test',CMS_SUPABASE_ANON_KEY:'anon'};
 const payload=newGlobalSettings(),row={websiteId:site,recordId:site,revisionId:site,locale:'en',payload};assert.deepEqual(await readBrandSettings(env,async()=>Response.json(row)),{brand:payload.brand,contact:payload.contact,social:payload.social});await assert.rejects(readBrandSettings(env,async()=>Response.json(null)));await assert.rejects(readBrandSettings(env,async()=>Response.json({...row,locale:'fr'})));
});
