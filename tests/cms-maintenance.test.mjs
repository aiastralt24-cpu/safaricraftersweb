import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceApplies,maintenanceResponse,readMaintenanceMessage} from '../lib/cms/maintenance.ts';
import {newGlobalSettings} from '../lib/cms/global-settings.ts';
const message={enabled:true,title:'We are updating the website',body:'Please check back shortly.',button:{label:'Contact team',href:'https://example.test/contact?a=1&b=2',newWindow:true}};
test('maintenance covers visitor reads while preserving admin, API and asset access',()=>{
 for(const path of ['/','/journeys/forest','/sitemap.xml','/cms-other','/unknown.html'])assert.equal(maintenanceApplies(path,'GET'),true,path);
 for(const path of ['/cms','/cms/settings','/api/cms/editor','/api/webhooks','/_next/image','/studio','/admin','/portal','/preview/token','/assets/image.jpg','/fonts/font.woff2','/robots.txt','/favicon.ico'])assert.equal(maintenanceApplies(path,'GET'),false,path);
 assert.equal(maintenanceApplies('/','HEAD'),true);assert.equal(maintenanceApplies('/','POST'),false);
});
test('maintenance HTML escapes content, enforces safe links and sends temporary-unavailability headers',async()=>{
 const response=maintenanceResponse({...message,title:'<script>bad</script>',body:'A & B < C'}),html=await response.text();
 assert.equal(response.status,503);assert.equal(response.headers.get('retry-after'),'300');assert.equal(response.headers.get('cache-control'),'no-store');assert.match(response.headers.get('content-security-policy'),/default-src 'none'/);assert.ok(html.includes('&lt;script&gt;bad&lt;/script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('a=1&amp;b=2'));assert.ok(html.includes('noopener noreferrer'));
 assert.equal(await maintenanceResponse(message,'HEAD').text(),'');assert.throws(()=>maintenanceResponse({...message,button:{...message.button,href:'javascript:alert(1)'}}));assert.throws(()=>maintenanceResponse({...message,enabled:false}));
});
test('maintenance uses only enabled published settings and fails open on unavailable backend',async()=>{
 const site='00000000-0000-4000-8000-000000000001',env={CMS_MAINTENANCE_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://db.test',CMS_SUPABASE_ANON_KEY:'anon'};
 assert.equal(await readMaintenanceMessage({},async()=>assert.fail('network')),undefined);
 const payload=newGlobalSettings();payload.errors.maintenance=message;const row={websiteId:site,recordId:site,revisionId:site,locale:'en',payload};
 assert.deepEqual(await readMaintenanceMessage(env,async()=>Response.json(row)),message);
 for(const value of [null,{...row,locale:'fr'}])assert.equal(await readMaintenanceMessage(env,async()=>Response.json(value)),undefined);
 assert.equal(await readMaintenanceMessage(env,async()=>{throw Error('offline');}),undefined);
 payload.errors.maintenance.enabled=false;assert.equal(await readMaintenanceMessage(env,async()=>Response.json(row)),undefined);
});
